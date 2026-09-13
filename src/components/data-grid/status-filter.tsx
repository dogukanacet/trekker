"use client";

import { forwardRef, useEffect, useState } from "react";
import type { CustomFilterProps } from "ag-grid-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type StatusFilterModel = { values: string[] };

export const StatusFilter = forwardRef<
  unknown,
  CustomFilterProps & { options: { value: string; label: string }[] }
>(({ model, onModelChange, options }) => {
  const [draft, setDraft] = useState<string[]>(
    () => (model as StatusFilterModel | null)?.values ?? [],
  );

  useEffect(() => {
    setDraft((model as StatusFilterModel | null)?.values ?? []);
  }, [model]);

  const toggle = (value: string) => {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return Array.from(next);
    });
  };

  const handleApply = () => {
    onModelChange(draft.length > 0 ? { values: draft } : null);
  };

  const handleClear = () => {
    setDraft([]);
    onModelChange(null);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={`status-filter-${option.value}`}
              checked={draft.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
            />
            <Label htmlFor={`status-filter-${option.value}`} className="text-sm font-normal">
              {option.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t">
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          Clear
        </Button>
        <Button type="button" size="sm" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
});
StatusFilter.displayName = "StatusFilter";
