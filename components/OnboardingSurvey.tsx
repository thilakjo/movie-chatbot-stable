// components/OnboardingSurvey.tsx

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CASUAL_QUESTIONS = [
  {
    question: "A perfect movie night for me is...",
    options: [
      "Action-packed and exciting",
      "Funny and lighthearted",
      "Thought-provoking and deep",
      "A classic I can watch again",
    ],
  },
  {
    question: "I prefer movies that are...",
    options: [
      "Critically acclaimed",
      "Popular and well-known",
      "Hidden gems",
      "Visually stunning",
    ],
  },
  {
    question: "When it comes to plot, I enjoy...",
    options: [
      "Complex twists and turns",
      "A straightforward, strong story",
      "Character-driven stories",
      "Mind-bending or abstract concepts",
    ],
  },
];

export function OnboardingSurvey({
  onMoviesGenerated,
}: {
  onMoviesGenerated: (movies: string[]) => void;
}) {
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [favoriteDirector, setFavoriteDirector] = useState("");
  const [mood, setMood] = useState("");
  const [casualAnswers, setCasualAnswers] = useState<string[]>(
    Array(CASUAL_QUESTIONS.length).fill("")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCasualChange = (idx: number, answer: string) => {
    setCasualAnswers((prev) => {
      const next = [...prev];
      next[idx] = answer;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteGenre,
          favoriteDirector,
          mood,
          casualAnswers,
        }),
      });
      const data = await res.json();
      setIsLoading(false);
      if (res.ok && data.movies && Array.isArray(data.movies)) {
        onMoviesGenerated(data.movies);
      } else {
        setError(data.error || "Failed to generate movies. Please try again.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  const allCasualAnswered = casualAnswers.every((a) => a);
  const canSubmit =
    favoriteGenre &&
    favoriteDirector &&
    mood &&
    allCasualAnswered &&
    !isLoading;

  return (
    <Card className="max-w-2xl mx-auto animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-2xl">
          Let&apos;s Get to Know Your Movie Taste!
        </CardTitle>
        <CardDescription>
          Answer a few quick questions to help us personalize your
          recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="genre">Favorite Genre?</Label>
            <Input
              id="genre"
              placeholder="e.g., Sci-Fi, Comedy"
              value={favoriteGenre}
              onChange={(e) => setFavoriteGenre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="director">Favorite Director?</Label>
            <Input
              id="director"
              placeholder="e.g., Christopher Nolan"
              value={favoriteDirector}
              onChange={(e) => setFavoriteDirector(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mood">
              What&apos;s your current mood for a movie?
            </Label>
            <Input
              id="mood"
              placeholder="e.g., Something funny and lighthearted"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              required
            />
          </div>
          <div className="space-y-6 mt-6">
            <div className="font-semibold text-lg mb-2">
              A few more quick questions:
            </div>
            {CASUAL_QUESTIONS.map((q, idx) => (
              <div key={q.question} className="mb-2">
                <Label className="block mb-2">{q.question}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`w-full p-3 rounded-lg border transition-colors duration-200 ${
                        casualAnswers[idx] === option
                          ? "bg-primary text-white"
                          : "bg-gray-100 hover:bg-primary/80 hover:text-white"
                      }`}
                      onClick={() => handleCasualChange(idx, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full mt-4" disabled={!canSubmit}>
            {isLoading
              ? "Generating your movies..."
              : "See My Personalized Movies"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
