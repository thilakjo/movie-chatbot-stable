import { getServerSession } from "next-auth/next";
import { authOptions } from "./app/api/auth/[...nextauth]/route";

export async function auth() {
  return getServerSession(authOptions);
}
