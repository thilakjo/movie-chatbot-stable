// app/api/recommend/route.ts

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
    const searchRes = await fetch(searchUrl);
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
      fetch(detailsUrl),
      fetch(creditsUrl),
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
    console.error(`TMDb fetch failed for "${title}":`, error);
    return {
      posterUrl: FALLBACK_POSTER,
      year: null,
      director: null,
      imdbRating: null,
      leadActor: null,
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

  interface UserMovie {
    id: string;
    userId: string;
    movieTitle: string;
    // Add other fields from your Prisma schema if needed
  }

  const excludeTitles: Set<string> = new Set(
    (user.movies as UserMovie[]).map((m: UserMovie) => m.movieTitle)
  );
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
  )}. Recommend 5 new movies they haven't seen that perfectly match their taste. Return ONLY a JSON array of objects, with a "title" key. Example: [{"title": "Blade Runner 2049"}]`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  let recommendations: { title: string }[] = [];
  try {
    const cleanedText = result.response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    recommendations = JSON.parse(cleanedText);
  } catch (e) {
    console.error(
      "Failed to parse Gemini recommendations:",
      result.response.text()
    );
  }

  const recsWithDetails = await Promise.all(
    recommendations.map((rec) =>
      getMovieDetails(rec.title).then((details) => ({ ...rec, ...details }))
    )
  );
  interface MovieDetails {
    posterUrl: string;
    year: number | null;
    director: string | null;
    imdbRating: string | null;
    leadActor: string | null;
  }

  interface Recommendation {
    title: string;
  }

  interface UserMovie {
    id: string;
    userId: string;
    movieTitle: string;
    // Add other fields from your Prisma schema if needed
  }

  type UserMovieWithDetails = UserMovie & MovieDetails;

  const userMoviesWithDetails: UserMovieWithDetails[] = await Promise.all(
    user.movies.map((movie: UserMovie) =>
      getMovieDetails(movie.movieTitle).then((details: MovieDetails) => ({
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
