"use client";

import { useState } from "react";
import type { CustomFilterProps } from "ag-grid-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type MultiSelectFilterModel = string[];

export function MultiSelectFilter(
  props: CustomFilterProps<unknown, unknown, MultiSelectFilterModel> & {
    options: { value: string; label: string }[];
    applyLabel: string;
    clearLabel: string;
  },
) {
  const [selected, setSelected] = useState<Set<string>>(new Set(props.model ?? []));

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const apply = () => props.onModelChange(selected.size > 0 ? Array.from(selected) : null);
  const clear = () => {
    setSelected(new Set());
    props.onModelChange(null);
  };

  return (
    <div className="w-56 space-y-2 p-3">
      {props.options.map((option) => (
        <div key={option.value} className="flex items-center gap-2">
          <Checkbox
            id={`multiselect-${option.value}`}
            checked={selected.has(option.value)}
            onCheckedChange={() => toggle(option.value)}
          />
          <Label htmlFor={`multiselect-${option.value}`} className="text-sm font-normal">
            {option.label}
          </Label>
        </div>
      ))}
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
