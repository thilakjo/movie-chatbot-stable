"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function Survey() {
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [favoriteDirector, setFavoriteDirector] = useState("");
  const [mood, setMood] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favoriteGenre, favoriteDirector, mood }),
    });
    setIsLoading(false);
    router.refresh();
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Tell us your taste!</h2>
      <p className="mb-6 text-gray-600">
        This helps us give better recommendations.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="genre"
            className="block text-gray-700 font-semibold mb-2"
          >
            Favorite Genre?
          </label>
          <input
            type="text"
            id="genre"
            value={favoriteGenre}
            onChange={(e) => setFavoriteGenre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Sci-Fi, Comedy"
            required
          />
        </div>
        <div>
          <label
            htmlFor="director"
            className="block text-gray-700 font-semibold mb-2"
          >
            Favorite Director?
          </label>
          <input
            type="text"
            id="director"
            value={favoriteDirector}
            onChange={(e) => setFavoriteDirector(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Christopher Nolan"
            required
          />
        </div>
        <div>
          <label
            htmlFor="mood"
            className="block text-gray-700 font-semibold mb-2"
          >
            What is your current mood for a movie?
          </label>
          <input
            type="text"
            id="mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Something funny"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "Saving..." : "Save Preferences"}
        </button>
      </form>
    </div>
  );
}
