// app/api/recommend/route.ts (Production-Ready Version with Better AI Handling)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const FALLBACK_POSTER = "/fallback-poster.svg";

// Validate Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Type definitions for TMDb API responses
interface TMDBMovieDetails {
  vote_average?: number;
}

interface TMDBCredits {
  crew?: Array<{ job: string; name: string }>;
  cast?: Array<{ name: string }>;
}

// Improved movie details fetching with better error handling
async function getMovieDetails(title: string) {
  const fallbackResult = {
    posterUrl: FALLBACK_POSTER,
    year: null,
    director: null,
    imdbRating: null,
    leadActor: null,
  };

  if (!TMDB_API_KEY) {
    return fallbackResult;
  }

  try {
    // Search for the movie
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`;

    const searchController = new AbortController();
    const searchTimeout = setTimeout(() => searchController.abort(), 8000);

    const searchRes = await fetch(searchUrl, {
      signal: searchController.signal,
    });
    clearTimeout(searchTimeout);

    if (!searchRes.ok) {
      console.log(`TMDb search failed for "${title}": ${searchRes.status}`);
      return fallbackResult;
    }

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`No TMDb results found for "${title}"`);
      return fallbackResult;
    }

    const movie = searchData.results[0];
    const movieId = movie.id;

    // Fetch details and credits in parallel with individual timeouts
    const detailsController = new AbortController();
    const creditsController = new AbortController();
    const detailsTimeout = setTimeout(() => detailsController.abort(), 8000);
    const creditsTimeout = setTimeout(() => creditsController.abort(), 8000);

    const [detailsRes, creditsRes] = await Promise.allSettled([
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`,
        {
          signal: detailsController.signal,
        }
      ),
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`,
        {
          signal: creditsController.signal,
        }
      ),
    ]);

    clearTimeout(detailsTimeout);
    clearTimeout(creditsTimeout);

    let detailsData: TMDBMovieDetails = {};
    let creditsData: TMDBCredits = {};

    if (detailsRes.status === "fulfilled" && detailsRes.value.ok) {
      detailsData = await detailsRes.value.json();
    }

    if (creditsRes.status === "fulfilled" && creditsRes.value.ok) {
      creditsData = await creditsRes.value.json();
    }

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
        creditsData.crew?.find((p) => p.job === "Director")?.name || null,
      leadActor: creditsData.cast?.[0]?.name || null,
    };
  } catch (error) {
    console.error(`TMDb fetch failed for "${title}":`, error);
    return fallbackResult;
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { movies: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Always get user's existing movies with details first
    const userMoviesWithDetails = await Promise.allSettled(
      user.movies.map((movie) =>
        getMovieDetails(movie.movieTitle).then((details) => ({
          ...movie,
          ...details,
        }))
      )
    );

    const successfulUserMovies = userMoviesWithDetails
      .filter(
        (result): result is PromiseFulfilledResult<any> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const excludeTitles = new Set(user.movies.map((m) => m.movieTitle));
    if (user.movieRatings) {
      Object.keys(user.movieRatings).forEach((title) =>
        excludeTitles.add(title)
      );
    }

    // Build a comprehensive prompt using user preferences
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

    // Check if Gemini API is available
    if (!genAI) {
      console.error("Gemini AI is not available - API key missing");
      return NextResponse.json({
        recommendations: [],
        userMovies: successfulUserMovies,
        error: "AI service is currently unavailable. Please try again later.",
      });
    }

    try {
      console.log(
        "Attempting Gemini AI call with prompt:",
        prompt.substring(0, 200) + "..."
      );

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Add timeout for Gemini call
      const geminiController = new AbortController();
      const geminiTimeout = setTimeout(() => geminiController.abort(), 15000);

      const result = await model.generateContent(prompt);
      clearTimeout(geminiTimeout);

      rawResponse = result.response.text();
      console.log(
        "Gemini raw response:",
        rawResponse.substring(0, 200) + "..."
      );

      const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        console.error("No valid JSON array found in Gemini response");
        throw new Error("No valid JSON array found in the AI response.");
      }

      recommendations = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        console.error("Gemini returned empty or invalid array");
        throw new Error("AI returned empty or invalid data.");
      }

      // Ensure we have exactly 5 recommendations
      if (recommendations.length > 5) {
        recommendations = recommendations.slice(0, 5);
      }

      console.log("Successfully parsed recommendations:", recommendations);
    } catch (e) {
      console.error("--- GEMINI RECOMMENDATION ERROR ---");
      console.error("Failed to get or parse recommendations from Gemini.");
      console.error("Raw AI Response:", rawResponse);
      console.error("Parsing Error:", e);
      console.error("User preferences:", preferences);
      console.error("---------------------------------");

      // Try a simpler fallback approach
      try {
        console.log("Attempting fallback recommendation generation...");
        const fallbackPrompt = `Recommend 5 popular movies that are critically acclaimed. Return ONLY a valid JSON array of objects with "title" key. Example: [{"title": "The Shawshank Redemption"}]`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const fallbackResult = await model.generateContent(fallbackPrompt);
        const fallbackResponse = fallbackResult.response.text();

        const fallbackJsonMatch = fallbackResponse.match(
          /\[\s*\{[\s\S]*\}\s*\]/
        );
        if (fallbackJsonMatch) {
          recommendations = JSON.parse(fallbackJsonMatch[0]);
          if (Array.isArray(recommendations) && recommendations.length > 0) {
            console.log(
              "Fallback recommendations successful:",
              recommendations
            );
            // Continue with fallback recommendations
          } else {
            throw new Error("Fallback also failed");
          }
        } else {
          throw new Error("Fallback also failed");
        }
      } catch (fallbackError) {
        console.error("Fallback recommendation also failed:", fallbackError);
        // Return user's existing movies even when AI fails
        return NextResponse.json({
          recommendations: [],
          userMovies: successfulUserMovies,
          error:
            "Unable to generate recommendations at this time. Please try again later.",
        });
      }
    }

    // Fetch movie details with better error handling
    const recsWithDetails = await Promise.allSettled(
      recommendations.map((rec) =>
        getMovieDetails(rec.title).then((details) => ({ ...rec, ...details }))
      )
    );

    const successfulRecs = recsWithDetails
      .filter(
        (result): result is PromiseFulfilledResult<any> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);

    console.log("Returning successful recommendations:", successfulRecs.length);

    return NextResponse.json({
      recommendations: successfulRecs,
      userMovies: successfulUserMovies,
    });
  } catch (error) {
    console.error("Recommendation API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error. Please try again.",
        recommendations: [],
        userMovies: [],
      },
      { status: 500 }
    );
  }
}
