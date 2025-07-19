import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id || (session?.user as any)?.sub;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, order } = await req.json(); // type: "WATCHLIST" or "WATCHED", order: array of UserMovie IDs
    if (!Array.isArray(order) || !type) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    // Update the order field for each movie in the list
    await Promise.all(
      order.map((id: string, idx: number) =>
        prisma.userMovie.update({
          where: { id },
          data: { order: idx },
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update movie order" },
      { status: 500 }
    );
  }
}
