// app/page.tsx (Minimal Version to Fix Server Error)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Survey } from "@/components/Survey";
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
      // For returning users who completed onboarding - use simple fallback
      return (
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Your Movie Dashboard
          </h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              📊 Dashboard Status
            </h3>
            <p className="text-gray-700">
              Dashboard is loading... Please refresh the page.
            </p>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Dashboard Coming Soon
            </h3>
            <p className="text-gray-500">
              The dashboard is being updated. Please try again in a moment.
            </p>
          </div>
        </div>
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

  try {
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
  } catch (error) {
    console.error("Page error:", error);
    return (
      <main className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-lg">
            Welcome, <span className="font-semibold">{session.user.name}</span>!
          </p>
          <SignOutButton />
        </div>

        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Error Loading Dashboard
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              ⚠️ Error
            </h3>
            <p className="text-gray-700">
              There was an error loading your dashboard. Please try refreshing
              the page.
            </p>
          </div>
        </div>
      </main>
    );
  }
}
