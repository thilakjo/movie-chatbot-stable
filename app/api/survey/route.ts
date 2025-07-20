// app/api/survey/route.ts (Improved Version)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const FALLBACK_MOVIES = [
  "Inception",
  "The Dark Knight",
  "Pulp Fiction",
  "Forrest Gump",
  "The Matrix",
  "Interstellar",
  "Parasite",
  "Gladiator",
  "The Departed",
  "Whiplash",
];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preferences = await req.json();
    let dynamicMovies: string[] = [];

    try {
      // Create a more detailed prompt for better movie selection
      const prompt = `Based on a user's preferences:
- Favorite Genre: "${preferences.favoriteGenre}"
- Favorite Director: "${preferences.favoriteDirector}"
- Current Mood: "${preferences.mood}"

Generate a list of 10 well-known movies that would appeal to this user. Consider:
1. Movies in their favorite genre
2. Movies by their favorite director or similar directors
3. Movies that match their current mood
4. A mix of classic and modern films
5. Movies that are critically acclaimed and popular

Return ONLY a valid JSON array of movie titles as strings. Example: ["Inception", "The Matrix", "Blade Runner 2049"]`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Clean the response and parse JSON
      const cleanedText = text.replace(/```json|```/g, "").trim();
      dynamicMovies = JSON.parse(cleanedText);

      if (!Array.isArray(dynamicMovies) || dynamicMovies.length === 0) {
        throw new Error("Gemini did not return a valid movie list.");
      }

      // Ensure we have exactly 10 movies
      if (dynamicMovies.length > 10) {
        dynamicMovies = dynamicMovies.slice(0, 10);
      } else if (dynamicMovies.length < 10) {
        // Add some fallback movies if we don't have enough
        const remaining = 10 - dynamicMovies.length;
        const fallbackToAdd = FALLBACK_MOVIES.slice(0, remaining);
        dynamicMovies = [...dynamicMovies, ...fallbackToAdd];
      }

      console.log("Generated dynamic movies:", dynamicMovies);
    } catch (e) {
      console.error(
        "Gemini call for dynamic movie list failed, using fallback. Error:",
        e
      );
      dynamicMovies = FALLBACK_MOVIES;
    }

    // Save preferences and dynamic movies
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...preferences,
          dynamicMoviesToRate: dynamicMovies,
        },
        onboardingStep: "NEEDS_MOVIE_RATINGS",
      },
    });

    return NextResponse.json({
      success: true,
      dynamicMovies: dynamicMovies,
    });
  } catch (error) {
    console.error("Error in survey API:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
