import { NextResponse } from "next/server";

async function fetchPosterTMDb(
  title: string,
  TMDB_API_KEY: string
): Promise<string | null> {
  if (!TMDB_API_KEY) return null;
  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    title
  )}`;
  try {
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (
      data.results &&
      data.results.length > 0 &&
      data.results[0].poster_path
    ) {
      return `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
    }
  } catch {}
  return null;
}

export async function GET() {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const posterUrl = TMDB_API_KEY
    ? await fetchPosterTMDb("Inception", TMDB_API_KEY)
    : null;
  return NextResponse.json({
    TMDB_API_KEY_present: Boolean(TMDB_API_KEY),
    inceptionPoster: posterUrl,
  });
}
