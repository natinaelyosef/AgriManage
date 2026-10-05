"use client";

import { useEffect, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { SearchInput, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FilterOption {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function ListToolbar({
  search,
  onSearch,
  searchPlaceholder,
  filters,
  activeFilters,
  onFilterChange,
  onClear,
  actions,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClear?: () => void;
  actions?: React.ReactNode;
}) {
  const hasFilters = Boolean(activeFilters && Object.values(activeFilters).some(Boolean));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder={searchPlaceholder}
        className="w-full sm:w-64"
      />
      {filters?.map((filter) => (
        <Select
          key={filter.key}
          value={activeFilters?.[filter.key] ?? ""}
          onChange={(event) => onFilterChange?.(filter.key, event.target.value)}
          className="w-auto min-w-36"
          aria-label={filter.label}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ))}
      {hasFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <SearchX className="h-4 w-4" /> Clear
        </Button>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Debounces search input before writing to the URL. */
export function useDebouncedSearch(
  set: (patch: { q: string; page?: number }) => void,
  delay = 300,
): [string, (value: string) => void] {
  const [value, setValue] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const onChange = (next: string) => {
    setValue(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => set({ q: next, page: 1 }), delay);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return [value, onChange];
}
