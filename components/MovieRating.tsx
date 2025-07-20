// components/MovieRating.tsx (Corrected)

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type Ratings = { [key: string]: string };

export function MovieRating({ moviesToRate }: { moviesToRate: string[] }) {
  const [ratings, setRatings] = useState<Ratings>({});
  const [remainingMovies, setRemainingMovies] =
    useState<string[]>(moviesToRate);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    setRemainingMovies(moviesToRate.filter((m) => !(m in ratings)));
  }, [moviesToRate, ratings]);

  const handleRatingChange = async (movie: string, rating: string) => {
    setRatings((prev) => ({ ...prev, [movie]: rating }));
    setIsLoading(true);
    const res = await fetch("/api/rate-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings: { ...ratings, [movie]: rating } }),
    });
    const data = await res.json();
    setIsLoading(false);
    if (data.recommendations) {
      setRecommendations(data.recommendations);
    }
    if (data.nextMoviesToRate) {
      setRemainingMovies(
        data.nextMoviesToRate.filter((m: string) => !(m in ratings))
      );
    }
  };

  if (remainingMovies.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto animate-fadeIn">
        <CardHeader>
          <CardTitle>Thank you for rating!</CardTitle>
          <CardDescription>
            {recommendations.length > 0 ? (
              <>
                Here are some recommendations for you:
                <ul className="mt-2 list-disc list-inside">
                  {recommendations.map((rec) => (
                    <li key={rec}>{rec}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>Generating your recommendations...</>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-2xl">Rate Some Movies</CardTitle>
        <CardDescription>
          Based on your preferences, how would you rate these?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {remainingMovies.slice(0, 1).map((movie) => (
          <div key={movie}>
            <Label className="font-semibold">{movie}</Label>
            <RadioGroup
              onValueChange={(value) => handleRatingChange(movie, value)}
              className="flex flex-wrap gap-x-4 gap-y-2 mt-2"
            >
              {["Good", "Okay", "Didn't like", "Not watched"].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${movie}-${option}`} />
                  <Label htmlFor={`${movie}-${option}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
        {recommendations.length > 0 && (
          <div className="mt-6">
            <div className="font-semibold mb-2">Live Recommendations:</div>
            <ul className="list-disc list-inside">
              {recommendations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
