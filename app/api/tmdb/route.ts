// app/api/tmdb/route.ts

import { NextResponse } from "next/server";

const FALLBACK_POSTER = "/fallback-poster.png";

async function fetchFromTMDb(title: string) {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return { posterUrl: FALLBACK_POSTER, genres: [] };
  }

  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    title
  )}`;

  try {
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.error(
        `TMDb search failed for "${title}":`,
        await searchRes.text()
      );
      return { posterUrl: FALLBACK_POSTER, genres: [] };
    }

    const searchData = await searchRes.json();
    if (searchData.results && searchData.results.length > 0) {
      const movie = searchData.results[0];
      const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : FALLBACK_POSTER;
      return { posterUrl, genres: [] }; // Genres can be added here if needed in the future
    }
  } catch (error) {
    console.error(`Error fetching from TMDb for "${title}":`, error);
  }

  return { posterUrl: FALLBACK_POSTER, genres: [] };
}

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    if (!title) {
      return NextResponse.json(
        { error: "Movie title is required" },
        { status: 400 }
      );
    }
    const movieData = await fetchFromTMDb(title);
    return NextResponse.json(movieData);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
