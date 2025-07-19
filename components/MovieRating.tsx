"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// A list of popular movies to rate
const moviesToRate = [
  "The Shawshank Redemption",
  "The Godfather",
  "The Dark Knight",
  "Pulp Fiction",
  "The Lord of the Rings: The Return of the King",
  "Forrest Gump",
  "Inception",
  "Fight Club",
  "The Matrix",
  "Interstellar",
];

type Ratings = {
  [key: string]: "Good" | "Okay" | "Didn't like" | "Not watched";
};

export function MovieRating() {
  const [ratings, setRatings] = useState<Ratings>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRatingChange = (movie: string, rating: Ratings[string]) => {
    setRatings((prev) => ({
      ...prev,
      [movie]: rating,
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    // This is the API route we will create next
    await fetch("/api/rate-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings }),
    });
    // Refresh the page to load the next onboarding step
    router.refresh();
  };

  const allMoviesRated = Object.keys(ratings).length === moviesToRate.length;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md text-gray-800">
      <h2 className="text-2xl font-bold mb-2">Rate Some Movies</h2>
      <p className="mb-6 text-gray-600">
        This will give us a great starting point for your recommendations.
      </p>
      <div className="space-y-4">
        {moviesToRate.map((movie) => (
          <div key={movie} className="p-4 border rounded-md">
            <p className="font-semibold mb-2">{movie}</p>
            <div className="flex flex-wrap gap-4">
              {["Good", "Okay", "Didn't like", "Not watched"].map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={movie}
                    value={option}
                    checked={ratings[movie] === option}
                    onChange={() =>
                      handleRatingChange(movie, option as Ratings[string])
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={isLoading || !allMoviesRated}
        className="w-full mt-6 py-2 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Submit Ratings"}
      </button>
    </div>
  );
}
