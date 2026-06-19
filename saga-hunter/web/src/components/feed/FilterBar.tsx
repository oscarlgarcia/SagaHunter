"use client";

import { cn } from "@/lib/utils";

type Filter = "all" | "news" | "curiosity" | "trend";

interface FilterBarProps {
  active: Filter;
  onChange: (filter: Filter) => void;
}

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "🔍" },
  { key: "news", label: "News", icon: "📰" },
  { key: "curiosity", label: "Curiosity", icon: "📚" },
  { key: "trend", label: "Trends", icon: "🔥" },
];

export function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 mb-6">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            active === f.key
              ? "bg-saga-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          )}
        >
          <span>{f.icon}</span>
          {f.label}
        </button>
      ))}
    </div>
  );
}
