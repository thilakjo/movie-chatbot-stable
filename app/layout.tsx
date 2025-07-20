// app/layout.tsx (Updated for shadcn/ui)

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { Search } from "lucide-react";
import { MovieSearchModal } from "@/components/MovieSearchModal";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Movie Recommender",
  description: "Your personal AI movie chatbot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper>
          <div className="min-h-screen flex flex-col">
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
              <MovieSearchModal
                open={searchOpen}
                onOpenChange={setSearchOpen}
              />
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
