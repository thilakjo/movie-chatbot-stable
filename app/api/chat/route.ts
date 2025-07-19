// app/api/chat/route.ts (Corrected)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correct import
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferences: true,
      movieRatings: true,
      movies: true,
    },
  });

  const lastUserMessage = messages[messages.length - 1]?.content;

  const prompt = `You are a friendly and insightful movie recommendation expert. Based on the user's preferences: ${JSON.stringify(
    user || {}
  )}. The user's latest request is: "${lastUserMessage}". Provide one specific and thoughtful movie recommendation.`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return new Response(text);
}
