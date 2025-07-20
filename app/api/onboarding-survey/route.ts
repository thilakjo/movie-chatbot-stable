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
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

async function tryHuggingFace(prompt: string): Promise<string[]> {
  if (!HUGGINGFACE_API_KEY) return [];
  const response = await fetch(
    "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 200 },
      }),
    }
  );
  const data = await response.json();
  // Hugging Face returns [{ generated_text: ... }]
  const text = Array.isArray(data)
    ? data[0]?.generated_text
    : data?.generated_text;
  if (!text) return [];
  const match = text.match(/\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/);
  return match ? JSON.parse(match[0]) : [];
}

async function tryCohere(prompt: string): Promise<string[]> {
  if (!COHERE_API_KEY) return [];
  const response = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COHERE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "command-r-plus",
      message: prompt,
      max_tokens: 200,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  const text = data?.text || data?.generations?.[0]?.text;
  if (!text) return [];
  const match = text.match(/\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/);
  return match ? JSON.parse(match[0]) : [];
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { favoriteGenre, favoriteDirector, mood, casualAnswers } =
      await req.json();

    // Build prompt for all AIs
    let prompt = `Based on these preferences, recommend 10 movies:\n- Favorite Genre: ${favoriteGenre}\n- Favorite Director: ${favoriteDirector}\n- Mood: ${mood}\n- Vibe check answers: ${
      Array.isArray(casualAnswers) && casualAnswers.length > 0
        ? casualAnswers.map((a, i) => `Q${i + 1}: ${a}`).join("; ")
        : "None"
    }\nReturn ONLY a valid JSON array of movie titles. Example: [\"The Shawshank Redemption\", \"Pulp Fiction\"]`;

    let movies: string[] = [];
    let aiError = null;

    // 1. Gemini
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
    // 2. OpenAI
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
              content: prompt,
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
    // 3. Hugging Face
    if (!movies.length && HUGGINGFACE_API_KEY) {
      try {
        movies = await tryHuggingFace(prompt);
      } catch (e: any) {
        aiError = e.message || "Hugging Face error";
      }
    }
    // 4. Cohere
    if (!movies.length && COHERE_API_KEY) {
      try {
        movies = await tryCohere(prompt);
      } catch (e: any) {
        aiError = e.message || "Cohere error";
      }
    }
    // 5. Fallback
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
