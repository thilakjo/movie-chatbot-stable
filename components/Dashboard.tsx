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
import { MovieWithDetails, Recommendation } from "@/lib/types";

const FEEDBACK_QUESTIONS = [
  { q: "How was the pacing?", o: ["Too slow", "Just right", "Too fast"] },
  {
    q: "Did you like the ending?",
    o: ["Loved it", "It was okay", "Didn't like it"],
  },
  { q: "Would you recommend this?", o: ["Yes", "Maybe", "No"] },
];
const ITEMS_PER_PAGE = 8;

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

  // This function now handles errors gracefully
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    setRecommendations([]); // Clear old recommendations
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
        setMovies(data.userMovies || []);
      } else {
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
    } finally {
      setLoading(false);
    }
  };

  const handleListAction = async (
    title: string,
    status: "WATCHLIST" | "WATCHED" | "DISMISSED",
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

  const handleRemove = async (movieTitle: string) => {
    setMovies((prev) => prev.filter((m) => m.movieTitle !== movieTitle));
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieTitle, status: "REMOVED" }),
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
        <div className="mb-12 px-12">
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
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleListAction(rec.title, "WATCHLIST");
                      }}
                      size="sm"
                      className="w-full text-xs h-7"
                    >
                      Watchlist
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsWatched(rec);
                      }}
                      size="sm"
                      className="w-full text-xs h-7"
                    >
                      Watched
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleListAction(rec.title, "DISMISSED");
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 bg-black/50 border-white/50 text-white hover:bg-black/70"
                    >
                      Dismiss
                    </Button>
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
              <MovieCard
                key={movie.id}
                title={movie.movieTitle}
                initialData={movie}
                onRemove={() => handleRemove(movie.movieTitle)}
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
                <MovieCard
                  key={movie.id}
                  title={movie.movieTitle}
                  initialData={movie}
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
