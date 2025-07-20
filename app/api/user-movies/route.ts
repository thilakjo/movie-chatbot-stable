import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const FALLBACK_POSTER = "/fallback-poster.svg";

// Type definitions for TMDb API responses
interface TMDBMovieDetails {
  vote_average?: number;
}

interface TMDBCredits {
  crew?: Array<{ job: string; name: string }>;
  cast?: Array<{ name: string }>;
}

// Improved movie details fetching with better error handling
async function getMovieDetails(title: string) {
  const fallbackResult = {
    posterUrl: FALLBACK_POSTER,
    year: null,
    director: null,
    imdbRating: null,
    leadActor: null,
  };

  if (!TMDB_API_KEY) {
    return fallbackResult;
  }

  try {
    // Search for the movie
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`;

    const searchController = new AbortController();
    const searchTimeout = setTimeout(() => searchController.abort(), 8000);

    const searchRes = await fetch(searchUrl, {
      signal: searchController.signal,
    });
    clearTimeout(searchTimeout);

    if (!searchRes.ok) {
      console.log(`TMDb search failed for "${title}": ${searchRes.status}`);
      return fallbackResult;
    }

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`No TMDb results found for "${title}"`);
      return fallbackResult;
    }

    const movie = searchData.results[0];
    const movieId = movie.id;

    // Fetch details and credits in parallel with individual timeouts
    const detailsController = new AbortController();
    const creditsController = new AbortController();
    const detailsTimeout = setTimeout(() => detailsController.abort(), 8000);
    const creditsTimeout = setTimeout(() => creditsController.abort(), 8000);

    const [detailsRes, creditsRes] = await Promise.allSettled([
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`,
        {
          signal: detailsController.signal,
        }
      ),
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`,
        {
          signal: creditsController.signal,
        }
      ),
    ]);

    clearTimeout(detailsTimeout);
    clearTimeout(creditsTimeout);

    let detailsData: TMDBMovieDetails = {};
    let creditsData: TMDBCredits = {};

    if (detailsRes.status === "fulfilled" && detailsRes.value.ok) {
      detailsData = await detailsRes.value.json();
    }

    if (creditsRes.status === "fulfilled" && creditsRes.value.ok) {
      creditsData = await creditsRes.value.json();
    }

    return {
      posterUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : FALLBACK_POSTER,
      year: movie.release_date
        ? parseInt(movie.release_date.split("-")[0])
        : null,
      imdbRating: detailsData.vote_average
        ? detailsData.vote_average.toFixed(1)
        : null,
      director:
        creditsData.crew?.find((p) => p.job === "Director")?.name || null,
      leadActor: creditsData.cast?.[0]?.name || null,
    };
  } catch (error) {
    console.error(`Error fetching movie details for "${title}":`, error);
    return fallbackResult;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const movies = await prisma.userMovie.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ movies });
  } catch (error) {
    console.error("Error fetching user movies:", error);
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { movieTitle, status, feedback } = await req.json();

    if (status === "REMOVED") {
      await prisma.userMovie.delete({
        where: { userId_movieTitle: { userId, movieTitle } },
      });
      return NextResponse.json({ success: true });
    }

    // Handle LIKE action: update movieRatings or likedMovies
    if (status === "LIKED") {
      // Add to movieRatings as 5 stars (or add to likedMovies array if you prefer)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      let movieRatings = (user?.movieRatings as any) || {};
      movieRatings[movieTitle] = 5;
      await prisma.user.update({
        where: { id: userId },
        data: { movieRatings },
      });
      return NextResponse.json({ success: true });
    }

    const details = await getMovieDetails(movieTitle);

    await prisma.userMovie.upsert({
      where: { userId_movieTitle: { userId, movieTitle } },
      update: { status, feedback: feedback || undefined, ...details },
      create: {
        userId,
        movieTitle,
        status,
        feedback: feedback || undefined,
        ...details,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user movie:", error);
    return NextResponse.json(
      { error: "Failed to update movie" },
      { status: 500 }
    );
  }
}
