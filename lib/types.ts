// lib/types.ts

import { Prisma } from "@prisma/client";

// This automatically creates a perfect TypeScript type based on your Prisma schema.
// It includes all fields: id, movieTitle, status, posterUrl, year, director, etc.
export type MovieWithDetails = Prisma.UserMovieGetPayload<{}>;

// We can also define the Recommendation type here for future use.
export interface Recommendation {
  title: string;
  posterUrl?: string;
}
