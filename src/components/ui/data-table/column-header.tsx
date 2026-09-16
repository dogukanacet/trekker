"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type FilterOption = { value: string; label: string };

export type ColumnFilterConfig =
  | { type: "text"; key: string; placeholder: string }
  | { type: "select"; key: string; placeholder: string; options: FilterOption[] }
  | { type: "multiselect"; key: string; placeholder: string; options: FilterOption[] }
  | { type: "radio"; key: string; options: FilterOption[] }
  | { type: "date-range"; key: string; fromLabel: string; toLabel: string };

export function ColumnHeader({
  label,
  sortKey,
  filter,
}: {
  label: string;
  sortKey?: string;
  filter?: ColumnFilterConfig;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get("sortBy");
  const currentSortOrder = searchParams.get("sortOrder");
  const isSortActive = !!sortKey && currentSortBy === sortKey;

  const handleSort = () => {
    if (!sortKey) return;

    const params = new URLSearchParams(searchParams.toString());

    if (isSortActive && currentSortOrder === "asc") {
      params.set("sortBy", sortKey);
      params.set("sortOrder", "desc");
    } else if (isSortActive && currentSortOrder === "desc") {
      params.delete("sortBy");
      params.delete("sortOrder");
    } else {
      params.set("sortBy", sortKey);
      params.set("sortOrder", "asc");
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const SortIcon = !isSortActive ? ArrowUpDown : currentSortOrder === "asc" ? ArrowUp : ArrowDown;
  const filterActive = filter
    ? filter.type === "date-range"
      ? !!searchParams.get(`${filter.key}From`) || !!searchParams.get(`${filter.key}To`)
      : !!searchParams.get(filter.key)
    : false;

  return (
    <div className="flex items-center gap-1">
      {sortKey ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSort}
          className={`-ml-3 h-8 gap-1 px-2 ${isSortActive ? "text-foreground" : "text-muted-foreground"}`}
        >
          {label}
          <SortIcon className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <span className="px-2">{label}</span>
      )}

      {filter && (
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6" />}>
            <Filter
              className={`h-3.5 w-3.5 ${filterActive ? "fill-primary/20 text-primary" : "text-muted-foreground"}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <FilterControl filter={filter} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function FilterControl({ filter }: { filter: ColumnFilterConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(filter.key, value);
    } else {
      params.delete(filter.key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  switch (filter.type) {
    case "text":
      return (
        <TextFilter
          placeholder={filter.placeholder}
          value={searchParams.get(filter.key) ?? ""}
          onChange={setParam}
        />
      );

    case "select":
      return (
        <Select
          value={searchParams.get(filter.key) ?? "all"}
          onValueChange={(v) => setParam(v === "all" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue>
              {(value: string) =>
                value === "all"
                  ? filter.placeholder
                  : filter.options.find((o) => o.value === value)?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.placeholder}</SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "radio":
      return (
        <RadioGroup value={searchParams.get(filter.key) ?? ""} onValueChange={setParam}>
          {filter.options.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${filter.key}-${option.value}`} />
              <Label htmlFor={`${filter.key}-${option.value}`} className="text-sm font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "multiselect": {
      const selected = new Set((searchParams.get(filter.key) ?? "").split(",").filter(Boolean));

      const toggle = (value: string) => {
        const next = new Set(selected);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
        setParam(next.size > 0 ? Array.from(next).join(",") : null);
      };

      return (
        <div className="space-y-2">
          {filter.options.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`${filter.key}-${option.value}`}
                checked={selected.has(option.value)}
                onCheckedChange={() => toggle(option.value)}
              />
              <Label htmlFor={`${filter.key}-${option.value}`} className="text-sm font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }
    case "date-range":
      return (
        <DateRangeFilter
          filterKey={filter.key}
          fromLabel={filter.fromLabel}
          toLabel={filter.toLabel}
        />
      );
  }
}

function TextFilter({
  placeholder,
  value: initialValue,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string | null) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value || null);
    }, 400);

    return () => clearTimeout(timeout);
  }, [value, onChange]);

  return (
    <Input
      autoFocus
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function DateRangeFilter({
  filterKey,
  fromLabel,
  toLabel,
}: {
  filterKey: string;
  fromLabel: string;
  toLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromKey = `${filterKey}From`;
  const toKey = `${filterKey}To`;

  const setRange = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (from) {
      params.set(fromKey, from);
    } else {
      params.delete(fromKey);
    }

    if (to) {
      params.set(toKey, to);
    } else {
      params.delete(toKey);
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const currentFrom = searchParams.get(fromKey) ?? "";
  const currentTo = searchParams.get(toKey) ?? "";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{fromLabel}</Label>
        <Input
          type="date"
          value={currentFrom}
          onChange={(e) => setRange(e.target.value, currentTo)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{toLabel}</Label>
        <Input
          type="date"
          value={currentTo}
          onChange={(e) => setRange(currentFrom, e.target.value)}
        />
      </div>
    </div>
  );
}
