import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id || (session?.user as any)?.sub;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieTitle, status, feedback } = await req.json();
    // Upsert the UserMovie entry
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
