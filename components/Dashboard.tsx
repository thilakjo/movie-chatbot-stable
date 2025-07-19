// components/Dashboard.tsx
"use client";
import { useState } from "react";
import { Chat } from "./Chat";

interface Movie {
  id: string;
  movieTitle: string;
  status: string;
}

interface DashboardProps {
  movies: Movie[];
}

export function Dashboard({ movies }: DashboardProps) {
  const [showChat, setShowChat] = useState(false);

  const watchlist = movies.filter((m) => m.status === "WATCHLIST");
  const watched = movies.filter((m) => m.status === "WATCHED");

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-8">
        Your Movie Dashboard
      </h2>
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-1 bg-gray-100 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">My Watchlist</h3>
          {watchlist.length === 0 ? (
            <p className="text-gray-500">Your watchlist is empty.</p>
          ) : (
            <ul>
              {watchlist.map((movie) => (
                <li key={movie.id}>{movie.movieTitle}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex-1 bg-gray-100 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">Watched Movies</h3>
          {watched.length === 0 ? (
            <p className="text-gray-500">
              You haven't marked any movies as watched yet.
            </p>
          ) : (
            <ul>
              {watched.map((movie) => (
                <li key={movie.id}>{movie.movieTitle}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="text-center mt-8">
        {!showChat ? (
          <button
            onClick={() => setShowChat(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ready for a new recommendation?
          </button>
        ) : (
          <Chat />
        )}
      </div>
    </div>
  );
}
