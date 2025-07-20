// app/api/survey/route.ts (3-Tier Fallback System with Personalized Fallbacks)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const prisma = new PrismaClient();

// Initialize AI services
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Personalized fallback movies based on genre and preferences
const PERSONALIZED_FALLBACK_MOVIES = {
  romance: [
    "La La Land",
    "The Notebook",
    "500 Days of Summer",
    "Eternal Sunshine of the Spotless Mind",
    "Before Sunrise",
    "Crazy Rich Asians",
    "The Proposal",
    "Notting Hill",
    "When Harry Met Sally",
    "Pretty Woman",
    "Sleepless in Seattle",
    "You've Got Mail",
  ],
  action: [
    "Mad Max: Fury Road",
    "John Wick",
    "The Dark Knight",
    "Mission: Impossible - Fallout",
    "Die Hard",
    "The Matrix",
    "Gladiator",
    "Braveheart",
    "The Avengers",
    "Black Panther",
    "Wonder Woman",
    "Captain America: The Winter Soldier",
  ],
  comedy: [
    "The Grand Budapest Hotel",
    "Superbad",
    "Shaun of the Dead",
    "The Big Lebowski",
    "Groundhog Day",
    "Bridesmaids",
    "The Hangover",
    "21 Jump Street",
    "Deadpool",
    "Guardians of the Galaxy",
    "The Lego Movie",
    "Zootopia",
  ],
  drama: [
    "The Shawshank Redemption",
    "Forrest Gump",
    "The Green Mile",
    "Schindler's List",
    "12 Angry Men",
    "The Godfather",
    "Goodfellas",
    "The Departed",
    "Fight Club",
    "American Beauty",
    "The Social Network",
    "Spotlight",
  ],
  thriller: [
    "Se7en",
    "The Silence of the Lambs",
    "Gone Girl",
    "Zodiac",
    "Prisoners",
    "The Usual Suspects",
    "Memento",
    "Inception",
    "The Prestige",
    "Shutter Island",
    "Gone Baby Gone",
    "Mystic River",
  ],
  sciFi: [
    "Blade Runner 2049",
    "Arrival",
    "Ex Machina",
    "Interstellar",
    "The Martian",
    "The Matrix",
    "Inception",
    "District 9",
    "Moon",
    "Her",
    "Looper",
    "Source Code",
  ],
  horror: [
    "Get Out",
    "Hereditary",
    "The Witch",
    "A Quiet Place",
    "It Follows",
    "The Babadook",
    "The Conjuring",
    "Insidious",
    "Sinister",
    "The Descent",
    "28 Days Later",
    "The Cabin in the Woods",
  ],
  adventure: [
    "Indiana Jones and the Raiders of the Lost Ark",
    "Jurassic Park",
    "The Mummy",
    "National Treasure",
    "The Goonies",
    "The Princess Bride",
    "The NeverEnding Story",
    "Hook",
    "Jumanji",
    "The Mask of Zorro",
    "The Three Musketeers",
    "Robin Hood: Prince of Thieves",
  ],
  default: [
    "The Shawshank Redemption",
    "The Godfather",
    "Pulp Fiction",
    "Fight Club",
    "Inception",
    "The Dark Knight",
    "Forrest Gump",
    "The Matrix",
    "Goodfellas",
    "The Silence of the Lambs",
  ],
};

// Get personalized fallback movies based on user preferences
function getPersonalizedFallbackMovies(
  favoriteGenre: string,
  favoriteDirector: string,
  mood: string
): string[] {
  console.log("Getting personalized fallback movies for:", {
    favoriteGenre,
    favoriteDirector,
    mood,
  });

  // Normalize genre to match our keys
  const genre = favoriteGenre.toLowerCase();
  let movieList: string[] = [];

  // Get genre-specific movies
  if (genre.includes("romance") || genre.includes("romantic")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.romance;
  } else if (genre.includes("action")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.action;
  } else if (genre.includes("comedy") || genre.includes("funny")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.comedy;
  } else if (genre.includes("drama")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.drama;
  } else if (genre.includes("thriller")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.thriller;
  } else if (genre.includes("sci") || genre.includes("science")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.sciFi;
  } else if (genre.includes("horror")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.horror;
  } else if (genre.includes("adventure")) {
    movieList = PERSONALIZED_FALLBACK_MOVIES.adventure;
  } else {
    movieList = PERSONALIZED_FALLBACK_MOVIES.default;
  }

  // If mood is funny, add some comedies
  if (
    mood.toLowerCase().includes("funny") ||
    mood.toLowerCase().includes("comedy")
  ) {
    const comedyMovies = PERSONALIZED_FALLBACK_MOVIES.comedy.filter(
      (movie) => !movieList.includes(movie)
    );
    movieList = [...movieList, ...comedyMovies].slice(0, 10);
  }

  // If director is specified, try to include some related movies
  if (favoriteDirector && favoriteDirector.toLowerCase() !== "upendra") {
    // For other directors, we could add some of their popular movies
    // For now, we'll keep the genre-based selection
  }

  console.log("Selected personalized movies:", movieList);
  return movieList.slice(0, 10);
}

// Try OpenAI GPT-4 for survey recommendations
async function tryOpenAISurveyRecommendations(
  favoriteGenre: string,
  favoriteDirector: string,
  mood: string
): Promise<string[]> {
  if (!openai) {
    throw new Error("OpenAI not available");
  }

  try {
    console.log("Attempting OpenAI GPT-4 call for survey...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            'You are a movie expert. Return ONLY a valid JSON array of movie titles as strings. Example: ["The Shawshank Redemption", "Pulp Fiction"]',
        },
        {
          role: "user",
          content: `Based on these preferences, recommend 10 movies:
          - Favorite Genre: ${favoriteGenre}
          - Favorite Director: ${favoriteDirector}
          - Mood: ${mood}
          
          Return ONLY a valid JSON array of movie titles.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "";
    console.log("OpenAI survey response:", response.substring(0, 200) + "...");

    // Try to parse JSON response
    const jsonMatch = response.match(/\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/);
    if (!jsonMatch) {
      throw new Error("No valid JSON array found in OpenAI response");
    }

    const movies = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(movies) || movies.length === 0) {
      throw new Error("OpenAI returned empty or invalid array");
    }

    console.log("Successfully parsed OpenAI survey movies:", movies);
    return movies;
  } catch (error) {
    console.error("OpenAI survey recommendation failed:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { favoriteGenre, favoriteDirector, mood } = await request.json();

    console.log("Survey API called with preferences:", {
      favoriteGenre,
      favoriteDirector,
      mood,
    });

    // Generate personalized movie list using 3-tier system
    let movies: string[] = [];

    // TIER 1: Try Gemini AI
    if (genAI) {
      try {
        console.log("TIER 1: Attempting Gemini AI call for survey...");

        const prompt = `Based on these preferences, recommend 10 movies:
        - Favorite Genre: ${favoriteGenre}
        - Favorite Director: ${favoriteDirector}
        - Mood: ${mood}
        
        Return ONLY a valid JSON array of movie titles. Example: ["The Shawshank Redemption", "Pulp Fiction"]`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Try to parse JSON response
        const jsonMatch = response.match(
          /\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/
        );
        if (jsonMatch) {
          movies = JSON.parse(jsonMatch[0]);
          console.log("✅ TIER 1 SUCCESS: Gemini survey movies:", movies);
        } else {
          throw new Error("Invalid JSON response from Gemini");
        }
      } catch (error: any) {
        console.error("❌ TIER 1 FAILED: Gemini AI error for survey");
        console.error("Error:", error.message);

        // Check if it's a quota error
        if (
          error.message &&
          (error.message.includes("quota") || error.message.includes("429"))
        ) {
          console.log("🔄 Quota exceeded - trying TIER 2 (OpenAI)...");
        } else {
          console.log("🔄 Gemini failed - trying TIER 2 (OpenAI)...");
        }
      }
    }

    // TIER 2: Try OpenAI GPT-4 if Gemini failed
    if (movies.length === 0 && openai) {
      try {
        console.log("TIER 2: Attempting OpenAI GPT-4 call for survey...");
        movies = await tryOpenAISurveyRecommendations(
          favoriteGenre,
          favoriteDirector,
          mood
        );
        console.log("✅ TIER 2 SUCCESS: OpenAI survey movies:", movies);
      } catch (error: any) {
        console.error("❌ TIER 2 FAILED: OpenAI error for survey");
        console.error("Error:", error.message);
        console.log(
          "🔄 OpenAI failed - using TIER 3 (Personalized fallbacks)..."
        );
      }
    }

    // TIER 3: Use personalized fallback movies if both AI services failed
    if (movies.length === 0) {
      console.log("TIER 3: Using personalized fallback movies for survey");
      movies = getPersonalizedFallbackMovies(
        favoriteGenre,
        favoriteDirector,
        mood
      );
      console.log("✅ TIER 3 SUCCESS: Personalized fallback movies:", movies);
    }

    // Ensure we have exactly 10 movies
    if (movies.length > 10) {
      movies = movies.slice(0, 10);
    } else if (movies.length < 10) {
      // Add more personalized movies if needed
      const additionalMovies = getPersonalizedFallbackMovies(
        favoriteGenre,
        favoriteDirector,
        mood
      );
      movies = [...movies, ...additionalMovies].slice(0, 10);
    }

    console.log("Final movies for user:", movies);

    // Update user preferences and set onboarding step to NEEDS_MOVIE_RATINGS
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          favoriteGenre,
          favoriteDirector,
          mood,
          dynamicMoviesToRate: movies, // Store the dynamic movies for rating
        },
        onboardingStep: "NEEDS_MOVIE_RATINGS", // Set to movie rating step
      },
    });

    return NextResponse.json({ success: true, movies });
  } catch (error) {
    console.error("Survey API error:", error);
    return NextResponse.json(
      { error: "Failed to process survey" },
      { status: 500 }
    );
  }
}
