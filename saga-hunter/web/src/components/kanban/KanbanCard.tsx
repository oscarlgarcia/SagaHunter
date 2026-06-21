"use client";

import { useRef } from "react";
import Link from "next/link";
import { SourceIcon } from "@/components/ui/SourceIcon";

interface Seed {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  narrativeScore: number | null;
  status: string;
  _count?: { enrichments: number };
}

interface KanbanCardProps {
  seed: Seed;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export function KanbanCard({ seed, onDragStart, onDragEnd }: KanbanCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={ref}
      href={`/seed/${seed.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", seed.id);
        onDragStart(seed.id);
      }}
      onDragEnd={onDragEnd}
      className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-saga-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-gray-400"><SourceIcon type={seed.sourceType} className="w-4 h-4" /></span>
          {seed.sourceUrl && (
            <a href={seed.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-saga-500 hover:text-saga-700 hover:underline ml-1">
              ↗
            </a>
          )}
          <p className="text-sm font-medium text-gray-900 mt-1 line-clamp-2">
            {seed.title}
          </p>
          {seed._count && seed._count.enrichments > 0 && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs text-saga-600 bg-saga-50 px-2 py-0.5 rounded-full">
              {seed._count.enrichments} enrichment{seed._count.enrichments !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {seed.narrativeScore !== null && (
          <span className="text-xs font-bold text-gray-400 tabular-nums shrink-0">
            {seed.narrativeScore}
          </span>
        )}
      </div>
    </Link>
  );
}
