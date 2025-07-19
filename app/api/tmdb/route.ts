// app/api/tmdb/route.ts (Upgraded to fetch Lead Actor)

import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const FALLBACK_POSTER = "/fallback-poster.png";

async function fetchFromTMDb(title: string) {
  if (!TMDB_API_KEY)
    return {
      posterUrl: FALLBACK_POSTER,
      year: null,
      director: null,
      imdbRating: null,
      leadActor: null,
    };

  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    title
  )}`;

  try {
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0)
      return {
        posterUrl: FALLBACK_POSTER,
        year: null,
        director: null,
        imdbRating: null,
        leadActor: null,
      };

    const movie = searchData.results[0];
    const movieId = movie.id;

    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
    const creditsRes = await fetch(creditsUrl);
    const creditsData = await creditsRes.json();

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
        creditsData.crew?.find((p: any) => p.job === "Director")?.name || null,
      leadActor: creditsData.cast?.[0]?.name || null, // Get the top-billed actor
    };
  } catch (error) {
    console.error(`Error fetching from TMDb for "${title}":`, error);
  }

  return {
    posterUrl: FALLBACK_POSTER,
    year: null,
    director: null,
    imdbRating: null,
    leadActor: null,
  };
}

export async function POST(req: Request) {
  const { title } = await req.json();
  const movieData = await fetchFromTMDb(title);
  return NextResponse.json(movieData);
}
