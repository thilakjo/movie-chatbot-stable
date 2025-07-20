// app/api/survey/route.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preferences = await req.json();

    // Call Gemini to get a dynamic list of movies
    const prompt = `Based on these user preferences: ${JSON.stringify(
      preferences
    )}, list 10 well-known movies that are highly relevant to their taste. IMPORTANT: Return ONLY a JSON array of strings. Example: ["Inception", "The Matrix", "Blade Runner 2049"]`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let dynamicMovies: string[] = [];
    try {
      const cleanedText = text.replace(/```json|```/g, "").trim();
      dynamicMovies = JSON.parse(cleanedText);
    } catch (e) {
      console.error(
        "Failed to parse Gemini response for dynamic movies:",
        text
      );
      // Fallback to a default list if Gemini fails
      dynamicMovies = [
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
    }

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
