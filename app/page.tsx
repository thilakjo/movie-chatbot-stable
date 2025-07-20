// app/page.tsx (Corrected)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Survey } from "@/components/Survey";
import { Dashboard } from "@/components/Dashboard";
import { MovieRating } from "@/components/MovieRating";
import { CasualQuestions } from "@/components/CasualQuestions";

const prisma = new PrismaClient();

const OnboardingFlow = ({ user }: { user: any }) => {
  switch (user?.onboardingStep) {
    case "NEEDS_INITIAL_SURVEY":
      return <Survey />;
    case "NEEDS_MOVIE_RATINGS":
      // Correctly extract the dynamic list from the preferences object
      const moviesToRate = (user.preferences as any)?.dynamicMoviesToRate || [];
      return <MovieRating moviesToRate={moviesToRate} />;
    case "NEEDS_CASUAL_QUESTIONS":
      return <CasualQuestions />;
    default:
      // Fallback for returning users or completed onboarding
      return <Dashboard initialMovies={user?.movies || []} />;
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

  const isOnboardingComplete = user?.onboardingStep === "ONBOARDING_COMPLETE";

  return (
    <main className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <p className="text-lg">
          Welcome, <span className="font-semibold">{session.user.name}</span>!
        </p>
        <SignOutButton />
      </div>

      {isOnboardingComplete ? (
        <Dashboard initialMovies={user?.movies ?? []} />
      ) : (
        <OnboardingFlow user={user} />
      )}
    </main>
  );
}
