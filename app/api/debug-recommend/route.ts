// app/api/debug-recommend/route.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("=== RECOMMENDATION DEBUG START ===");

    // Step 1: Check authentication
    console.log("Step 1: Checking authentication...");
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({
        error: "Unauthorized - no user session",
        step: "authentication",
        status: "failed",
      });
    }

    console.log("User ID:", userId);

    // Step 2: Check database connection and user data
    console.log("Step 2: Checking database and user data...");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { movies: true },
    });

    if (!user) {
      return NextResponse.json({
        error: "User not found in database",
        step: "database",
        status: "failed",
      });
    }

    console.log("User found:", {
      id: user.id,
      onboardingStep: user.onboardingStep,
      moviesCount: user.movies.length,
      hasPreferences: !!user.preferences,
      hasRatings: !!user.movieRatings,
    });

    // Step 3: Check Gemini API key
    console.log("Step 3: Checking Gemini API key...");
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        error: "GEMINI_API_KEY is not set",
        step: "api_key",
        status: "failed",
      });
    }

    if (!GEMINI_API_KEY.startsWith("AIza")) {
      return NextResponse.json({
        error: "GEMINI_API_KEY format appears incorrect",
        step: "api_key_format",
        status: "failed",
      });
    }

    console.log("Gemini API key format is correct");

    // Step 4: Test Gemini API
    console.log("Step 4: Testing Gemini API...");
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const testPrompt =
        'Recommend 2 popular movies. Return ONLY a valid JSON array of objects with \'title\' key. Example: [{"title": "The Shawshank Redemption"}]';

      console.log("Sending test prompt to Gemini...");
      const result = await model.generateContent(testPrompt);
      const response = result.response.text();

      console.log("Gemini response:", response.substring(0, 200) + "...");

      // Try to parse the response
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        return NextResponse.json({
          error: "Gemini response is not valid JSON array",
          step: "gemini_response_parsing",
          status: "failed",
          rawResponse: response,
        });
      }

      const recommendations = JSON.parse(jsonMatch[0]);
      console.log("Successfully parsed recommendations:", recommendations);
    } catch (geminiError: any) {
      console.error("Gemini API test failed:", geminiError);
      return NextResponse.json({
        error: `Gemini API test failed: ${geminiError.message}`,
        step: "gemini_api_test",
        status: "failed",
        errorType: geminiError.constructor.name,
      });
    }

    // Step 5: Check user preferences
    console.log("Step 5: Checking user preferences...");
    const preferences = (user.preferences as any) || {};
    const movieRatings = (user.movieRatings as any) || {};

    console.log("User preferences:", {
      favoriteGenre: preferences.favoriteGenre,
      favoriteDirector: preferences.favoriteDirector,
      mood: preferences.mood,
      casualAnswers: preferences.casualAnswers,
      ratingsCount: Object.keys(movieRatings).length,
    });

    // Step 6: Build recommendation prompt
    console.log("Step 6: Building recommendation prompt...");
    const excludeTitles = new Set(user.movies.map((m) => m.movieTitle));
    if (user.movieRatings) {
      Object.keys(user.movieRatings).forEach((title) =>
        excludeTitles.add(title)
      );
    }

    let prompt = `You are a movie expert. Recommend 5 new movies that perfectly match the user's taste. `;

    if (preferences.favoriteGenre) {
      prompt += `The user's favorite genre is: ${preferences.favoriteGenre}. `;
    }

    if (preferences.favoriteDirector) {
      prompt += `Their favorite director is: ${preferences.favoriteDirector}. `;
    }

    if (preferences.mood) {
      prompt += `They want to watch: ${preferences.mood}. `;
    }

    if (preferences.casualAnswers && preferences.casualAnswers.length > 0) {
      prompt += `Additional preferences: ${preferences.casualAnswers.join(
        ", "
      )}. `;
    }

    if (Object.keys(movieRatings).length > 0) {
      const likedMovies = Object.entries(movieRatings)
        .filter(([_, rating]) => rating === "Good")
        .map(([title, _]) => title);
      if (likedMovies.length > 0) {
        prompt += `They liked these movies: ${likedMovies.join(", ")}. `;
      }
    }

    prompt += `Exclude these movies they already have: ${Array.from(
      excludeTitles
    ).join(", ")}. `;
    prompt += `Return ONLY a valid JSON array of objects, where each object has a "title" key. Example: [{"title": "Blade Runner 2049"}]`;

    console.log("Final prompt length:", prompt.length);
    console.log("Prompt preview:", prompt.substring(0, 200) + "...");

    console.log("=== RECOMMENDATION DEBUG END ===");

    return NextResponse.json({
      success: true,
      status: "all_tests_passed",
      debug: {
        userId,
        userMoviesCount: user.movies.length,
        hasPreferences: !!user.preferences,
        hasRatings: !!user.movieRatings,
        excludeTitlesCount: excludeTitles.size,
        promptLength: prompt.length,
        geminiApiKeyExists: !!GEMINI_API_KEY,
        geminiApiKeyFormat: GEMINI_API_KEY.startsWith("AIza"),
      },
    });
  } catch (error: any) {
    console.error("=== RECOMMENDATION DEBUG ERROR ===");
    console.error("Error type:", error?.constructor?.name || "Unknown");
    console.error("Error message:", error?.message || "Unknown error");
    console.error("Error stack:", error?.stack || "No stack trace");
    console.error("=== RECOMMENDATION DEBUG ERROR END ===");

    return NextResponse.json({
      error: error?.message || "Unknown error",
      errorType: error?.constructor?.name || "Unknown",
      status: "failed",
    });
  }
}
