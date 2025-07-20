import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

    // Test basic database connection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingStep: true,
        preferences: true,
        movies: {
          select: {
            id: true,
            movieTitle: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        onboardingStep: user.onboardingStep,
        hasPreferences: !!user.preferences,
        movieCount: user.movies.length,
        watchlistCount: user.movies.filter((m) => m.status === "watchlist")
          .length,
        watchedCount: user.movies.filter((m) => m.status === "watched").length,
      },
    });
  } catch (error) {
    console.error("Test dashboard error:", error);
    return NextResponse.json(
      {
        error: "Failed to test dashboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
