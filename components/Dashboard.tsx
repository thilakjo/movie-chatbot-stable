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

interface Movie {
  id: string;
  movieTitle: string;
  status: string;
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

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommend", { method: "POST" });
      const data = await res.json();
      setMovies(
        data.userMovies.sort(
          (a: Movie, b: Movie) => (a.order ?? 0) - (b.order ?? 0)
        ) || []
      );
      setRecommendations(data.recommendations || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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
      fetchAllData();
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

  const watchlist = movies.filter((m) => m.status === "WATCHLIST");
  const watched = movies.filter((m) => m.status === "WATCHED");

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn pb-24">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Your Movie Dashboard
      </h1>

      {loading && !recommendations.length && (
        <p className="text-center text-gray-500 my-8">
          Finding your first recommendations...
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Recommended For You
          </h2>
          <Carousel className="w-full" opts={{ align: "start", loop: true }}>
            <CarouselContent className="-ml-4">
              {recommendations.map((rec) => (
                <CarouselItem
                  key={rec.title}
                  className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/5"
                >
                  <MovieCard title={rec.title}>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex flex-col gap-2 p-2">
                      <Button
                        onClick={() => handleListAction(rec.title, "WATCHLIST")}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        Watchlist
                      </Button>
                      <Button
                        onClick={() => handleMarkAsWatched(rec)}
                        size="sm"
                        className="w-full"
                      >
                        Watched
                      </Button>
                      <Button
                        onClick={() => handleListAction(rec.title, "DISMISSED")}
                        size="sm"
                        variant="ghost"
                        className="w-full"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </MovieCard>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="ml-16" />
            <CarouselNext className="mr-16" />
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
            {watchlist.map((movie) => (
              <MovieCard key={movie.id} title={movie.movieTitle} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="watched" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {watched.map((movie) => (
              <MovieCard key={movie.id} title={movie.movieTitle} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Button
        onClick={fetchAllData}
        disabled={loading}
        className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-8 h-8 ${loading ? "animate-spin" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001a.75.75 0 0 1 .588.821a12.025 12.025 0 0 1-2.087 7.233a12.026 12.026 0 0 1-7.233 2.087a.75.75 0 0 1-.821-.588v-.001h4.992a.75.75 0 0 0 0-1.5H9.75a.75.75 0 0 1-.75-.75V3.75a.75.75 0 0 1 1.5 0v2.254a12.023 12.023 0 0 1 6.273-1.658Z"
          />
        </svg>
      </Button>

      <Dialog
        open={!!feedbackMovie}
        onOpenChange={(isOpen) => !isOpen && setFeedbackMovie(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center mb-4">
              Feedback for {feedbackMovie?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center">
            <p className="mb-4 font-semibold">
              {FEEDBACK_QUESTIONS[feedbackStep].q}
            </p>
            <div className="flex flex-col gap-2">
              {FEEDBACK_QUESTIONS[feedbackStep].o.map((opt) => (
                <Button
                  key={opt}
                  variant="outline"
                  onClick={() => handleFeedbackAnswer(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
