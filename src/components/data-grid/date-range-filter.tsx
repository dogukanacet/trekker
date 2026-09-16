"use client";

import { useState } from "react";
import type { CustomFilterProps } from "ag-grid-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DateRangeFilterModel = { from: string | null; to: string | null };

export function DateRangeFilter(
  props: CustomFilterProps<unknown, unknown, DateRangeFilterModel> & {
    fromLabel: string;
    toLabel: string;
    applyLabel: string;
    clearLabel: string;
  },
) {
  const [from, setFrom] = useState(props.model?.from ?? "");
  const [to, setTo] = useState(props.model?.to ?? "");

  const apply = () =>
    props.onModelChange(from || to ? { from: from || null, to: to || null } : null);
  const clear = () => {
    setFrom("");
    setTo("");
    props.onModelChange(null);
  };

  return (
    <div className="w-56 space-y-3 p-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{props.fromLabel}</Label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{props.toLabel}</Label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex justify-between border-t pt-2">
        <Button variant="ghost" size="sm" onClick={clear}>
          {props.clearLabel}
        </Button>
        <Button size="sm" onClick={apply}>
          {props.applyLabel}
        </Button>
      </div>
    </div>
  );
}
