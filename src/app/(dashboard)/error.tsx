"use client";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md space-y-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-destructive">Bir hata oluştu</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button onClick={() => reset()} className="w-full">
          Tekrar dene
        </Button>
      </div>
    </div>
  );
}
