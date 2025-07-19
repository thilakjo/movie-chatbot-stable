"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Survey() {
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [favoriteDirector, setFavoriteDirector] = useState("");
  const [mood, setMood] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favoriteGenre, favoriteDirector, mood }),
    });
    router.refresh();
  };

  return (
    <Card className="max-w-lg mx-auto animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-2xl">Tell us your taste!</CardTitle>
        <CardDescription>
          This helps us give you better recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="genre">Favorite Genre?</Label>
            <Input
              id="genre"
              placeholder="e.g., Sci-Fi, Comedy"
              value={favoriteGenre}
              onChange={(e) => setFavoriteGenre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="director">Favorite Director?</Label>
            <Input
              id="director"
              placeholder="e.g., Christopher Nolan"
              value={favoriteDirector}
              onChange={(e) => setFavoriteDirector(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mood">
              What&apos;s your current mood for a movie?
            </Label>
            <Input
              id="mood"
              placeholder="e.g., Something funny and lighthearted"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
