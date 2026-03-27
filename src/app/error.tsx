"use client";

import { Button } from "@heroui/react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="text-lg text-default-500 max-w-md text-center">
        An unexpected error occurred. Please try again.
      </p>
      <Button variant="primary" size="lg" onPress={reset}>
        Try Again
      </Button>
    </div>
  );
}
