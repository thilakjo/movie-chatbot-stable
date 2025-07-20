// app/page.tsx (Fixed Version)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Survey } from "@/components/Survey";
import Dashboard from "@/components/Dashboard";
import { MovieRating } from "@/components/MovieRating";
import { CasualQuestions } from "@/components/CasualQuestions";

const prisma = new PrismaClient();

const OnboardingFlow = ({ user }: { user: any }) => {
  switch (user?.onboardingStep) {
    case "NEEDS_INITIAL_SURVEY":
      return <Survey />;
    case "NEEDS_MOVIE_RATINGS":
      // Extract the dynamic movies from preferences
      const preferences = (user.preferences as any) || {};
      const moviesToRate = preferences.dynamicMoviesToRate || [];
      console.log("Movies to rate:", moviesToRate);
      return <MovieRating moviesToRate={moviesToRate} />;
    case "NEEDS_CASUAL_QUESTIONS":
      return <CasualQuestions />;
    case "ONBOARDING_COMPLETE":
    default:
      // For returning users who completed onboarding
      const watchlist =
        user?.movies?.filter((m: any) => m.status === "watchlist") || [];
      const watched =
        user?.movies?.filter((m: any) => m.status === "watched") || [];
      return (
        <Dashboard
          watchlist={watchlist}
          watched={watched}
          onRefresh={() => {
            // This will be handled by the client component
            // The Dashboard component will handle its own refresh logic
          }}
        />
      );
  }
};

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
