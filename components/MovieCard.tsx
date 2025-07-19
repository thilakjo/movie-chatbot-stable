"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const FALLBACK_POSTER = "/fallback-poster.png";

interface MovieCardProps {
  title: string;
  initialPoster?: string;
  onRemove?: () => void;
  children?: React.ReactNode;
}

interface MovieDetails {
  posterUrl: string;
  year: number | null;
  director: string | null;
  imdbRating: string | null;
}

export function MovieCard({
  title,
  initialPoster,
  onRemove,
  children,
}: MovieCardProps) {
  const [details, setDetails] = useState<MovieDetails | null>(
    initialPoster
      ? {
          posterUrl: initialPoster,
          year: null,
          director: null,
          imdbRating: null,
        }
      : null
  );
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Only fetch details if they weren't provided initially
    if (!initialPoster) {
      const fetchDetails = async () => {
        try {
          const res = await fetch("/api/tmdb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          if (res.ok) {
            const data = await res.json();
            setDetails(data);
          } else {
            setDetails({
              posterUrl: FALLBACK_POSTER,
              year: null,
              director: null,
              imdbRating: null,
            });
          }
        } catch {
          setDetails({
            posterUrl: FALLBACK_POSTER,
            year: null,
            director: null,
            imdbRating: null,
          });
        }
      };
      fetchDetails();
    }
  }, [title, initialPoster]);

  return (
    <div
      className="w-full aspect-[2/3] perspective-1000"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front of Card (Poster) */}
        <div className="absolute w-full h-full backface-hidden">
          {details ? (
            <img
              src={details.posterUrl || FALLBACK_POSTER}
              alt={title}
              className="w-full h-full object-cover rounded-lg shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_POSTER;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg animate-pulse"></div>
          )}
          <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
            <h3 className="text-white text-sm font-bold truncate">{title}</h3>
          </div>
        </div>
        {/* Back of Card (Details) */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-lg mb-2">{title}</h4>
            <div className="text-sm space-y-1">
              <p>
                <strong>Year:</strong> {details?.year || "N/A"}
              </p>
              <p>
                <strong>Director:</strong> {details?.director || "N/A"}
              </p>
              <p>
                <strong>IMDb Rating:</strong> {details?.imdbRating || "N/A"}
              </p>
            </div>
          </div>
          {onRemove && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
