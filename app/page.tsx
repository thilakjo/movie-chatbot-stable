// app/page.tsx (Test Survey Component)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Survey } from "@/components/Survey";

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
    // Minimal user fetch
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        name: true,
        onboardingStep: true,
        preferences: true,
      },
    });

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
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              User Not Found
            </h1>
            <p className="text-gray-600">
              User profile not found. Please try signing in again.
            </p>
          </div>
        </main>
      );
    }

    // Simple onboarding flow - test Survey component
    let content;
    switch (user.onboardingStep) {
      case "NEEDS_INITIAL_SURVEY":
        content = <Survey />;
        break;
      case "NEEDS_MOVIE_RATINGS":
        content = (
          <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Movie Rating Step
            </h1>
            <p className="text-gray-600">
              Movie rating component would load here.
            </p>
          </div>
        );
        break;
      case "NEEDS_CASUAL_QUESTIONS":
        content = (
          <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Casual Questions Step
            </h1>
            <p className="text-gray-600">
              Casual questions component would load here.
            </p>
          </div>
        );
        break;
      case "ONBOARDING_COMPLETE":
      default:
        content = (
          <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Dashboard</h1>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                📊 Dashboard Status
              </h3>
              <p className="text-gray-700">
                Dashboard is working! User onboarding step:{" "}
                {user.onboardingStep}
              </p>
            </div>
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Dashboard Ready
              </h3>
              <p className="text-gray-500">
                The dashboard is working correctly!
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
            <p className="text-sm text-gray-500 mt-2">
              Error details:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      </main>
    );
  }
}
