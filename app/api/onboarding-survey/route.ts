import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const prisma = new PrismaClient();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { favoriteGenre, favoriteDirector, mood, casualAnswers } =
      await req.json();

    // Build prompt for Gemini
    let prompt = `Based on these preferences, recommend 10 movies:
    - Favorite Genre: ${favoriteGenre}
    - Favorite Director: ${favoriteDirector}
    - Mood: ${mood}
    - Vibe check answers:
      ${
        Array.isArray(casualAnswers) && casualAnswers.length > 0
          ? casualAnswers.map((a, i) => `Q${i + 1}: ${a}`).join("\n      ")
          : "None"
      }
    Return ONLY a valid JSON array of movie titles. Example: ["The Shawshank Redemption", "Pulp Fiction"]`;

    let movies: string[] = [];
    let aiError = null;
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const jsonMatch = response.match(
          /\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/
        );
        if (jsonMatch) {
          movies = JSON.parse(jsonMatch[0]);
        } else {
          aiError = "Invalid JSON response from Gemini";
        }
      } catch (e: any) {
        aiError = e.message || "Gemini AI error";
      }
    }
    // Fallback: Try OpenAI if Gemini fails
    if (!movies.length && openai) {
      try {
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
              content: `Based on these preferences, recommend 10 movies:\n- Favorite Genre: ${favoriteGenre}\n- Favorite Director: ${favoriteDirector}\n- Mood: ${mood}\n- Vibe check answers: ${
                Array.isArray(casualAnswers) && casualAnswers.length > 0
                  ? casualAnswers.map((a, i) => `Q${i + 1}: ${a}`).join("; ")
                  : "None"
              }`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        const response = completion.choices[0]?.message?.content || "";
        const jsonMatch = response.match(
          /\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/
        );
        if (jsonMatch) {
          movies = JSON.parse(jsonMatch[0]);
        } else {
          aiError = "Invalid JSON response from OpenAI";
        }
      } catch (e: any) {
        aiError = e.message || "OpenAI error";
      }
    }
    // Fallback: use a default list if both AI fail
    if (!movies.length) {
      movies = [
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
    }

    // Save to user profile
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          favoriteGenre,
          favoriteDirector,
          mood,
          casualAnswers,
          dynamicMoviesToRate: movies,
        },
        onboardingStep: "NEEDS_MOVIE_RATINGS",
      },
    });

    return NextResponse.json({ success: true, movies, aiError });
  } catch (error) {
    console.error("Onboarding survey API error:", error);
    return NextResponse.json(
      { error: "Failed to process onboarding survey" },
      { status: 500 }
    );
  }
}
