"use client";

import { useState } from "react";
import type { CustomFilterProps } from "ag-grid-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TextFilterModel = string;

export function TextFilter(
  props: CustomFilterProps<unknown, unknown, TextFilterModel> & {
    placeholder: string;
    applyLabel: string;
    clearLabel: string;
  },
) {
  const [value, setValue] = useState(props.model ?? "");

  const apply = () => props.onModelChange(value || null);
  const clear = () => {
    setValue("");
    props.onModelChange(null);
  };

  return (
    <div className="w-56 space-y-2 p-3">
      <Input
        autoFocus
        placeholder={props.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
      />
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
