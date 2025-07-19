import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });

  const userPreferences = user?.preferences
    ? JSON.stringify(user.preferences)
    : "No preferences provided.";

  const systemPrompt = `You are a friendly movie expert. The user's preferences are: ${userPreferences}. Based on their preferences and their latest message, give one specific movie recommendation. Explain why in 2-3 sentences. Do not ask questions. Provide the recommendation directly.`;

  const lastUserMessage = messages[messages.length - 1]?.content;
  const prompt = `${systemPrompt}\n\nUser's request: "${lastUserMessage}"`;

  // Use Gemini to generate a response (non-streaming for now)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, I couldn't generate a recommendation.";

  return new Response(text, { status: 200 });
}
