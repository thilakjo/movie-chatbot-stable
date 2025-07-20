import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferences: true,
        movieRatings: true,
        onboardingStep: true,
        movies: {
          select: {
            movieTitle: true,
            status: true,
            rating: true,
            feedback: true,
            posterUrl: true,
            year: true,
            director: true,
            imdbRating: true,
            leadActor: true,
            genres: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const preferences = (user.preferences as any) || {};
    const movieRatings = (user.movieRatings as any) || {};
    const userMovies = user.movies || [];

    // Separate movies by status
    const watchlist = userMovies.filter(
      (movie) => movie.status === "watchlist"
    );
    const watched = userMovies.filter((movie) => movie.status === "watched");

    // Analyze learning data
    const likedMovies = Object.entries(movieRatings)
      .filter(([_, rating]) => rating === "Good")
      .map(([title, _]) => title);

    const dislikedMovies = Object.entries(movieRatings)
      .filter(([_, rating]) => rating === "Didn't like")
      .map(([title, _]) => title);

    // Genre analysis based on ratings
    const likedGenres = new Set();
    const dislikedGenres = new Set();

    likedMovies.forEach((movie) => {
      const movieLower = movie.toLowerCase();
      if (movieLower.includes("romance") || movieLower.includes("love"))
        likedGenres.add("romance");
      if (movieLower.includes("action") || movieLower.includes("fight"))
        likedGenres.add("action");
      if (movieLower.includes("comedy") || movieLower.includes("funny"))
        likedGenres.add("comedy");
      if (movieLower.includes("drama")) likedGenres.add("drama");
      if (movieLower.includes("thriller") || movieLower.includes("suspense"))
        likedGenres.add("thriller");
      if (movieLower.includes("sci") || movieLower.includes("space"))
        likedGenres.add("sci-fi");
      if (movieLower.includes("horror")) likedGenres.add("horror");
    });

    dislikedMovies.forEach((movie) => {
      const movieLower = movie.toLowerCase();
      if (movieLower.includes("romance") || movieLower.includes("love"))
        dislikedGenres.add("romance");
      if (movieLower.includes("action") || movieLower.includes("fight"))
        dislikedGenres.add("action");
      if (movieLower.includes("comedy") || movieLower.includes("funny"))
        dislikedGenres.add("comedy");
      if (movieLower.includes("drama")) dislikedGenres.add("drama");
      if (movieLower.includes("thriller") || movieLower.includes("suspense"))
        dislikedGenres.add("thriller");
      if (movieLower.includes("sci") || movieLower.includes("space"))
        dislikedGenres.add("sci-fi");
      if (movieLower.includes("horror")) dislikedGenres.add("horror");
    });

    // Learning insights
    const learningData = {
      userProfile: {
        favoriteGenre: preferences.favoriteGenre || "Not set",
        favoriteDirector: preferences.favoriteDirector || "Not set",
        mood: preferences.mood || "Not set",
        casualAnswers: preferences.casualAnswers || [],
        onboardingStep: user.onboardingStep,
      },
      movieRatings: {
        totalRated: Object.keys(movieRatings).length,
        liked: likedMovies,
        disliked: dislikedMovies,
        likedCount: likedMovies.length,
        dislikedCount: dislikedMovies.length,
      },
      genreAnalysis: {
        likedGenres: Array.from(likedGenres),
        dislikedGenres: Array.from(dislikedGenres),
        genrePreferences: Array.from(likedGenres).filter(
          (genre) => !dislikedGenres.has(genre)
        ),
      },
      watchlist: {
        count: watchlist.length,
        movies: watchlist.map((m) => m.movieTitle),
      },
      watched: {
        count: watched.length,
        movies: watched.map((m) => m.movieTitle),
      },
      learningProgress: {
        hasCompletedOnboarding: user.onboardingStep === "COMPLETED",
        hasRatedMovies: Object.keys(movieRatings).length > 0,
        hasWatchlist: watchlist.length > 0,
        hasWatchedMovies: watched.length > 0,
        totalInteractions:
          Object.keys(movieRatings).length + watchlist.length + watched.length,
      },
      recommendationContext: {
        // This is what gets sent to AI for recommendations
        promptContext: {
          preferences: preferences,
          likedMovies: likedMovies,
          dislikedMovies: dislikedMovies,
          likedGenres: Array.from(likedGenres),
          excludeTitles: [
            ...watchlist.map((m) => m.movieTitle),
            ...watched.map((m) => m.movieTitle),
          ],
        },
      },
    };

    return NextResponse.json({
      success: true,
      learningData,
      message: "Real-time learning data retrieved successfully",
    });
  } catch (error) {
    console.error("Debug learning error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve learning data" },
      { status: 500 }
    );
  }
}
