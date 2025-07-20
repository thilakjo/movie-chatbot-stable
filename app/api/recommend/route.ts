// app/api/recommend/route.ts (Fixed and Improved Version)

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
      signal: AbortSignal.timeout(10000), // Increased timeout
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
      fetch(detailsUrl, { signal: AbortSignal.timeout(10000) }),
      fetch(creditsUrl, { signal: AbortSignal.timeout(10000) }),
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
      title,
    };
  }
}

export async function POST() {
  try {
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
      Object.keys(user.movieRatings).forEach((title) =>
        excludeTitles.add(title)
      );
    }

    // Build a more comprehensive prompt using user preferences
    const preferences = (user.preferences as any) || {};
    const movieRatings = (user.movieRatings as any) || {};

    let prompt = `You are a movie expert. Recommend 5 new movies that perfectly match the user's taste. `;

    if (preferences.favoriteGenre) {
      prompt += `The user's favorite genre is: ${preferences.favoriteGenre}. `;
    }

    if (preferences.favoriteDirector) {
      prompt += `Their favorite director is: ${preferences.favoriteDirector}. `;
    }

    if (preferences.mood) {
      prompt += `They want to watch: ${preferences.mood}. `;
    }

    if (preferences.casualAnswers && preferences.casualAnswers.length > 0) {
      prompt += `Additional preferences: ${preferences.casualAnswers.join(
        ", "
      )}. `;
    }

    if (Object.keys(movieRatings).length > 0) {
      const likedMovies = Object.entries(movieRatings)
        .filter(([_, rating]) => rating === "Good")
        .map(([title, _]) => title);
      if (likedMovies.length > 0) {
        prompt += `They liked these movies: ${likedMovies.join(", ")}. `;
      }
    }

    prompt += `Exclude these movies they already have: ${Array.from(
      excludeTitles
    ).join(", ")}. `;
    prompt += `Return ONLY a valid JSON array of objects, where each object has a "title" key. Example: [{"title": "Blade Runner 2049"}]`;

    let recommendations: { title: string }[] = [];
    let rawResponse = "";

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      rawResponse = result.response.text();

      const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in the AI response.");
      }

      recommendations = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        throw new Error("AI returned empty or invalid data.");
      }
    } catch (e) {
      console.error("--- GEMINI RECOMMENDATION ERROR ---");
      console.error("Failed to get or parse recommendations from Gemini.");
      console.error("Raw AI Response:", rawResponse);
      console.error("Parsing Error:", e);
      console.error("User preferences:", preferences);
      console.error("---------------------------------");
      return NextResponse.json(
        {
          error: "AI failed to generate recommendations. Please try again.",
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
  } catch (error) {
    console.error("Recommendation API error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
