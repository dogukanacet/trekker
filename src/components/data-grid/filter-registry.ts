import { TextFilter } from "./text-filter";
import { MultiSelectFilter } from "./multi-select-filter";
import { DateRangeFilter } from "./date-range-filter";

const alwaysPass = () => true; // Gerçek filtreleme sunucuda yapılıyor, bu sadece kozmetik.

export const filterRegistry = {
  text: { component: TextFilter, doesFilterPass: alwaysPass },
  multiselect: { component: MultiSelectFilter, doesFilterPass: alwaysPass },
  dateRange: { component: DateRangeFilter, doesFilterPass: alwaysPass },
} as const;

export type FilterType = keyof typeof filterRegistry;

export function isRegisteredFilterType(value: unknown): value is FilterType {
  return typeof value === "string" && value in filterRegistry;
}
