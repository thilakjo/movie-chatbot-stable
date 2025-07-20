// app/api/recommend/route.ts (3-Tier Fallback System)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const FALLBACK_POSTER = "/fallback-poster.svg";

// Initialize AI services
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Curated fallback movies for different genres
const FALLBACK_MOVIES = {
  action: [
    "Mad Max: Fury Road",
    "John Wick",
    "The Dark Knight",
    "Mission: Impossible - Fallout",
    "Die Hard",
  ],
  drama: [
    "The Shawshank Redemption",
    "Forrest Gump",
    "The Green Mile",
    "Schindler's List",
    "12 Angry Men",
  ],
  comedy: [
    "The Grand Budapest Hotel",
    "Superbad",
    "Shaun of the Dead",
    "The Big Lebowski",
    "Groundhog Day",
  ],
  thriller: [
    "Se7en",
    "The Silence of the Lambs",
    "Gone Girl",
    "Zodiac",
    "Prisoners",
  ],
  sciFi: [
    "Blade Runner 2049",
    "Arrival",
    "Ex Machina",
    "Interstellar",
    "The Martian",
  ],
  horror: ["Get Out", "Hereditary", "The Witch", "A Quiet Place", "It Follows"],
  romance: [
    "La La Land",
    "The Notebook",
    "500 Days of Summer",
    "Eternal Sunshine of the Spotless Mind",
    "Before Sunrise",
  ],
  adventure: [
    "Indiana Jones and the Raiders of the Lost Ark",
    "Jurassic Park",
    "The Mummy",
    "National Treasure",
    "The Goonies",
  ],
  default: [
    "The Shawshank Redemption",
    "The Godfather",
    "Pulp Fiction",
    "Fight Club",
    "Inception",
  ],
};

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

// Get fallback recommendations based on user preferences
function getFallbackRecommendations(
  preferences: any,
  excludeTitles: Set<string>
) {
  const genre = preferences.favoriteGenre?.toLowerCase() || "default";
  let movieList =
    FALLBACK_MOVIES[genre as keyof typeof FALLBACK_MOVIES] ||
    FALLBACK_MOVIES.default;

  // Filter out movies the user already has
  movieList = movieList.filter((movie) => !excludeTitles.has(movie));

  // If we don't have enough movies, add from other genres
  if (movieList.length < 5) {
    const allMovies = Object.values(FALLBACK_MOVIES).flat();
    const additionalMovies = allMovies.filter(
      (movie) => !excludeTitles.has(movie) && !movieList.includes(movie)
    );
    movieList = [...movieList, ...additionalMovies].slice(0, 5);
  }

  return movieList.map((title) => ({ title }));
}

// Try OpenAI GPT-4 for recommendations
async function tryOpenAIRecommendations(
  prompt: string
): Promise<{ title: string }[]> {
  if (!openai) {
    throw new Error("OpenAI not available");
  }

  try {
    console.log("Attempting OpenAI GPT-4 call...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            'You are a movie expert. Return ONLY a valid JSON array of objects with \'title\' key. Example: [{"title": "The Shawshank Redemption"}]',
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "";
    console.log("OpenAI response:", response.substring(0, 200) + "...");

    // Try to parse JSON response
    const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error("No valid JSON array found in OpenAI response");
    }

    let recommendations = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error("OpenAI returned empty or invalid array");
    }

    // Ensure we have exactly 5 recommendations
    if (recommendations.length > 5) {
      recommendations = recommendations.slice(0, 5);
    }

    console.log("Successfully parsed OpenAI recommendations:", recommendations);
    return recommendations;
  } catch (error) {
    console.error("OpenAI recommendation failed:", error);
    throw error;
  }
}

export async function POST() {
  try {
    console.log("=== RECOMMENDATION API START (3-Tier Fallback) ===");

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      console.log("No user session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User ID:", userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { movies: true },
    });
    if (!user) {
      console.log("User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User found:", {
      id: user.id,
      moviesCount: user.movies.length,
      hasPreferences: !!user.preferences,
      hasRatings: !!user.movieRatings,
    });

    // Always get user's existing movies with details first
    console.log("Fetching user's existing movies with details...");
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

    console.log(
      "Successfully fetched user movies:",
      successfulUserMovies.length
    );

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

    console.log("Built prompt length:", prompt.length);

    let recommendations: { title: string }[] = [];
    let rawResponse = "";

    // TIER 1: Try Gemini AI
    if (genAI) {
      try {
        console.log("TIER 1: Attempting Gemini AI call...");

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Add timeout for Gemini call
        const geminiController = new AbortController();
        const geminiTimeout = setTimeout(() => geminiController.abort(), 15000);

        console.log("Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
        clearTimeout(geminiTimeout);

        rawResponse = result.response.text();
        console.log("Gemini raw response length:", rawResponse.length);
        console.log(
          "Gemini raw response preview:",
          rawResponse.substring(0, 200) + "..."
        );

        const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!jsonMatch) {
          console.error("No valid JSON array found in Gemini response");
          throw new Error("No valid JSON array found in the AI response.");
        }

        const geminiRecs = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(geminiRecs) || geminiRecs.length === 0) {
          console.error("Gemini returned empty or invalid array");
          throw new Error("AI returned empty or invalid data.");
        }

        // Ensure we have exactly 5 recommendations
        if (geminiRecs.length > 5) {
          recommendations = geminiRecs.slice(0, 5);
        } else {
          recommendations = geminiRecs;
        }

        console.log(
          "✅ TIER 1 SUCCESS: Gemini recommendations:",
          recommendations
        );
      } catch (e: any) {
        console.error("❌ TIER 1 FAILED: Gemini AI error");
        console.error("Error:", e.message);

        // Check if it's a quota error
        if (
          e.message &&
          (e.message.includes("quota") || e.message.includes("429"))
        ) {
          console.log("🔄 Quota exceeded - trying TIER 2 (OpenAI)...");
        } else {
          console.log("🔄 Gemini failed - trying TIER 2 (OpenAI)...");
        }
      }
    }

    // TIER 2: Try OpenAI GPT-4 if Gemini failed
    if (recommendations.length === 0 && openai) {
      try {
        console.log("TIER 2: Attempting OpenAI GPT-4 call...");
        recommendations = await tryOpenAIRecommendations(prompt);
        console.log(
          "✅ TIER 2 SUCCESS: OpenAI recommendations:",
          recommendations
        );
      } catch (e: any) {
        console.error("❌ TIER 2 FAILED: OpenAI error");
        console.error("Error:", e.message);
        console.log("🔄 OpenAI failed - using TIER 3 (Curated fallbacks)...");
      }
    }

    // TIER 3: Use curated fallback movies if both AI services failed
    if (recommendations.length === 0) {
      console.log("TIER 3: Using curated fallback recommendations");
      recommendations = getFallbackRecommendations(preferences, excludeTitles);
      console.log(
        "✅ TIER 3 SUCCESS: Fallback recommendations:",
        recommendations
      );
    }

    // Fetch movie details with better error handling
    console.log("Fetching movie details for recommendations...");
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
    console.log("=== RECOMMENDATION API END ===");

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
