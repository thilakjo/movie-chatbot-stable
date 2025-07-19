// app/api/auth/[...nextauth]/route.ts (Corrected)

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // <-- Import from the new file

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
