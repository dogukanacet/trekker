"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <h1 className="text-lg font-semibold">Bir şeyler ters gitti</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Beklenmeyen bir hata oluştu. Tekrar denemek ister misin?
            </p>
          </div>
          <Button onClick={reset}>Tekrar Dene</Button>
        </div>
      </body>
    </html>
  );
}
