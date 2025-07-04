"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_STORAGE_KEY = "yt-viewer-sort-preference";

interface SortOption {
  value: string;
  label: string;
}

const sortOptions: SortOption[] = [
  { value: "Title", label: "Title: A-Z" },
  { value: "-Title", label: "Title: Z-A" },
  { value: "Channel", label: "Channel: A-Z" },
  { value: "-Channel", label: "Channel: Z-A" },
  { value: "-ImportanceRating", label: "Importance: High to Low" },
  { value: "ImportanceRating", label: "Importance: Low to High" },
  { value: "-CreatedAt", label: "Date Added: Newest First" },
  { value: "CreatedAt", label: "Date Added: Oldest First" },
  { value: "-UpdatedAt", label: "Date Updated: Newest First" },
  { value: "UpdatedAt", label: "Date Updated: Oldest First" },
];

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();

  const getInitialSort = () => {
    if (typeof window === "undefined") return "-CreatedAt";
    return (
      searchParams.get("sort") ||
      sessionStorage.getItem(SORT_STORAGE_KEY) ||
      "-CreatedAt"
    );
  };

  const [currentSort, setCurrentSort] = useState<string>(getInitialSort());

  const handleSortChange = (value: string) => {
    setCurrentSort(value);
    sessionStorage.setItem(SORT_STORAGE_KEY, value);

    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    router.push(`/?${params.toString()}`);
  };

  useEffect(() => {
    if (
      mounted &&
      searchParams.get("sort") &&
      searchParams.get("sort") !== currentSort
    ) {
      const sort = searchParams.get("sort");
      if (sort) {
        setCurrentSort(sort);
        sessionStorage.setItem(SORT_STORAGE_KEY, sort);
      }
    }
  }, [mounted, searchParams, currentSort]);

  return (
    <Select
      value={mounted ? currentSort : "-CreatedAt"}
      onValueChange={handleSortChange}
      disabled={!mounted}
    >
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Sort by...">
          {mounted
            ? sortOptions.find((opt) => opt.value === currentSort)?.label ||
              "Sort by..."
            : "Loading..."}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
