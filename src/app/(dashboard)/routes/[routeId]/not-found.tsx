import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md space-y-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-destructive">Rota Bulunamadı</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aradığınız rota sistem kaydında bulunmuyor.
          </p>
        </div>
        <Link
          href="/routes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Rotalara Dön
        </Link>
      </div>
    </div>
  );
}
