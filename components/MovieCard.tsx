// components/MovieCard.tsx

"use client";
import { useState, useEffect } from "react";

const FALLBACK_POSTER = "/fallback-poster.png";

interface MovieCardProps {
  title: string;
  children?: React.ReactNode; // To allow for action buttons
}

export function MovieCard({ title, children }: MovieCardProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPoster = async () => {
      try {
        const res = await fetch("/api/tmdb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error("Failed to fetch poster");
        const data = await res.json();
        if (isMounted) {
          setPosterUrl(data.posterUrl || FALLBACK_POSTER);
        }
      } catch (error) {
        if (isMounted) {
          setPosterUrl(FALLBACK_POSTER);
        }
      }
    };

    fetchPoster();

    return () => {
      isMounted = false;
    };
  }, [title]);

  return (
    <div className="group text-center cursor-pointer">
      <div className="h-96 w-full bg-gray-200 rounded-lg shadow-lg mb-2 flex items-center justify-center">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="rounded-lg h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_POSTER;
            }}
          />
        ) : (
          <div className="animate-pulse h-full w-full bg-gray-300 rounded-lg"></div>
        )}
      </div>
      <h3 className="font-bold text-lg mt-2 h-12">{title}</h3>
      {children}
    </div>
  );
}
