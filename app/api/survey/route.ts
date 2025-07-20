// app/api/survey/route.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();

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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { favoriteGenre, favoriteDirector, mood } = await request.json();

    // Update user preferences
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          favoriteGenre,
          favoriteDirector,
          mood,
        },
        onboardingStep: "MOVIE_RATING",
      },
    });

    // Generate personalized movie list using Gemini AI
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    let movies: string[] = [];

    if (GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Based on these preferences, recommend 10 movies:
        - Favorite Genre: ${favoriteGenre}
        - Favorite Director: ${favoriteDirector}
        - Mood: ${mood}
        
        Return ONLY a valid JSON array of movie titles. Example: ["The Shawshank Redemption", "Pulp Fiction"]`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Try to parse JSON response
        const jsonMatch = response.match(
          /\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/
        );
        if (jsonMatch) {
          movies = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Invalid JSON response from AI");
        }
      } catch (error: any) {
        console.error("Gemini AI failed:", error);

        // Check if it's a quota error
        if (
          error.message &&
          (error.message.includes("quota") || error.message.includes("429"))
        ) {
          console.log("Quota exceeded - using fallback movies");
          movies = SURVEY_FALLBACK_MOVIES;
        } else {
          // Use fallback movies for any other error
          movies = SURVEY_FALLBACK_MOVIES;
        }
      }
    } else {
      // No API key - use fallback
      movies = SURVEY_FALLBACK_MOVIES;
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

    // Create movie entries in database
    const movieEntries = movies.map((title, index) => ({
      movieTitle: title,
      status: "WATCHLIST" as const,
      order: index,
      userId,
    }));

    await prisma.userMovie.createMany({
      data: movieEntries,
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
