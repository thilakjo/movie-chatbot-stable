// app/api/recommend/route.ts (Corrected)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correct import
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const FALLBACK_POSTER = "/fallback-poster.png";

// (Keep the fetchPosterTMDb and other helper functions as they are)
async function fetchPosterTMDb(
  title: string,
  TMDB_API_KEY: string
): Promise<string | null> {
  if (!TMDB_API_KEY) return null;
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

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferences: true,
      movieRatings: true,
      movies: true,
    },
  });

  interface UserMovie {
    movieTitle: string;
    [key: string]: any;
  }

  interface User {
    preferences?: Record<string, any>;
    movieRatings?: Record<string, number>;
    movies?: UserMovie[];
  }

  const excludeTitles: Set<string> = new Set([
    ...(user?.movieRatings ? Object.keys(user.movieRatings) : []),
    ...(user?.movies?.map((m: UserMovie) => m.movieTitle) || []),
  ]);

  const prompt = `You are a movie expert AI. The user's preferences are: ${JSON.stringify(
    user?.preferences || {}
  )}. The user has already rated or watched these movies: ${Array.from(
    excludeTitles
  ).join(
    ", "
  )}. Recommend 5 new movies (not in the exclusion list) that match the user's taste. For each, return a JSON object with 'title'. Return a JSON array.`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let recommendations: { title: string }[] = [];
  try {
    const cleanedText = text.replace(/```json|```/g, "").trim();
    recommendations = JSON.parse(cleanedText);
  } catch {}

  const filtered = recommendations.filter(
    (rec) => rec.title && !excludeTitles.has(rec.title.trim())
  );

  const TMDB_API_KEY = process.env.TMDB_API_KEY!;
  const withPosters = await Promise.all(
    filtered.slice(0, 5).map(async (rec) => ({
      title: rec.title,
      posterUrl:
        (await fetchPosterTMDb(rec.title, TMDB_API_KEY)) || FALLBACK_POSTER,
    }))
  );

  interface UserMovieWithPoster extends UserMovie {
    posterUrl: string;
  }

  const userMoviesWithPosters: UserMovieWithPoster[] = await Promise.all(
    (user?.movies || []).map(
      async (m: UserMovie): Promise<UserMovieWithPoster> => ({
        ...m,
        posterUrl:
          (await fetchPosterTMDb(m.movieTitle, TMDB_API_KEY)) ||
          FALLBACK_POSTER,
      })
    )
  );

  return NextResponse.json({
    recommendations: withPosters,
    userMovies: userMoviesWithPosters,
  });
}
