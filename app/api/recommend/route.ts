import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// @ts-expect-error: freekeys has no types
import freekeys from "freekeys";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function getApiKeys() {
  // Try to get from env first, else use freekeys
  let OMDB_API_KEY = process.env.OMDB_API_KEY;
  let TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!OMDB_API_KEY || !TMDB_API_KEY) {
    const keys = await freekeys();
    OMDB_API_KEY = OMDB_API_KEY || keys.imdb_key;
    TMDB_API_KEY = TMDB_API_KEY || keys.tmdb_key;
  }
  return { OMDB_API_KEY, TMDB_API_KEY };
}

async function fetchPosterOMDb(
  title: string,
  OMDB_API_KEY: string
): Promise<string | null> {
  if (!OMDB_API_KEY) return null;
  const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(
    title
  )}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.Poster && data.Poster !== "N/A") return data.Poster;
  } catch {}
  return null;
}

async function fetchPosterTMDb(
  title: string,
  TMDB_API_KEY: string
): Promise<string | null> {
  if (!TMDB_API_KEY) return null;
  // Search for the movie
  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    title
  )}`;
  try {
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (
      data.results &&
      data.results.length > 0 &&
      data.results[0].poster_path
    ) {
      return `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
    }
  } catch {}
  return null;
}

// Helper to fetch poster for a movie title
async function getPosterForTitle(
  title: string,
  OMDB_API_KEY: string,
  TMDB_API_KEY: string
): Promise<string | null> {
  let posterUrl = await fetchPosterOMDb(title, OMDB_API_KEY);
  if (!posterUrl) {
    posterUrl = await fetchPosterTMDb(title, TMDB_API_KEY);
  }
  return posterUrl;
}

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id || (session?.user as any)?.sub;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gather user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferences: true,
      movieRatings: true,
      movies: true,
    },
  });

  // Build exclusion list from UserMovie (WATCHLIST or WATCHED)
  const excludeTitles = new Set([
    ...(user?.movieRatings ? Object.keys(user.movieRatings) : []),
    ...(user?.movies?.map((m) => m.movieTitle) || []),
  ]);

  // Build prompt for Gemini
  const prompt = `You are a movie expert AI. The user's preferences are: ${JSON.stringify(
    user?.preferences || {}
  )}. The user has already rated or watched these movies: ${Array.from(
    excludeTitles
  ).join(
    ", "
  )}. Recommend 10 new movies (not in the exclusion list) that match the user's taste. For each, return a JSON object with 'title'. Return a JSON array.`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  // Try to parse the JSON from Gemini's response
  let recommendations: { title: string }[] = [];
  try {
    recommendations = JSON.parse(text);
  } catch {
    const match = text.match(/\[([\s\S]*)\]/);
    if (match) {
      try {
        recommendations = JSON.parse("[" + match[1] + "]");
      } catch {}
    }
  }

  // Strictly filter out any movie already in UserMovie (WATCHLIST or WATCHED)
  const filtered = recommendations.filter(
    (rec) => rec.title && !excludeTitles.has(rec.title.trim())
  );

  // Get API keys
  const { OMDB_API_KEY, TMDB_API_KEY } = await getApiKeys();

  // Fetch poster URLs in parallel (limit to 5, fallback to TMDb if OMDb fails)
  const top5 = filtered.slice(0, 5);
  const withPosters = await Promise.all(
    top5.map(async (rec) => {
      let posterUrl = await fetchPosterOMDb(rec.title, OMDB_API_KEY || "");
      if (!posterUrl) {
        posterUrl = await fetchPosterTMDb(rec.title, TMDB_API_KEY || "");
      }
      return {
        title: rec.title,
        posterUrl,
      };
    })
  );

  // Also fetch posters for user's watchlist and watched movies
  const userMoviesWithPosters = await Promise.all(
    (user?.movies || []).map(async (m) => {
      const posterUrl = await getPosterForTitle(
        m.movieTitle,
        OMDB_API_KEY || "",
        TMDB_API_KEY || ""
      );
      return { ...m, posterUrl };
    })
  );

  return NextResponse.json({
    recommendations: withPosters,
    userMovies: userMoviesWithPosters,
  });
}
