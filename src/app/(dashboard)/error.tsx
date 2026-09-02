"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <h1 className="text-lg font-semibold">Bir şeyler ters gitti</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bu sayfa yüklenirken beklenmeyen bir hata oluştu.
        </p>
      </div>
      <Button onClick={reset}>Tekrar Dene</Button>
    </div>
  );
}
