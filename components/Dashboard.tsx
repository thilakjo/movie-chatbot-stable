// components/Dashboard.tsx
"use client";
import { useState, useRef } from "react";
import { Chat } from "./Chat";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const FALLBACK_POSTER = "/fallback-poster.png";

interface Movie {
  id: string;
  movieTitle: string;
  status: string;
  posterUrl?: string;
}

interface DashboardProps {
  movies: Movie[];
}

interface Recommendation {
  title: string;
  posterUrl?: string;
}

const FEEDBACK_QUESTIONS = [
  {
    question: "How was the pacing?",
    options: ["Too slow", "Just right", "Too fast"],
  },
  {
    question: "Did you like the ending?",
    options: ["Loved it", "It was okay", "Didn't like it"],
  },
  {
    question: "Would you recommend this movie?",
    options: ["Yes", "Maybe", "No"],
  },
  {
    question: "Did the genre fit your taste?",
    options: ["Perfectly", "Somewhat", "Not at all"],
  },
  {
    question: "Would you rewatch this movie?",
    options: ["Absolutely", "Maybe", "No"],
  },
];

export function Dashboard({ movies }: DashboardProps) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMovie, setFeedbackMovie] = useState<Recommendation | null>(
    null
  );
  const [feedback, setFeedback] = useState<string[]>([]);
  const [feedbackStep, setFeedbackStep] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const watchlist = movies.filter((m) => m.status === "WATCHLIST");
  const watched = movies.filter((m) => m.status === "WATCHED");

  // Fetch recommendations from the backend
  const handleGetRecommendations = async () => {
    setLoading(true);
    setShowRecommendations(true);
    const res = await fetch("/api/recommend", { method: "POST" });
    const data = await res.json();
    setRecommendations(data.recommendations || []);
    setLoading(false);
  };

  // Add to Watchlist
  const handleAddToWatchlist = async (rec: Recommendation) => {
    setActionLoading(true);
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieTitle: rec.title, status: "WATCHLIST" }),
    });
    setRecommendations((prev) => prev.filter((m) => m.title !== rec.title));
    setActionLoading(false);
  };

  // Mark as Watched (show feedback)
  const handleMarkAsWatched = (rec: Recommendation) => {
    setFeedbackMovie(rec);
    setFeedback([]);
    setFeedbackStep(0);
  };

  // Handle feedback answer
  const handleFeedbackAnswer = (answer: string) => {
    setFeedback((prev) => [...prev, answer]);
    if (feedbackStep < FEEDBACK_QUESTIONS.length - 1) {
      setFeedbackStep(feedbackStep + 1);
    } else {
      submitFeedback();
    }
  };

  // Submit feedback to backend
  const submitFeedback = async () => {
    if (!feedbackMovie) return;
    setActionLoading(true);
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieTitle: feedbackMovie.title,
        status: "WATCHED",
        feedback,
      }),
    });
    setRecommendations((prev) =>
      prev.filter((m) => m.title !== feedbackMovie.title)
    );
    setFeedbackMovie(null);
    setFeedback([]);
    setFeedbackStep(0);
    setActionLoading(false);
  };

  // Get more recommendations
  const handleMoreRecommendations = () => {
    setShowRecommendations(false);
    setRecommendations([]);
    handleGetRecommendations();
  };

  // Helper for poster fallback
  const renderPoster = (posterUrl?: string, alt?: string) => (
    <img
      src={posterUrl || FALLBACK_POSTER}
      alt={alt || "Movie Poster"}
      className="w-20 h-28 object-cover rounded shadow border border-gray-200 bg-gray-100"
      onError={(e) => {
        (e.target as HTMLImageElement).src = FALLBACK_POSTER;
      }}
    />
  );

  return (
    <div className="max-w-5xl mx-auto px-2">
      <h2 className="text-3xl font-bold text-center mb-8">
        Your Movie Dashboard
      </h2>
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Watchlist Grid */}
        <div className="flex-1 bg-gray-100 rounded-lg p-6 shadow">
          <h3 className="text-xl font-semibold mb-4">My Watchlist</h3>
          {watchlist.length === 0 ? (
            <p className="text-gray-500">Your watchlist is empty.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((movie) => (
                <div
                  key={movie.id}
                  className="flex flex-col items-center bg-white rounded-lg p-2 shadow hover:scale-105 transition-transform duration-200"
                >
                  {renderPoster(movie.posterUrl, movie.movieTitle)}
                  <span className="mt-2 text-sm text-center font-medium line-clamp-2">
                    {movie.movieTitle}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Watched Grid */}
        <div className="flex-1 bg-gray-100 rounded-lg p-6 shadow">
          <h3 className="text-xl font-semibold mb-4">Watched Movies</h3>
          {watched.length === 0 ? (
            <p className="text-gray-500">
              You haven't marked any movies as watched yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watched.map((movie) => (
                <div
                  key={movie.id}
                  className="flex flex-col items-center bg-white rounded-lg p-2 shadow hover:scale-105 transition-transform duration-200"
                >
                  {renderPoster(movie.posterUrl, movie.movieTitle)}
                  <span className="mt-2 text-sm text-center font-medium line-clamp-2">
                    {movie.movieTitle}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="text-center mt-8">
        {!showRecommendations ? (
          <button
            onClick={handleGetRecommendations}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-600 font-semibold text-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={loading}
          >
            {loading ? "Loading..." : "Ready for a new recommendation?"}
          </button>
        ) : (
          <div>
            <h3 className="text-2xl font-semibold mb-6">Recommended for you</h3>
            {/* Swiper Carousel */}
            <Swiper
              spaceBetween={24}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              modules={[Navigation, Pagination, A11y]}
              className="w-full max-w-md mx-auto mb-6"
            >
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <SwiperSlide key={i}>
                      <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center animate-pulse">
                        <div className="w-40 h-60 bg-gray-200 mb-2 rounded" />
                        <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
                        <div className="flex gap-2 w-full">
                          <div className="h-8 w-1/2 bg-gray-200 rounded" />
                          <div className="h-8 w-1/2 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </SwiperSlide>
                  ))
                : recommendations.map((rec) => (
                    <SwiperSlide key={rec.title}>
                      <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center border border-gray-100 animate-fadeIn">
                        {renderPoster(rec.posterUrl, rec.title)}
                        <div className="font-bold text-lg mb-2 text-center line-clamp-2 min-h-[2.5rem]">
                          {rec.title}
                        </div>
                        <div className="flex gap-2 w-full">
                          <button
                            className="flex-1 px-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all active:scale-95"
                            onClick={() => handleAddToWatchlist(rec)}
                            disabled={actionLoading}
                          >
                            Add to Watchlist
                          </button>
                          <button
                            className="flex-1 px-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-all active:scale-95"
                            onClick={() => handleMarkAsWatched(rec)}
                            disabled={actionLoading}
                          >
                            Mark as Watched
                          </button>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
            </Swiper>
            {recommendations.length === 0 && !loading && (
              <div className="mb-4 text-gray-500">
                No more recommendations. Try again!
              </div>
            )}
            <button
              onClick={handleMoreRecommendations}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-500 font-semibold text-lg transition-all duration-200 active:scale-95 mt-4"
              disabled={loading}
            >
              Get More Recommendations
            </button>
          </div>
        )}
        {/* Feedback Modal */}
        {feedbackMovie && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
              <h4 className="text-xl font-bold mb-4 text-center">
                Feedback for {feedbackMovie.title}
              </h4>
              <div className="mb-4">
                <div className="font-semibold mb-2 text-center">
                  {FEEDBACK_QUESTIONS[feedbackStep].question}
                </div>
                <div className="flex flex-col gap-2">
                  {FEEDBACK_QUESTIONS[feedbackStep].options.map((opt) => (
                    <button
                      key={opt}
                      className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-blue-100 text-left border border-gray-200 active:scale-95"
                      onClick={() => handleFeedbackAnswer(opt)}
                      disabled={actionLoading}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 w-full font-semibold active:scale-95"
                onClick={() => setFeedbackMovie(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
