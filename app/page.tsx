// app/page.tsx (Working Version with Database)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Survey } from "@/components/Survey";
import { MovieRating } from "@/components/MovieRating";
import { CasualQuestions } from "@/components/CasualQuestions";

const prisma = new PrismaClient();

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
    // Try to fetch user with timeout
    const user = await Promise.race([
      prisma.user.findUnique({
        where: { id: (session.user as any).id },
        select: {
          id: true,
          name: true,
          onboardingStep: true,
          preferences: true,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 5000)
      ),
    ]);

    if (!user) {
      return (
        <main className="p-4 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <p className="text-lg">
              Welcome,{" "}
              <span className="font-semibold">{session.user.name}</span>!
            </p>
            <SignOutButton />
          </div>
          <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome!</h1>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                🎬 Getting Started
              </h3>
              <p className="text-gray-700">
                Let's set up your movie preferences!
              </p>
            </div>
            <Survey />
          </div>
        </main>
      );
    }

    // Working onboarding flow
    let content;
    const userData = user as any;
    switch (userData.onboardingStep) {
      case "NEEDS_INITIAL_SURVEY":
        content = <Survey />;
        break;
      case "NEEDS_MOVIE_RATINGS":
        const preferences = (userData.preferences as any) || {};
        const moviesToRate = preferences.dynamicMoviesToRate || [];
        content = <MovieRating moviesToRate={moviesToRate} />;
        break;
      case "NEEDS_CASUAL_QUESTIONS":
        content = <CasualQuestions />;
        break;
      case "ONBOARDING_COMPLETE":
      default:
        content = (
          <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Your Movie Dashboard
            </h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                ✅ Dashboard Working
              </h3>
              <p className="text-gray-700">
                Database connection successful! Onboarding step:{" "}
                {userData.onboardingStep}
              </p>
            </div>
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Dashboard Ready
              </h3>
              <p className="text-gray-500">
                The system is working correctly with database!
              </p>
            </div>
          </div>
        );
        break;
    }

    return (
      <main className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-lg">
            Welcome, <span className="font-semibold">{session.user.name}</span>!
          </p>
          <SignOutButton />
        </div>
        {content}
      </main>
    );
  } catch (error) {
    console.error("Database error:", error);

    // Fallback to static content if database fails
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
            Database Connection Issue
          </h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              ⚠️ Database Unavailable
            </h3>
            <p className="text-gray-700">
              The database is temporarily unavailable. Please try again in a
              moment.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Error: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔧</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              System Maintenance
            </h3>
            <p className="text-gray-500">
              We're working on fixing the database connection.
            </p>
          </div>
        </div>
      </main>
    );
  }
}
