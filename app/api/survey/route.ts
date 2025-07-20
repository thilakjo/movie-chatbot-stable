// app/api/survey/route.ts (Corrected and Intelligent)

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

    // --- NEW: Call Gemini to get a dynamic list of movies ---
    try {
      const prompt = `Based on a user's preferences for genre "${preferences.favoriteGenre}", director "${preferences.favoriteDirector}", and mood "${preferences.mood}", list 10 well-known movies that are highly relevant to their taste. The director's origin might hint at preferred movie languages. Return ONLY a valid JSON array of strings. Example: ["Inception", "The Matrix", "Blade Runner 2049"]`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleanedText = text.replace(/```json|```/g, "").trim();
      dynamicMovies = JSON.parse(cleanedText);

      if (!Array.isArray(dynamicMovies) || dynamicMovies.length === 0) {
        throw new Error("Gemini did not return a valid movie list.");
      }
    } catch (e) {
      console.error(
        "Gemini call for dynamic movie list failed, using fallback. Error:",
        e
      );
      dynamicMovies = FALLBACK_MOVIES;
    }
    // --- END NEW ---

    // Save the user's text preferences AND the dynamic list for the next step
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in survey API:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
