// app/page.tsx (Static Version - No Database)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";

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

  // Static content for authenticated users - no database calls
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
          Static Dashboard
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📊 Static Status
          </h3>
          <p className="text-gray-700">
            This is a static version without database calls. Server error should
            be resolved.
          </p>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Static Dashboard Working
          </h3>
          <p className="text-gray-500">
            If you see this, the server error is not with the components.
          </p>
        </div>
      </div>
    </main>
  );
}
