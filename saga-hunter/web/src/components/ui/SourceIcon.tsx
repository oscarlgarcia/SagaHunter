"use client";

import { Newspaper, BookOpen, Flame, FileText } from "lucide-react";

const icons = {
  news: Newspaper,
  curiosity: BookOpen,
  trend: Flame,
} as const;

export function SourceIcon({ type, className = "w-4 h-4" }: { type: string; className?: string }) {
  const Icon = (icons as any)[type] || FileText;
  return <Icon className={className} />;
}
