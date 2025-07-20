// app/api/rate-movies/route.ts (Improved Version)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { POST as recommendPOST } from "@/app/api/recommend/route";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ratings } = await req.json();

    if (!ratings || typeof ratings !== "object") {
      return NextResponse.json(
        { error: "Invalid ratings data" },
        { status: 400 }
      );
    }

    // Save ratings incrementally
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prevRatings = (user?.movieRatings as any) || {};
    const mergedRatings = { ...prevRatings, ...ratings };

    // Update ratings but do not advance onboarding until all are rated
    await prisma.user.update({
      where: { id: userId },
      data: {
        movieRatings: mergedRatings,
      },
    });

    // Get the list of movies to rate from preferences
    const preferences = (user?.preferences as any) || {};
    const allMoviesToRate = preferences.dynamicMoviesToRate || [];
    const nextMoviesToRate = allMoviesToRate.filter(
      (m: string) => !(m in mergedRatings)
    );

    // If all movies are rated, advance onboarding
    if (nextMoviesToRate.length === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          onboardingStep: "NEEDS_CASUAL_QUESTIONS",
        },
      });
    }

    // Call the recommend endpoint logic to get live recommendations
    let recommendations: string[] = [];
    try {
      // Simulate a POST to the recommend endpoint
      const recommendRes = await recommendPOST();
      const recommendData = await recommendRes.json();
      if (recommendData && Array.isArray(recommendData.recommendations)) {
        recommendations = recommendData.recommendations.map(
          (r: any) => r.title || r
        );
      }
    } catch (e) {
      // fallback: no recommendations
    }

    return NextResponse.json({
      success: true,
      nextMoviesToRate,
      recommendations,
    });
  } catch (error) {
    console.error("Error saving movie ratings:", error);
    return NextResponse.json(
      { error: "Failed to save movie ratings" },
      { status: 500 }
    );
  }
}
