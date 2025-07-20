"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MovieWithDetails } from "@/lib/types";

const FALLBACK_POSTER = "/fallback-poster.png";

interface MovieCardProps {
  title: string;
  initialData?: MovieWithDetails;
  onRemove?: () => void;
  onMarkAsWatched?: () => void;
  children?: React.ReactNode;
  isFlippable?: boolean;
  backContent?: React.ReactNode;
}

export function MovieCard({
  title,
  initialData,
  onRemove,
  onMarkAsWatched,
  children,
  isFlippable,
  backContent,
}: MovieCardProps) {
  const [details, setDetails] = useState<MovieWithDetails | null>(
    initialData || null
  );
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!details?.year) {
      // Fetch only if we don't have full details
      const fetchDetails = async () => {
        try {
          const res = await fetch("/api/tmdb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          if (res.ok) setDetails(await res.json());
          else setDetails({ posterUrl: FALLBACK_POSTER } as MovieWithDetails);
        } catch {
          setDetails({ posterUrl: FALLBACK_POSTER } as MovieWithDetails);
        }
      };
      fetchDetails();
    }
  }, [title, details]);

  // Only allow flipping if not mobile overlay active
  const handleCardClick = (e: React.MouseEvent) => {
    // If overlay is visible (mobile), do not flip
    if (
      (e.target as HTMLElement).closest(".recommendation-overlay-mobile-active")
    ) {
      return;
    }
    setIsFlipped((f) => !f);
  };

  return (
    <div
      className="w-full aspect-[2/3] perspective-1000"
      onClick={handleCardClick}
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden group">
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
            <div className="w-full h-full bg-slate-200 rounded-lg animate-pulse"></div>
          )}
          <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
            <h3 className="text-white text-sm font-bold truncate">{title}</h3>
          </div>
          {children && (
            <div
              className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-2 gap-2 recommendation-overlay-mobile-active sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity`}
            >
              {children}
            </div>
          )}
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
          <div className="space-y-2">
            {onMarkAsWatched && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsWatched();
                }}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Watched It
              </Button>
            )}
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
      </div>
    </div>
  );
}
