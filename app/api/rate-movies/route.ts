// app/api/rate-movies/route.ts (Improved Version)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

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

    console.log("Saving movie ratings for user:", userId, "Ratings:", ratings);

    await prisma.user.update({
      where: { id: userId },
      data: {
        movieRatings: ratings,
        onboardingStep: "NEEDS_CASUAL_QUESTIONS", // Advance to the next step
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving movie ratings:", error);
    return NextResponse.json(
      { error: "Failed to save movie ratings" },
      { status: 500 }
    );
  }
}
