import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { movieId } = await request.json();

    if (!movieId) {
      return NextResponse.json(
        { error: "Movie ID is required" },
        { status: 400 }
      );
    }

    console.log(`Moving movie to watchlist: ${movieId} for user: ${userId}`);

    // Update the movie status to watchlist
    await prisma.userMovie.update({
      where: {
        id: movieId,
        userId: userId,
      },
      data: {
        status: "watchlist",
        updatedAt: new Date(),
      },
    });

    console.log(`Successfully moved movie ${movieId} to watchlist`);

    return NextResponse.json({
      success: true,
      message: "Movie moved to watchlist",
    });
  } catch (error) {
    console.error("Move to watchlist error:", error);
    return NextResponse.json(
      { error: "Failed to move movie to watchlist" },
      { status: 500 }
    );
  }
}
