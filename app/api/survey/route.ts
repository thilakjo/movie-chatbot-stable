// app/api/survey/route.ts (3-Tier Fallback System)

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

// Curated fallback movies for survey
const SURVEY_FALLBACK_MOVIES = [
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
];

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
        console.log("🔄 OpenAI failed - using TIER 3 (Curated fallbacks)...");
      }
    }

    // TIER 3: Use curated fallback movies if both AI services failed
    if (movies.length === 0) {
      console.log("TIER 3: Using curated fallback movies for survey");
      movies = SURVEY_FALLBACK_MOVIES;
      console.log("✅ TIER 3 SUCCESS: Fallback survey movies:", movies);
    }

    // Ensure we have exactly 10 movies
    if (movies.length > 10) {
      movies = movies.slice(0, 10);
    } else if (movies.length < 10) {
      // Add more fallback movies if needed
      const additionalMovies = [
        "The Green Mile",
        "Schindler's List",
        "12 Angry Men",
        "The Departed",
        "The Prestige",
      ];
      movies = [...movies, ...additionalMovies].slice(0, 10);
    }

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
