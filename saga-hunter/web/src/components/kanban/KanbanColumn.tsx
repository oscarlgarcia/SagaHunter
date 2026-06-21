"use client";

import { useRef, useEffect } from "react";
import { KanbanCard } from "./KanbanCard";

interface Seed {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  narrativeScore: number | null;
  status: string;
}

interface KanbanColumnProps {
  title: string;
  status: string;
  seeds: Seed[];
  borderColor: string;
  onDrop: (seedId: string, newStatus: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export function KanbanColumn({
  title,
  status,
  seeds,
  borderColor,
  onDrop,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      el.classList.add("bg-blue-50");
    };
    const handleDragLeave = () => {
      el.classList.remove("bg-blue-50");
    };
    const handleDropEvent = (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove("bg-blue-50");
      const draggedId = e.dataTransfer?.getData("text/plain");
      if (draggedId) onDrop(draggedId, status);
    };

    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDropEvent);

    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDropEvent);
    };
  }, [status, onDrop]);

  return (
    <div
      ref={dropRef}
      className={`flex-1 min-w-[250px] bg-gray-50 rounded-xl p-4 border-t-4 ${borderColor} transition-colors`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
          {seeds.length}
        </span>
      </div>

      <div className="space-y-3 min-h-[200px]">
        {seeds.map((seed) => (
          <KanbanCard
            key={seed.id}
            seed={seed}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {seeds.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
            Drop seeds here
          </div>
        )}
      </div>
    </div>
  );
}
