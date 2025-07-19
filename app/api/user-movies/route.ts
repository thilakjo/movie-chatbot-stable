// app/api/user-movies/route.ts (Corrected)

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
    const { movieTitle, status, feedback } = await req.json();

    await prisma.userMovie.upsert({
      where: {
        userId_movieTitle: {
          userId,
          movieTitle,
        },
      },
      update: {
        status,
        feedback: feedback ? feedback : undefined,
      },
      create: {
        userId,
        movieTitle,
        status,
        feedback: feedback ? feedback : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update movie status" },
      { status: 500 }
    );
  }
}
