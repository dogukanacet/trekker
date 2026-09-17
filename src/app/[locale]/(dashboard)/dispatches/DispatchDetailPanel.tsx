"use client";

import { useEffect, useState } from "react";
import * as dispatchActions from "@/app/[locale]/(dashboard)/dispatches/actions";
import type { Dispatch } from "@prisma/client";

export function DispatchDetailPanel({ dispatchId }: { dispatchId: string }) {
  const [data, setData] = useState<Dispatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    dispatchActions.getDispatchDetail(dispatchId).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      else setData(result.data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [dispatchId]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Yükleniyor...</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;

  // TODO: gerçek detay içeriği burada — şimdilik mekanizmayı test etmek için ham veri
  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
