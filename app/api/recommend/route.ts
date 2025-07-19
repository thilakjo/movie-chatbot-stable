// app/api/recommend/route.ts (Simplified)

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true, movieRatings: true, movies: true },
  });

  const excludeTitles = new Set([
    ...(user?.movieRatings ? Object.keys(user.movieRatings) : []),
    ...(user?.movies?.map((m) => m.movieTitle) || []),
  ]);

  const prompt = `You are a movie expert. The user's preferences are: ${JSON.stringify(
    user?.preferences || {}
  )}. The user has already rated or seen these movies: ${Array.from(
    excludeTitles
  ).join(
    ", "
  )}. Recommend 5 new, interesting movies they haven't seen. IMPORTANT: Return ONLY a JSON array of objects, where each object has a "title" key. Example: [{"title": "Inception"},{"title": "The Matrix"}]`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let recommendations: { title: string }[] = [];
  try {
    const cleanedText = text.replace(/```json|```/g, "").trim();
    recommendations = JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    return NextResponse.json({
      recommendations: [],
      userMovies: user?.movies || [],
    });
  }

  // Return the movie titles from Gemini IMMEDIATELY
  return NextResponse.json({
    recommendations,
    userMovies: user?.movies || [],
  });
}
