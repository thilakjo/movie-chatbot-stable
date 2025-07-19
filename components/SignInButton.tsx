"use client";
import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="px-6 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
    >
      Sign in with Google
    </button>
  );
}
