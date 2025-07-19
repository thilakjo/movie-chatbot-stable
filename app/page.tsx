import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Survey } from "@/components/Survey";
import { Dashboard } from "@/components/Dashboard";
import { MovieRating } from "@/components/MovieRating";

const prisma = new PrismaClient();

const OnboardingFlow = ({ step }: { step: string | undefined }) => {
  switch (step) {
    case "NEEDS_INITIAL_SURVEY":
      return <Survey />;
    case "NEEDS_MOVIE_RATINGS":
      return <MovieRating />;
    default:
      return <Dashboard movies={[]} />;
  }
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">AI Movie Recommender</h1>
          <SignInButton />
        </div>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: { movies: true },
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
        <Dashboard movies={user?.movies ?? []} />
      ) : (
        <OnboardingFlow step={user?.onboardingStep} />
      )}
    </main>
  );
}
