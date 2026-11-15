"use client";

import Link from "next/link";

export default function Error({ reset }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-black">Something went wrong</h1>
        <p className="mt-3 max-w-md text-white/60">
          An unexpected error occurred while loading this page. Please try again.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 px-6 py-3 font-semibold text-white hover:opacity-90 transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white/80 hover:bg-white/10 transition"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}