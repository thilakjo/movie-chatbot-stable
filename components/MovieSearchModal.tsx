"use client";
import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bookmark, Eye, Search as SearchIcon, Loader2 } from "lucide-react";

export function MovieSearchModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typing, setTyping] = useState(false);

  // Fetch suggestions as user types
  const fetchSuggestions = async (q: string) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/search-movies?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSuggestions(data.movies || []);
    setLoading(false);
  };

  // Debounce typing
  let debounceTimeout: NodeJS.Timeout;
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setTyping(true);
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      fetchSuggestions(val);
      setTyping(false);
    }, 300);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      setSelected((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      setSelected(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length
      );
    } else if (e.key === "Enter" && selected >= 0) {
      handleWatchlist(suggestions[selected]);
    }
  };

  // Actions
  const handleWatchlist = async (movie: string) => {
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieTitle: movie, status: "WATCHLIST" }),
    });
    onOpenChange(false);
  };
  const handleWatched = async (movie: string) => {
    await fetch("/api/user-movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieTitle: movie, status: "WATCHED" }),
    });
    onOpenChange(false);
  };
  const handleGoogle = (movie: string) => {
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(movie)}`,
      "_blank"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden">
        <div className="p-6 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 mb-4">
            <SearchIcon className="w-5 h-5 text-gray-400" />
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Search movies..."
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              className="flex-1 text-lg"
            />
            {loading && (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 ml-2" />
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="divide-y rounded-lg border bg-white dark:bg-gray-800 shadow-lg max-h-96 overflow-y-auto">
              {suggestions.map((movie, i) => (
                <div
                  key={movie}
                  className={`flex items-center gap-3 px-4 py-3 transition cursor-pointer ${
                    selected === i
                      ? "bg-primary/10"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onMouseEnter={() => setSelected(i)}
                >
                  {/* Optional: Poster from TMDb if available */}
                  <div className="flex-1">
                    <div className="font-semibold text-base">{movie}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleWatchlist(movie)}
                  >
                    <Bookmark className="w-4 h-4 mr-1" /> Watchlist
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => handleWatched(movie)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Watched
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => handleGoogle(movie)}
                  >
                    Google it
                  </Button>
                </div>
              ))}
            </div>
          )}
          {!loading &&
            query.length > 1 &&
            suggestions.length === 0 &&
            !typing && (
              <div className="text-center text-gray-400 py-8">
                No results found.
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
