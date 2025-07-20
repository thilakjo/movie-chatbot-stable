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

export function MovieRating({ moviesToRate }: { moviesToRate: string[] }) {
  const [ratings, setRatings] = useState<Ratings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleRatingChange = (movie: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [movie]: rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await fetch("/api/rate-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings }),
    });
    setIsLoading(false);
    setSubmitted(true);
    // Optionally, refresh the page or move to next onboarding step
    // router.refresh();
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
          Please rate each movie below (1-5 stars) to help us personalize your
          recommendations.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {moviesToRate.map((movie) => (
            <div key={movie} className="border-b pb-4 mb-4">
              <Label className="font-semibold mb-2 block">{movie}</Label>
              <StarRating
                value={ratings[movie] || 0}
                onChange={(v) => handleRatingChange(movie, v)}
              />
            </div>
          ))}
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={
              isLoading || moviesToRate.some((movie) => !ratings[movie])
            }
          >
            {isLoading ? "Saving..." : "Submit Ratings"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
