// app/api/tmdb/route.ts (Upgraded)

import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const FALLBACK_POSTER = "/fallback-poster.png";

async function fetchFromTMDb(title: string) {
  if (!TMDB_API_KEY) {
    return {
      posterUrl: FALLBACK_POSTER,
      year: null,
      director: null,
      imdbRating: null,
    };
  }

  // 1. Search for the movie to get its ID
  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    title
  )}`;

  try {
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      return {
        posterUrl: FALLBACK_POSTER,
        year: null,
        director: null,
        imdbRating: null,
      };
    }

    const movieId = searchData.results[0].id;
    const posterUrl = searchData.results[0].poster_path
      ? `https://image.tmdb.org/t/p/w500${searchData.results[0].poster_path}`
      : FALLBACK_POSTER;
    const year = searchData.results[0].release_date
      ? parseInt(searchData.results[0].release_date.split("-")[0])
      : null;

    // 2. Fetch movie details for IMDb ID
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    const imdbRating = detailsData.vote_average
      ? detailsData.vote_average.toFixed(1)
      : null;

    // 3. Fetch credits to find the director
    const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
    const creditsRes = await fetch(creditsUrl);
    const creditsData = await creditsRes.json();
    const director =
      creditsData.crew?.find((person: any) => person.job === "Director")
        ?.name || null;

    return { posterUrl, year, director, imdbRating };
  } catch (error) {
    console.error(`Error fetching from TMDb for "${title}":`, error);
  }

  return {
    posterUrl: FALLBACK_POSTER,
    year: null,
    director: null,
    imdbRating: null,
  };
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
