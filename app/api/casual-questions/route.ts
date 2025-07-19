// app/api/casual-questions/route.ts

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";
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
    const { answers } = await req.json();

    // Get the existing preferences and append the new answers
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const existingPreferences = (user?.preferences as any) || {};
    const updatedPreferences = {
      ...existingPreferences,
      casualAnswers: answers,
    };

    // Update the user and mark onboarding as complete
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPreferences,
        onboardingStep: "ONBOARDING_COMPLETE",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save answers" },
      { status: 500 }
    );
  }
}
