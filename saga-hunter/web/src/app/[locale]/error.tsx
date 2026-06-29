"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2 text-sm font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
