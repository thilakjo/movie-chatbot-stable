// components/Dashboard.tsx (Final Version)

"use client";
import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { MovieCard } from "./MovieCard"; // Import our new component

interface Movie {
  id: string;
  movieTitle: string;
  status: string; // Changed from "WATCHLIST" | "WATCHED" to string
  posterUrl?: string;
  order?: number;
}
interface Recommendation {
  title: string;
}
const FEEDBACK_QUESTIONS = [
  { q: "How was the pacing?", o: ["Too slow", "Just right", "Too fast"] },
  {
    q: "Did you like the ending?",
    o: ["Loved it", "It was okay", "Didn't like it"],
  },
  { q: "Would you recommend this?", o: ["Yes", "Maybe", "No"] },
];

export function Dashboard({ initialMovies }: { initialMovies: Movie[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMovie, setFeedbackMovie] = useState<Recommendation | null>(
    null
  );
  const [feedback, setFeedback] = useState<{ q: string; a: string }[]>([]);
  const [feedbackStep, setFeedbackStep] = useState(0);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommend", { method: "POST" });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setMovies(data.userMovies || []); // Also update existing lists
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleListAction = async (
    title: string,
    status: "WATCHLIST" | "WATCHED",
    feedbackPayload?: any
  ) => {
    setRecommendations((prev) => prev.filter((m) => m.title !== title));
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieTitle: title,
        status,
        feedback: feedbackPayload,
      }),
    });
    fetchRecommendations();
  };

  const handleMarkAsWatched = (rec: Recommendation) => {
    setFeedbackMovie(rec);
    setFeedback([]);
    setFeedbackStep(0);
  };

  const handleFeedbackAnswer = (answer: string) => {
    const currentQuestion = FEEDBACK_QUESTIONS[feedbackStep];
    const newFeedback = [...feedback, { q: currentQuestion.q, a: answer }];
    setFeedback(newFeedback);
    if (feedbackStep < FEEDBACK_QUESTIONS.length - 1) {
      setFeedbackStep(feedbackStep + 1);
    } else {
      handleListAction(feedbackMovie!.title, "WATCHED", newFeedback);
      setFeedbackMovie(null);
    }
  };

  const watchlist = movies.filter((m) => m.status === "WATCHLIST");
  const watched = movies.filter((m) => m.status === "WATCHED");

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn pb-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Your Movie Dashboard</h1>
      </div>

      {loading && (
        <p className="text-center text-gray-500 my-8">
          Finding your recommendations...
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Recommended For You
          </h2>
          <Swiper
            modules={[Navigation, Pagination, A11y]}
            spaceBetween={20}
            slidesPerView={2}
            navigation
            pagination={{ clickable: true }}
            breakpoints={{
              640: { slidesPerView: 3 },
              768: { slidesPerView: 4 },
              1024: { slidesPerView: 5 },
            }}
          >
            {recommendations.map((rec) => (
              <SwiperSlide key={rec.title} className="pb-12">
                <MovieCard title={rec.title}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleListAction(rec.title, "WATCHLIST")}
                      className="flex-1 text-xs bg-green-500 text-white py-2 px-2 rounded hover:bg-green-600 transition-colors"
                    >
                      Watchlist
                    </button>
                    <button
                      onClick={() => handleMarkAsWatched(rec)}
                      className="flex-1 text-xs bg-purple-500 text-white py-2 px-2 rounded hover:bg-purple-600 transition-colors"
                    >
                      Watched
                    </button>
                  </div>
                </MovieCard>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <section>
          <h2 className="text-2xl font-bold mb-4">
            My Watchlist ({watchlist.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {watchlist.map((movie) => (
              <MovieCard key={movie.id} title={movie.movieTitle} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">
            Watched Movies ({watched.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {watched.map((movie) => (
              <MovieCard key={movie.id} title={movie.movieTitle} />
            ))}
          </div>
        </section>
      </div>

      <button
        onClick={fetchRecommendations}
        disabled={loading}
        className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-primary text-white rounded-full shadow-2xl hover:bg-primary-hover font-semibold flex items-center gap-2 transition-transform duration-300 active:scale-95"
      >
        <span>{loading ? "Finding..." : "Get New Recommendations"}</span>
      </button>

      {feedbackMovie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl text-gray-900">
            <h3 className="text-lg font-bold mb-2 text-center">
              Feedback for {feedbackMovie.title}
            </h3>
            <p className="mb-4 font-semibold text-center">
              {FEEDBACK_QUESTIONS[feedbackStep].q}
            </p>
            <div className="flex flex-col gap-2">
              {FEEDBACK_QUESTIONS[feedbackStep].o.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleFeedbackAnswer(opt)}
                  className="w-full text-center p-2 rounded bg-gray-100 hover:bg-primary hover:text-white transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
