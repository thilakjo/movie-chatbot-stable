"use client";
import { useState, useEffect } from "react";
import { MovieCard } from "./MovieCard";
import MovieSearch from "./MovieSearch";

interface Movie {
  id: string;
  userId: string;
  movieTitle: string;
  status: string;
  posterUrl: string | null;
  year: number | null;
  director: string | null;
  imdbRating: string | null;
  leadActor: string | null;
  rating: number | null;
  feedback: any;
  order: number;
  genres: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardProps {
  watchlist: Movie[];
  watched: Movie[];
  onRefresh: () => void;
}

export default function Dashboard({
  watchlist,
  watched,
  onRefresh,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"watchlist" | "watched">(
    "watchlist"
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleMovieAdded = (movieTitle: string) => {
    console.log(`Movie added to watched: ${movieTitle}`);
    // Refresh the dashboard to show updated data
    onRefresh();
  };

  const handleMoveToWatched = async (movieId: string, movieTitle: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/move-to-watched", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ movieId }),
      });

      if (response.ok) {
        console.log(`Moved ${movieTitle} to watched`);
        onRefresh();
      } else {
        console.error("Failed to move movie to watched");
      }
    } catch (error) {
      console.error("Error moving movie:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToWatchlist = async (movieId: string, movieTitle: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/move-to-watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ movieId }),
      });

      if (response.ok) {
        console.log(`Moved ${movieTitle} to watchlist`);
        onRefresh();
      } else {
        console.error("Failed to move movie to watchlist");
      }
    } catch (error) {
      console.error("Error moving movie:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with Search */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Your Movie Dashboard
        </h1>

        {/* Search Bar */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Add Movies to Watched
          </h2>
          <div className="max-w-md">
            <MovieSearch onMovieAdded={handleMovieAdded} />
          </div>
        </div>

        {/* Simple Stats */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📊 Your Movie Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Watchlist:</span> {watchlist.length}
            </div>
            <div>
              <span className="font-medium">Watched:</span> {watched.length}
            </div>
            <div>
              <span className="font-medium">Total Movies:</span>{" "}
              {watchlist.length + watched.length}
            </div>
            <div>
              <span className="font-medium">Status:</span> Active
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("watchlist")}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === "watchlist"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Watchlist ({watchlist.length})
        </button>
        <button
          onClick={() => setActiveTab("watched")}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === "watched"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Watched ({watched.length})
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "watchlist" && (
          <div>
            {watchlist.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🎬</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Your watchlist is empty
                </h3>
                <p className="text-gray-500">
                  Get new recommendations to start building your watchlist!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {watchlist.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    title={movie.movieTitle}
                    initialData={movie}
                    onMarkAsWatched={() =>
                      handleMoveToWatched(movie.id, movie.movieTitle)
                    }
                    onRemove={() =>
                      handleMoveToWatchlist(movie.id, movie.movieTitle)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "watched" && (
          <div>
            {watched.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No movies watched yet
                </h3>
                <p className="text-gray-500">
                  Use the search above or flip movie cards to mark them as
                  watched!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {watched.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    title={movie.movieTitle}
                    initialData={movie}
                    onMarkAsWatched={() =>
                      handleMoveToWatched(movie.id, movie.movieTitle)
                    }
                    onRemove={() =>
                      handleMoveToWatchlist(movie.id, movie.movieTitle)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Updating...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
