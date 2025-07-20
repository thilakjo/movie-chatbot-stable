// components/MovieRating.tsx (5-Star Batch UI)

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// 5-star rating widget
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          className={`text-2xl transition-colors ${
            star <= value ? "text-yellow-400" : "text-gray-300"
          }`}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type Ratings = { [key: string]: number };

interface MovieRatingProps {
  moviesToRate: string[];
  onComplete?: () => void;
}

export function MovieRating({ moviesToRate, onComplete }: MovieRatingProps) {
  const [ratings, setRatings] = useState<Ratings>({});
  const [notWatched, setNotWatched] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleRatingChange = (movie: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [movie]: rating }));
    setNotWatched((prev) => ({ ...prev, [movie]: false }));
  };

  const handleNotWatched = (movie: string) => {
    setNotWatched((prev) => ({ ...prev, [movie]: true }));
    setRatings((prev) => {
      const next = { ...prev };
      delete next[movie];
      return next;
    });
  };

  const handleUndoNotWatched = (movie: string) => {
    setNotWatched((prev) => ({ ...prev, [movie]: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Build ratings object: rated movies as numbers, not watched as 'not_watched'
    const payload: { [key: string]: number | string } = {};
    moviesToRate.forEach((movie) => {
      if (notWatched[movie]) {
        payload[movie] = "not_watched";
      } else if (ratings[movie]) {
        payload[movie] = ratings[movie];
      }
    });
    await fetch("/api/rate-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings: payload }),
    });
    setIsLoading(false);
    setSubmitted(true);
    if (onComplete) {
      setTimeout(() => onComplete(), 1000);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto animate-fadeIn">
        <CardHeader>
          <CardTitle>Thank you for rating!</CardTitle>
          <CardDescription>
            Your ratings have been saved. Enjoy your personalized
            recommendations!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-2xl">Rate These Movies</CardTitle>
        <CardDescription>
          Please rate each movie below (1-5 stars) or mark as Not Watched Yet to
          help us personalize your recommendations.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {moviesToRate.map((movie) => (
            <div
              key={movie}
              className="border-b pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <Label className="font-semibold mb-2 block w-full sm:w-1/2">
                {movie}
              </Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-1/2">
                {!notWatched[movie] && (
                  <StarRating
                    value={ratings[movie] || 0}
                    onChange={(v) => handleRatingChange(movie, v)}
                  />
                )}
                {notWatched[movie] ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs px-3 py-1 border border-gray-400 bg-gray-100 text-gray-600"
                    onClick={() => handleUndoNotWatched(movie)}
                  >
                    Undo Not Watched
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs px-3 py-1 border border-gray-400 bg-gray-100 text-gray-600"
                    onClick={() => handleNotWatched(movie)}
                  >
                    Not Watched Yet
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={
              isLoading ||
              moviesToRate.some(
                (movie) => !notWatched[movie] && !ratings[movie]
              )
            }
          >
            {isLoading ? "Saving..." : "Submit Ratings"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
