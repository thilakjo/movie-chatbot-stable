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

    const { movieTitle } = await request.json();

    if (!movieTitle) {
      return NextResponse.json(
        { error: "Movie title is required" },
        { status: 400 }
      );
    }

    console.log(`Adding movie to watched: ${movieTitle} for user: ${userId}`);

    // Check if movie already exists for this user
    const existingMovie = await prisma.userMovie.findUnique({
      where: {
        userId_movieTitle: {
          userId: userId,
          movieTitle: movieTitle,
        },
      },
    });

    if (existingMovie) {
      // Update existing movie to watched status
      await prisma.userMovie.update({
        where: {
          userId_movieTitle: {
            userId: userId,
            movieTitle: movieTitle,
          },
        },
        data: {
          status: "watched",
          updatedAt: new Date(),
        },
      });
      console.log(`Updated movie status to watched: ${movieTitle}`);
    } else {
      // Create new movie entry as watched
      await prisma.userMovie.create({
        data: {
          userId: userId,
          movieTitle: movieTitle,
          status: "watched",
          order: 0,
        },
      });
      console.log(`Created new watched movie: ${movieTitle}`);
    }

    // Get updated user data for learning analysis
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferences: true,
        movieRatings: true,
        movies: {
          where: { status: "watched" },
          select: { movieTitle: true },
        },
      },
    });

    const watchedCount = user?.movies?.length || 0;
    console.log(`User now has ${watchedCount} watched movies`);

    return NextResponse.json({
      success: true,
      message: `Added ${movieTitle} to watched list`,
      watchedCount: watchedCount,
    });
  } catch (error) {
    console.error("Add to watched error:", error);
    return NextResponse.json(
      { error: "Failed to add movie to watched list" },
      { status: 500 }
    );
  }
}
