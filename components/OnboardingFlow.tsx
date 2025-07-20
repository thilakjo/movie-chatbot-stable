"use client";
import { useState } from "react";
import { OnboardingSurvey } from "@/components/OnboardingSurvey";
import { MovieRating } from "@/components/MovieRating";
import { Dashboard } from "@/components/Dashboard";

export function OnboardingFlow({ user }: { user: any }) {
  const [moviesToRate, setMoviesToRate] = useState<string[] | null>(null);
  const [step, setStep] = useState<"survey" | "rating" | "dashboard">(() => {
    if (user?.onboardingStep === "NEEDS_INITIAL_SURVEY") return "survey";
    if (user?.onboardingStep === "NEEDS_MOVIE_RATINGS") return "rating";
    return "dashboard";
  });

  // If moviesToRate is set, always show rating step
  if (
    step === "survey" ||
    (user?.onboardingStep === "NEEDS_INITIAL_SURVEY" && !moviesToRate)
  ) {
    return (
      <OnboardingSurvey
        onMoviesGenerated={(movies) => {
          setMoviesToRate(movies);
          setStep("rating");
        }}
      />
    );
  }

  if (
    step === "rating" ||
    moviesToRate ||
    user?.onboardingStep === "NEEDS_MOVIE_RATINGS"
  ) {
    const preferences = (user.preferences as any) || {};
    const movies = moviesToRate || preferences.dynamicMoviesToRate || [];
    return (
      <MovieRating
        moviesToRate={movies}
        onComplete={() => setStep("dashboard")}
      />
    );
  }

  // Default: show dashboard
  return <Dashboard initialMovies={user?.movies || []} />;
}
