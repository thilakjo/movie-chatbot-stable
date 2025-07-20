// app/api/survey/route.ts (Corrected with Robust Error Handling)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// A default list of movies to use if the AI fails
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

    // --- NEW: Robust try/catch block for the Gemini API call ---
    try {
      const prompt = `Based on these user preferences: ${JSON.stringify(
        preferences
      )}, list 10 well-known movies that are highly relevant to their taste and the director (his movies language) focus mainly on the language of the director (if available). IMPORTANT: Return ONLY a JSON array of strings. Example: ["Inception", "The Matrix", "Blade Runner 2049"]`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleanedText = text.replace(/```json|```/g, "").trim();
      dynamicMovies = JSON.parse(cleanedText);

      // Ensure we have exactly 10 movies
      if (dynamicMovies.length !== 10) {
        throw new Error("Gemini did not return 10 movies.");
      }
    } catch (e) {
      console.error("Gemini call failed, using fallback list. Error:", e);
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
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
