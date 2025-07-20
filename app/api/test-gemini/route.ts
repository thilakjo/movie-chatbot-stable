// app/api/test-gemini/route.ts

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        error: "GEMINI_API_KEY is not set",
        status: "failed",
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt =
      'Say \'Hello World\' in JSON format like this: {"message": "Hello World"}';

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return NextResponse.json({
      success: true,
      response: response,
      status: "working",
    });
  } catch (error) {
    console.error("Gemini test failed:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      status: "failed",
    });
  }
}
