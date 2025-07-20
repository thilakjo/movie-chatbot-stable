// app/api/debug-gemini/route.ts

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    console.log("=== GEMINI DEBUG START ===");

    // Check environment variable
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    console.log("GEMINI_API_KEY exists:", !!GEMINI_API_KEY);
    console.log("GEMINI_API_KEY length:", GEMINI_API_KEY?.length);
    console.log(
      "GEMINI_API_KEY starts with:",
      GEMINI_API_KEY?.substring(0, 10)
    );

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        error: "GEMINI_API_KEY is not set",
        status: "failed",
        debug: {
          envExists: false,
          envLength: 0,
        },
      });
    }

    // Test API key format
    if (!GEMINI_API_KEY.startsWith("AIza")) {
      return NextResponse.json({
        error:
          "GEMINI_API_KEY format appears incorrect - should start with 'AIza'",
        status: "failed",
        debug: {
          envExists: true,
          envLength: GEMINI_API_KEY.length,
          startsWithAIza: false,
        },
      });
    }

    console.log("Creating Gemini instance...");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    console.log("Creating model...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("Testing simple prompt...");
    const testPrompt =
      'Say \'Hello World\' in JSON format like this: {"message": "Hello World"}';

    console.log("Generating content...");
    const result = await model.generateContent(testPrompt);

    console.log("Getting response...");
    const response = result.response.text();

    console.log("Raw response:", response);

    // Try to parse JSON response
    let parsedResponse = null;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log("Failed to parse JSON response:", e);
    }

    console.log("=== GEMINI DEBUG END ===");

    return NextResponse.json({
      success: true,
      rawResponse: response,
      parsedResponse: parsedResponse,
      status: "working",
      debug: {
        envExists: true,
        envLength: GEMINI_API_KEY.length,
        startsWithAIza: true,
        responseLength: response.length,
      },
    });
  } catch (error: any) {
    console.error("=== GEMINI DEBUG ERROR ===");
    console.error("Error type:", error?.constructor?.name || "Unknown");
    console.error("Error message:", error?.message || "Unknown error");
    console.error("Error stack:", error?.stack || "No stack trace");
    console.error("=== GEMINI DEBUG ERROR END ===");

    return NextResponse.json({
      error: error?.message || "Unknown error",
      errorType: error?.constructor?.name || "Unknown",
      status: "failed",
      debug: {
        envExists: !!process.env.GEMINI_API_KEY,
        envLength: process.env.GEMINI_API_KEY?.length || 0,
      },
    });
  }
}
