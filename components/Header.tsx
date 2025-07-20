"use client";
import { useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { Search } from "lucide-react";
import { MovieSearchModal } from "@/components/MovieSearchModal";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">Movie Recommender</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          aria-label="Search movies"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="w-6 h-6" />
        </button>
        <SignOutButton />
      </div>
      <MovieSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
