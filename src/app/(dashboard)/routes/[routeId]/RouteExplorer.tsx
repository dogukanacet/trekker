"use client";

import { useActionState, useState } from "react";
import type { RouteStop } from "@prisma/client";
import * as routeStopActions from "@/app/(dashboard)/routes/[routeId]/actions";
import RouteMapLoader from "./RouteMapLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { typography } from "@/lib/constants";

export default function RouteExplorer({ stops, routeId }: { stops: RouteStop[]; routeId: string }) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [addState, addAction, isAddPending] = useActionState(
    routeStopActions.addStop.bind(null, routeId),
    { error: null },
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <RouteMapLoader selectedStopId={selectedStopId} stops={stops} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={typography.sectionTitle}>Duraklar</CardTitle>
        </CardHeader>
        <CardContent>
          {stops.length ? (
            <ul className="divide-y">
              {stops.map((stop, i) => (
                <StopRow
                  key={stop.id}
                  stop={stop}
                  index={i}
                  routeId={routeId}
                  isSelected={stop.id === selectedStopId}
                  onSelect={() => setSelectedStopId(stop.id)}
                />
              ))}
            </ul>
          ) : (
            <p className={typography.secondary}>Henüz durak eklenmedi.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={typography.sectionTitle}>Yeni Durak Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="label">Durak Adı</Label>
              <Input id="label" name="label" placeholder="ör. Merkez Depo" required />
            </div>
            <div className="w-full space-y-2 sm:w-32">
              <Label htmlFor="lat">Lat</Label>
              <Input id="lat" name="lat" type="number" step="any" required />
            </div>
            <div className="w-full space-y-2 sm:w-32">
              <Label htmlFor="lng">Lng</Label>
              <Input id="lng" name="lng" type="number" step="any" required />
            </div>
            <Button type="submit" disabled={isAddPending}>
              <Plus className="h-4 w-4" />
              {isAddPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </form>
          {addState.error && <p className="mt-2 text-sm text-destructive">{addState.error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function StopRow({
  stop,
  index,
  routeId,
  isSelected,
  onSelect,
}: {
  stop: RouteStop;
  index: number;
  routeId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    routeStopActions.deleteStop.bind(null, stop.id, routeId),
    { error: null },
  );

  return (
    <li
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-colors ${
        isSelected ? "bg-primary/5" : "hover:bg-muted"
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {index + 1}
      </span>
      <span className="font-medium">{stop.label}</span>
      <span className={`ml-auto font-mono ${typography.secondary}`}>
        {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
      </span>
      <form action={deleteAction} onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" type="submit" disabled={isDeletePending}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </form>
      {deleteState.error && <p className="text-xs text-destructive">{deleteState.error}</p>}
    </li>
  );
}
