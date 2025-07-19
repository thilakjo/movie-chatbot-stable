// app/api/user-movies/order/route.ts (Corrected)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correct import for auth logic
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { order } = await req.json(); // Only need the order array

    if (!Array.isArray(order)) {
      return NextResponse.json(
        { error: "Invalid payload: 'order' must be an array of IDs" },
        { status: 400 }
      );
    }

    // Create a transaction to update all movies in one go
    const updatePromises = order.map((id: string, index: number) =>
      prisma.userMovie.update({
        where: {
          id: id,
          userId: userId, // Ensure users can only update their own movies
        },
        data: { order: index },
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update movie order:", error);
    return NextResponse.json(
      { error: "Failed to update movie order" },
      { status: 500 }
    );
  }
}
