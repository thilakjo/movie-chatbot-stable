// app/page.tsx (Unified Onboarding Flow)
"use client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Dashboard } from "@/components/Dashboard";
import { MovieRating } from "@/components/MovieRating";
import { OnboardingSurvey } from "@/components/OnboardingSurvey";
import { useState } from "react";

const prisma = new PrismaClient();

function OnboardingFlow({ user }: { user: any }) {
  // Client-side state for onboarding
  const [moviesToRate, setMoviesToRate] = useState<string[] | null>(null);

  if (user?.onboardingStep === "NEEDS_INITIAL_SURVEY") {
    // Show the unified onboarding survey
    return (
      <OnboardingSurvey
        onMoviesGenerated={(movies) => setMoviesToRate(movies)}
      />
    );
  }

  if (user?.onboardingStep === "NEEDS_MOVIE_RATINGS" || moviesToRate) {
    // Show the 5-star movie rating UI for the generated movies
    const preferences = (user.preferences as any) || {};
    const movies = moviesToRate || preferences.dynamicMoviesToRate || [];
    return <MovieRating moviesToRate={movies} />;
  }

  // Onboarding complete or returning user
  return <Dashboard initialMovies={user?.movies || []} />;
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">AI Movie Recommender</h1>
          <SignInButton />
        </div>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      movies: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  return (
    <main className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <p className="text-lg">
          Welcome, <span className="font-semibold">{session.user.name}</span>!
        </p>
        <SignOutButton />
      </div>

      <OnboardingFlow user={user} />
    </main>
  );
}
