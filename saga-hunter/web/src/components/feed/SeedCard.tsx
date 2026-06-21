"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn, formatScore, scoreColor, statusColor } from "@/lib/utils";
import { SourceIcon } from "@/components/ui/SourceIcon";

type Filter = "all" | "news" | "curiosity" | "trend";

interface Seed {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceName: string | null;
  language: string;
  narrativeScore: number | null;
  status: string;
  discoveredAt: string;
}

interface SeedCardProps {
  filter: Filter;
}

export function SeedCard({ filter }: SeedCardProps) {
  const t = useTranslations("home");
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sortBy: "score" });
    if (filter !== "all") params.set("sourceType", filter);
    fetch(`/api/seeds?${params}`)
      .then((r) => r.json())
      .then((data) => setSeeds(data.seeds))
      .catch(() => setSeeds([]))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 animate-pulse border border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (seeds.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-medium">{t("no_seeds")}</p>
        <p className="text-sm mt-1">{t("no_seeds_hint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {seeds.map((seed) => (
        <Link
          key={seed.id}
          href={`/seed/${seed.id}`}
          className="block bg-white rounded-xl p-5 border border-gray-100 hover:border-saga-200 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-500" title={seed.sourceType}>
                  <SourceIcon type={seed.sourceType} className="w-5 h-5" />
                </span>
                <span className="text-xs text-gray-400 uppercase">
                  {seed.sourceName || seed.sourceType}
                </span>
                {seed.sourceUrl && (
                  <span onClick={(e) => { e.stopPropagation(); if (seed.sourceUrl) window.open(seed.sourceUrl, '_blank', 'noreferrer'); }} className="text-xs text-saga-500 hover:text-saga-700 hover:underline shrink-0 cursor-pointer">
                    ↗
                  </span>
                )}
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400 uppercase">{seed.language}</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {seed.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={cn("text-sm font-bold tabular-nums", scoreColor(seed.narrativeScore))}>
                {formatScore(seed.narrativeScore)}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor(seed.status))}>
                {seed.status}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
