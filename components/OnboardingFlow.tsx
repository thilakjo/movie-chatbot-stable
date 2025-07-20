"use client";
import { useState } from "react";
import { OnboardingSurvey } from "@/components/OnboardingSurvey";
import { MovieRating } from "@/components/MovieRating";
import { Dashboard } from "@/components/Dashboard";

export function OnboardingFlow({ user }: { user: any }) {
  const [moviesToRate, setMoviesToRate] = useState<string[] | null>(null);

  if (user?.onboardingStep === "NEEDS_INITIAL_SURVEY") {
    return (
      <OnboardingSurvey
        onMoviesGenerated={(movies) => setMoviesToRate(movies)}
      />
    );
  }

  if (user?.onboardingStep === "NEEDS_MOVIE_RATINGS" || moviesToRate) {
    const preferences = (user.preferences as any) || {};
    const movies = moviesToRate || preferences.dynamicMoviesToRate || [];
    return <MovieRating moviesToRate={movies} />;
  }

  return <Dashboard initialMovies={user?.movies || []} />;
}
