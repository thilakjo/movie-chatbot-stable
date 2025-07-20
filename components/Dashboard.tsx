"use client";
import { useState, useEffect } from "react";
import { MovieCard } from "./MovieCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingAnimation } from "./LoadingAnimation";
import { MovieWithDetails } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

// Local Recommendation type for dashboard
type Recommendation = {
  title: string;
  posterUrl?: string;
  year?: number;
  director?: string;
  imdbRating?: string;
  leadActor?: string;
  explanation?: string;
};

const FEEDBACK_QUESTIONS = [
  { q: "How was the pacing?", o: ["Too slow", "Just right", "Too fast"] },
  {
    q: "Did you like the ending?",
    o: ["Loved it", "It was okay", "Didn't like it"],
  },
  { q: "Would you recommend this?", o: ["Yes", "Maybe", "No"] },
];
const ITEMS_PER_PAGE = 8;

// 5-star rating widget for feedback
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          className={`text-xl transition-colors ${
            star <= value ? "text-yellow-400" : "text-gray-300"
          }`}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Wrapper for watched card to use hooks
function WatchedCardWrapper({
  movie,
  onRemove,
}: {
  movie: any;
  onRemove: () => void;
}) {
  const [star, setStar] = useState<number>(movie.rating || 0);
  const [review, setReview] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <MovieCard
      key={movie.id}
      title={movie.movieTitle}
      initialData={movie}
      onRemove={onRemove}
      isFlippable
      backContent={
        <div className="flex flex-col h-full justify-between">
          <div>
            <h4 className="font-bold text-base mb-2">{movie.movieTitle}</h4>
            <div className="text-xs space-y-1 mb-2">
              <p>
                <strong>Year:</strong> {movie.year || "N/A"}
              </p>
              <p>
                <strong>Director:</strong> {movie.director || "N/A"}
              </p>
              <p>
                <strong>Starring:</strong> {movie.leadActor || "N/A"}
              </p>
              <p>
                <strong>IMDb:</strong> {movie.imdbRating || "N/A"}
              </p>
            </div>
            <div className="mb-2">
              <span className="font-semibold">Your Rating:</span>
              <StarRating value={star} onChange={setStar} />
            </div>
            <textarea
              className="w-full border rounded p-1 text-xs"
              placeholder="Write a short review..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            onClick={async (e) => {
              e.stopPropagation();
              setSubmitted(true);
              await fetch("/api/user-movies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  movieTitle: movie.movieTitle,
                  status: "WATCHED",
                  feedback: { rating: star, review },
                }),
              });
            }}
            size="sm"
            className="w-full mt-2"
            disabled={submitted || !star}
          >
            {submitted ? "Saved!" : "Save Review"}
          </Button>
        </div>
      }
    />
  );
}

// Wrapper for watchlist card to use hooks
function WatchlistCardWrapper({
  movie,
  onRemove,
  onMarkAsWatched,
}: {
  movie: any;
  onRemove: () => void;
  onMarkAsWatched: () => void;
}) {
  return (
    <MovieCard
      key={movie.id}
      title={movie.movieTitle}
      initialData={movie}
      onRemove={onRemove}
      onMarkAsWatched={onMarkAsWatched}
      isFlippable
      backContent={
        <div className="flex flex-col h-full justify-between">
          <div>
            <h4 className="font-bold text-base mb-2">{movie.movieTitle}</h4>
            <div className="text-xs space-y-1 mb-2">
              <p>
                <strong>Year:</strong> {movie.year || "N/A"}
              </p>
              <p>
                <strong>Director:</strong> {movie.director || "N/A"}
              </p>
              <p>
                <strong>Starring:</strong> {movie.leadActor || "N/A"}
              </p>
              <p>
                <strong>IMDb:</strong> {movie.imdbRating || "N/A"}
              </p>
            </div>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsWatched();
            }}
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 mt-2"
          >
            Move to Watched
          </Button>
        </div>
      }
    />
  );
}

export function Dashboard({
  initialMovies,
}: {
  initialMovies: MovieWithDetails[];
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMovie, setFeedbackMovie] = useState<Recommendation | null>(
    null
  );
  const [feedback, setFeedback] = useState<{ q: string; a: string }[]>([]);
  const [feedbackStep, setFeedbackStep] = useState(0);
  const [showAll, setShowAll] = useState({ watchlist: false, watched: false });
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // This function now handles errors gracefully and preserves existing movies
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    setRecommendations([]); // Clear old recommendations only

    try {
      const res = await fetch("/api/recommend", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch recommendations.");
      }

      // Handle the new response format
      if (data.error) {
        setError(data.error);
        setRecommendations([]);
        // Don't update movies if there's an error - preserve existing ones
        // Only update if we have new user movies data
        if (data.userMovies && data.userMovies.length > 0) {
          setMovies(
            data.userMovies.sort(
              (a: MovieWithDetails, b: MovieWithDetails) =>
                (a.order ?? 0) - (b.order ?? 0)
            )
          );
        }
      } else {
        // Success case - update both recommendations and movies
        setMovies(
          data.userMovies.sort(
            (a: MovieWithDetails, b: MovieWithDetails) =>
              (a.order ?? 0) - (b.order ?? 0)
          ) || []
        );
        setRecommendations(data.recommendations || []);
      }
    } catch (error: any) {
      console.error("Recommendation error:", error);
      setError(
        error.message || "Failed to get recommendations. Please try again."
      );
      // Don't clear existing movies on error - preserve them
    } finally {
      setLoading(false);
    }
  };

  const handleListAction = async (
    title: string,
    status: "WATCHLIST" | "WATCHED" | "DISMISSED" | "LIKED",
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
    if (status !== "DISMISSED") {
      // Just refresh the user's lists without getting new recommendations
      const res = await fetch("/api/user-movies");
      const data = await res.json();
      setMovies(data.movies || []);
    }
  };

  const handleMarkRecommendationAsWatched = (rec: Recommendation) => {
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

  const handleRemove = async (movieTitle: string) => {
    setMovies((prev) => prev.filter((m) => m.movieTitle !== movieTitle));
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieTitle, status: "REMOVED" }),
    });
  };

  const handleMarkAsWatched = async (movieTitle: string) => {
    // Update local state immediately
    setMovies((prev) =>
      prev.map((m) =>
        m.movieTitle === movieTitle ? { ...m, status: "WATCHED" } : m
      )
    );

    // Update in database
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieTitle, status: "WATCHED" }),
    });
  };

  const watchlist = movies.filter((m) => m.status === "WATCHLIST");
  const watched = movies.filter((m) => m.status === "WATCHED");

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-4 mb-8 flex flex-col md:flex-row justify-center items-center gap-4 border-b">
        <h1 className="text-3xl font-bold">Your Movie Dashboard</h1>
        <Button onClick={fetchAllData} disabled={loading}>
          {loading ? "Finding..." : "Get New Recommendations"}
        </Button>
      </div>

      {loading && <LoadingAnimation />}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error: {error}</p>
          <Button
            onClick={() => setError(null)}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="mb-12 px-2 sm:px-12">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Recommended For You
          </h2>
          <Carousel
            className="w-full"
            opts={{ align: "start", loop: recommendations.length > 5 }}
          >
            <CarouselContent className="-ml-4">
              {recommendations.map((rec) => (
                <CarouselItem
                  key={rec.title}
                  className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/5"
                >
                  <MovieCard title={rec.title} initialData={rec as any}>
                    {/* Overlay for desktop hover or mobile tap */}
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center transition-opacity duration-200 ${
                        isMobile
                          ? activeCard === rec.title
                            ? "opacity-100 z-20"
                            : "opacity-0 pointer-events-none"
                          : "group-hover:opacity-100 opacity-0 sm:opacity-0 sm:group-hover:opacity-100 z-20"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMobile && activeCard !== rec.title)
                          setActiveCard(rec.title);
                      }}
                    >
                      <Card className="w-full shadow-lg border-none bg-white/90 dark:bg-gray-900/90">
                        <CardContent className="flex flex-col gap-2 p-3 sm:p-2">
                          {/* Description/Explanation */}
                          <div className="text-xs text-gray-700 bg-yellow-50 rounded p-2 mb-2 border border-yellow-200">
                            {rec.explanation && rec.explanation.length > 10
                              ? rec.explanation
                              : `Why this movie? This is a top pick based on your preferences, ratings, and vibe check!`}
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleListAction(rec.title, "LIKED");
                              if (isMobile) setActiveCard(null);
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-10 flex items-center justify-center gap-1"
                          >
                            <span role="img" aria-label="Like">
                              ❤️
                            </span>{" "}
                            Like
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleListAction(rec.title, "WATCHLIST");
                              if (isMobile) setActiveCard(null);
                            }}
                            size="sm"
                            className="w-full text-xs h-10"
                          >
                            Watchlist
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRecommendationAsWatched(rec);
                              if (isMobile) setActiveCard(null);
                            }}
                            size="sm"
                            className="w-full text-xs h-10"
                          >
                            Watched
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleListAction(rec.title, "DISMISSED");
                              if (isMobile) setActiveCard(null);
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-10 bg-black/50 border-white/50 text-white hover:bg-black/70"
                          >
                            Dismiss
                          </Button>
                          {/* Google it button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              const query = encodeURIComponent(
                                rec.title + (rec.year ? ` ${rec.year}` : "")
                              );
                              window.open(
                                `https://www.google.com/search?q=${query}`,
                                "_blank"
                              );
                            }}
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs h-10"
                          >
                            Google it
                          </Button>
                          {isMobile && (
                            <Button
                              onClick={() => setActiveCard(null)}
                              size="sm"
                              variant="ghost"
                              className="w-full text-xs h-8 mt-1"
                            >
                              Close
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </MovieCard>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      <Tabs defaultValue="watchlist" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="watchlist">
            My Watchlist ({watchlist.length})
          </TabsTrigger>
          <TabsTrigger value="watched">
            Watched Movies ({watched.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="watchlist" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {(showAll.watchlist
              ? watchlist
              : watchlist.slice(0, ITEMS_PER_PAGE)
            ).map((movie) => (
              <WatchlistCardWrapper
                key={movie.id}
                movie={movie}
                onRemove={() => handleRemove(movie.movieTitle)}
                onMarkAsWatched={() => handleMarkAsWatched(movie.movieTitle)}
              />
            ))}
          </div>
          {watchlist.length > ITEMS_PER_PAGE && (
            <Button
              variant="link"
              onClick={() =>
                setShowAll((p) => ({ ...p, watchlist: !p.watchlist }))
              }
              className="mt-4"
            >
              {showAll.watchlist
                ? "Show Less"
                : `Show ${watchlist.length - ITEMS_PER_PAGE} More`}
            </Button>
          )}
        </TabsContent>
        <TabsContent value="watched" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {(showAll.watched ? watched : watched.slice(0, ITEMS_PER_PAGE)).map(
              (movie) => (
                <WatchedCardWrapper
                  key={movie.id}
                  movie={movie}
                  onRemove={() => handleRemove(movie.movieTitle)}
                />
              )
            )}
          </div>
          {watched.length > ITEMS_PER_PAGE && (
            <Button
              variant="link"
              onClick={() => setShowAll((p) => ({ ...p, watched: !p.watched }))}
              className="mt-4"
            >
              {showAll.watched
                ? "Show Less"
                : `Show ${watched.length - ITEMS_PER_PAGE} More`}
            </Button>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!feedbackMovie}
        onOpenChange={() => setFeedbackMovie(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              How was &quot;{feedbackMovie?.title}&quot;?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-lg">{FEEDBACK_QUESTIONS[feedbackStep].q}</p>
            <div className="flex flex-col gap-2">
              {FEEDBACK_QUESTIONS[feedbackStep].o.map((option) => (
                <Button
                  key={option}
                  onClick={() => handleFeedbackAnswer(option)}
                  variant="outline"
                  className="justify-start"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
