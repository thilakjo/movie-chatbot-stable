import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// (This helper function should be identical to the one in tmdb/route.ts)
async function getMovieDetails(title: string) {
  if (!TMDB_API_KEY) return {};
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) return {};

    const movie = searchData.results[0];
    const movieId = movie.id;
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`;
    const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;

    const [detailsRes, creditsRes] = await Promise.all([
      fetch(detailsUrl),
      fetch(creditsUrl),
    ]);
    const detailsData = await detailsRes.json();
    const creditsData = await creditsRes.json();

    return {
      posterUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      year: movie.release_date
        ? parseInt(movie.release_date.split("-")[0])
        : null,
      imdbRating: detailsData.vote_average
        ? detailsData.vote_average.toFixed(1)
        : null,
      director:
        creditsData.crew?.find((p: any) => p.job === "Director")?.name || null,
      leadActor: creditsData.cast?.[0]?.name || null,
    };
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { movieTitle, status, feedback } = await req.json();
  if (status === "REMOVED") {
    await prisma.userMovie.delete({
      where: { userId_movieTitle: { userId, movieTitle } },
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
}
