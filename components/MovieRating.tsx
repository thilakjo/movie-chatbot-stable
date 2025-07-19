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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const moviesToRate = [
  "The Shawshank Redemption",
  "The Godfather",
  "The Dark Knight",
  "Pulp Fiction",
  "Forrest Gump",
  "Inception",
  "Fight Club",
  "The Matrix",
  "Interstellar",
  "The Silence of the Lambs",
];
type Ratings = { [key: string]: string };

export function MovieRating() {
  const [ratings, setRatings] = useState<Ratings>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRatingChange = (movie: string, rating: string) => {
    setRatings((prev) => ({ ...prev, [movie]: rating }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    await fetch("/api/rate-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings }),
    });
    router.refresh();
  };

  return (
    <Card className="max-w-2xl mx-auto animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-2xl">Rate Some Movies</CardTitle>
        <CardDescription>
          This gives us a great starting point for your recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {moviesToRate.map((movie) => (
          <div key={movie}>
            <Label className="font-semibold">{movie}</Label>
            <RadioGroup
              onValueChange={(value) => handleRatingChange(movie, value)}
              className="flex space-x-4 mt-2"
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
        <Button
          onClick={handleSubmit}
          disabled={
            isLoading || Object.keys(ratings).length < moviesToRate.length
          }
          className="w-full"
        >
          {isLoading ? "Saving..." : "Submit Ratings"}
        </Button>
      </CardContent>
    </Card>
  );
}
