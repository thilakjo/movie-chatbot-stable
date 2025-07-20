// app/api/recommend/route.ts (Final, Most Robust Version)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const FALLBACK_POSTER = "/fallback-poster.png";

async function getMovieDetails(title: string) {
  if (!TMDB_API_KEY)
    return {
      posterUrl: FALLBACK_POSTER,
      year: null,
      director: null,
      imdbRating: null,
      leadActor: null,
    };
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`;
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!searchRes.ok)
      return {
        posterUrl: FALLBACK_POSTER,
        year: null,
        director: null,
        imdbRating: null,
        leadActor: null,
      };

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0)
      return {
        posterUrl: FALLBACK_POSTER,
        year: null,
        director: null,
        imdbRating: null,
        leadActor: null,
      };

    const movie = searchData.results[0];
    const movieId = movie.id;
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`;
    const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;

    const [detailsRes, creditsRes] = await Promise.all([
      fetch(detailsUrl, { signal: AbortSignal.timeout(5000) }),
      fetch(creditsUrl, { signal: AbortSignal.timeout(5000) }),
    ]);
    const detailsData = await detailsRes.json();
    const creditsData = await creditsRes.json();

    return {
      posterUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : FALLBACK_POSTER,
      year: movie.release_date
        ? parseInt(movie.release_date.split("-")[0])
        : null,
      imdbRating: detailsData.vote_average
        ? detailsData.vote_average.toFixed(1)
        : null,
      director:
        creditsData.crew?.find((p: any) => p.job === "Director")?.name || null,
      leadActor: creditsData.cast?.[0]?.name || null,
    };
  } catch (error) {
    return {
      posterUrl: FALLBACK_POSTER,
      year: null,
      director: null,
      imdbRating: null,
      leadActor: null,
      title,
    };
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { movies: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const excludeTitles = new Set(user.movies.map((m) => m.movieTitle));
  if (user.movieRatings) {
    Object.keys(user.movieRatings).forEach((title) => excludeTitles.add(title));
  }

  const prompt = `You are a movie expert. A user has these preferences: ${JSON.stringify(
    user.preferences
  )}. They have rated these movies: ${JSON.stringify(
    user.movieRatings
  )}. They already have these movies on their lists: ${Array.from(
    excludeTitles
  ).join(
    ", "
  )}. Recommend 5 new movies they haven't seen that perfectly match their taste. Return ONLY a valid JSON array of objects, where each object has a "title" key. Example: [{"title": "Blade Runner 2049"}]`;

  let recommendations: { title: string }[] = [];
  let rawResponse = ""; // Variable to store the raw AI response

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    rawResponse = result.response.text(); // Store the raw text

    // A more robust way to find and parse the JSON block
    const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error("No valid JSON array found in the AI response.");
    }

    recommendations = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error("AI returned empty or invalid data.");
    }
  } catch (e) {
    // This new log is crucial for debugging
    console.error("--- GEMINI RECOMMENDATION ERROR ---");
    console.error("Failed to get or parse recommendations from Gemini.");
    console.error("Raw AI Response:", rawResponse); // Log the exact response
    console.error("Parsing Error:", e);
    console.error("---------------------------------");
    return NextResponse.json(
      {
        error:
          "Could not get recommendations from the AI. Please check the logs.",
      },
      { status: 500 }
    );
  }

  const recsWithDetails = await Promise.all(
    recommendations.map((rec) =>
      getMovieDetails(rec.title).then((details) => ({ ...rec, ...details }))
    )
  );
  const userMoviesWithDetails = await Promise.all(
    user.movies.map((movie) =>
      getMovieDetails(movie.movieTitle).then((details) => ({
        ...movie,
        ...details,
      }))
    )
  );

  return NextResponse.json({
    recommendations: recsWithDetails,
    userMovies: userMoviesWithDetails,
  });
}
