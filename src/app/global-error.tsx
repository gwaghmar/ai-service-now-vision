"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 p-8 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
          {process.env.NODE_ENV === "development"
            ? error.message
            : "An unexpected error occurred. Please try again."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
