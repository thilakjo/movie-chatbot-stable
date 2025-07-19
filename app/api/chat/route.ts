// app/api/chat/route.ts (Final Corrected Version)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correct import
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();

  // Gather all available user data for the best possible context
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferences: true,
      movieRatings: true,
      movies: true,
    },
  });

  const lastUserMessage = messages[messages.length - 1]?.content;

  // Create a rich prompt for Gemini
  interface UserPreferences {
    [key: string]: any;
  }

  interface MovieRating {
    movieId: string;
    rating: number;
  }

  interface Movie {
    movieTitle: string;
    [key: string]: any;
  }

  interface User {
    preferences?: UserPreferences;
    movieRatings?: MovieRating[];
    movies?: Movie[];
  }

  const prompt: string = `
    You are a friendly and insightful movie recommendation expert.
    Here is what you know about the user:
    - Initial Preferences: ${JSON.stringify((user as User)?.preferences || {})}
    - Their ratings of famous movies: ${JSON.stringify(
      (user as User)?.movieRatings || {}
    )}
    - Movies on their watchlist or already watched: ${JSON.stringify(
      (user as User)?.movies?.map((m) => m.movieTitle) || []
    )}
    
    The user's latest request is: "${lastUserMessage}"
    
    Based on ALL of this context, provide one specific and thoughtful movie recommendation. Explain in 2-3 sentences why this particular movie is a great fit for them. Do not ask any questions back.
  `;

  // Use Gemini to generate a response (non-streaming)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return new Response(text);
}
