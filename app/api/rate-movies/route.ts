// app/api/rate-movies/route.ts (Final Corrected Version)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correct import
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ratings } = await req.json();
    await prisma.user.update({
      where: { id: userId },
      data: {
        movieRatings: ratings,
        onboardingStep: "NEEDS_CASUAL_QUESTIONS", // Advance to the next step
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save movie ratings" },
      { status: 500 }
    );
  }
}
