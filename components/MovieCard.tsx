// components/MovieCard.tsx (Corrected)

"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MovieWithDetails } from "@/lib/types"; // <-- CORRECTED IMPORT

const FALLBACK_POSTER = "/fallback-poster.png";

interface MovieCardProps {
  title: string;
  initialData?: MovieWithDetails; // Use the shared type
  onRemove?: () => void;
  children?: React.ReactNode;
}

export function MovieCard({
  title,
  initialData,
  onRemove,
  children,
}: MovieCardProps) {
  const [details, setDetails] = useState<MovieWithDetails | null>(
    initialData || null
  );
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!details) {
      const fetchDetails = async () => {
        try {
          const res = await fetch("/api/tmdb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          if (res.ok) {
            const data = await res.json();
            // We cast the fetched data to our shared type
            setDetails(data as MovieWithDetails);
          } else {
            setDetails({ posterUrl: FALLBACK_POSTER } as MovieWithDetails);
          }
        } catch {
          setDetails({ posterUrl: FALLBACK_POSTER } as MovieWithDetails);
        }
      };
      fetchDetails();
    }
  }, [title, details]);

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
        {/* Front */}
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
        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between text-left">
          <div>
            <h4 className="font-bold text-base mb-2">{title}</h4>
            <div className="text-xs space-y-1">
              <p>
                <strong>Year:</strong> {details?.year || "N/A"}
              </p>
              <p>
                <strong>Director:</strong> {details?.director || "N/A"}
              </p>
              <p>
                <strong>Starring:</strong> {details?.leadActor || "N/A"}
              </p>
              <p>
                <strong>IMDb:</strong> {details?.imdbRating || "N/A"}
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
