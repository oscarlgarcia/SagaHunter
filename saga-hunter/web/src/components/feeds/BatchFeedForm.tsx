"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface BatchEntry {
  name: string;
  url: string;
}

interface BatchFeedFormProps {
  onSubmit: (feeds: { name: string; url: string; sourceType: string; language: string; intervalMinutes: number; maxPages: number | null; maxEntries: number | null }[]) => void;
  onCancel: () => void;
}

interface ParseWarning {
  line: string;
  reason: string;
}

function parseLines(text: string): { entries: BatchEntry[]; warnings: ParseWarning[] } {
  const entries: BatchEntry[] = [];
  const warnings: ParseWarning[] = [];

  for (const raw of text.split("\n")) {
    const l = raw.trim();
    if (!l.length) continue;

    const sep = l.indexOf("|");
    if (sep > 0) {
      const name = l.slice(0, sep).trim();
      const url = l.slice(sep + 1).trim();
      if (!url) {
        warnings.push({ line: l, reason: "Empty URL after |" });
        continue;
      }
      entries.push({ name, url });
      continue;
    }

    const withProto = l.startsWith("http") ? l : `https://${l}`;
    try {
      const host = new URL(withProto).hostname.replace(/^www\./, "");
      entries.push({ name: host, url: withProto });
    } catch {
      warnings.push({ line: l, reason: "Invalid URL format" });
    }
  }

  return { entries, warnings };
}

export function BatchFeedForm({ onSubmit, onCancel }: BatchFeedFormProps) {
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState("news");
  const [language, setLanguage] = useState("en");
  const [intervalMinutes, setIntervalMinutes] = useState(360);
  const [maxPages, setMaxPages] = useState<number | null>(5);
  const [maxEntries, setMaxEntries] = useState<number | null>(50);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);

  const { entries, warnings } = parseLines(text);
  const showWarnings = warnings.length > 0 && !dismissedWarnings;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entries.length === 0) return;
    onSubmit(
      entries.map((e) => ({
        ...e,
        sourceType,
        language,
        intervalMinutes,
        maxPages,
        maxEntries,
      }))
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URLs (one per line, or Name | URL format)
        </label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setDismissedWarnings(false); }}
          rows={6}
          className="w-full rounded-lg border-gray-300 text-sm font-mono"
          placeholder="BBC News | http://feeds.bbci.co.uk/news/rss.xml&#10;http://rss.cnn.com/rss/edition.rss&#10;https://www.theguardian.com/world/rss"
        />
        {entries.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">{entries.length} feed(s) detected</p>
        )}
        {showWarnings && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs text-amber-700 font-medium">
                {warnings.length} line(s) skipped:
              </div>
              <button
                type="button"
                onClick={() => setDismissedWarnings(true)}
                className="text-amber-400 hover:text-amber-600 text-xs"
              >
                ✕
              </button>
            </div>
            <ul className="text-xs text-amber-600 mt-1 space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i}>{w.reason}: &quot;{w.line}&quot;</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm"
          >
            <option value="news">News</option>
            <option value="curiosity">Curiosity</option>
            <option value="trend">Trend</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm"
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="it">IT</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interval (min)</label>
          <input
            type="number"
            required
            min={5}
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 360)}
            className="w-full rounded-lg border-gray-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Pages</label>
          <input
            type="number"
            min={1}
            value={maxPages ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value);
              setMaxPages(e.target.value === "" || isNaN(n) ? null : n);
            }}
            className="w-full rounded-lg border-gray-300 text-sm"
            placeholder="Unlimited"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Entries</label>
          <input
            type="number"
            min={1}
            value={maxEntries ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value);
              setMaxEntries(e.target.value === "" || isNaN(n) ? null : n);
            }}
            className="w-full rounded-lg border-gray-300 text-sm"
            placeholder="Unlimited"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={entries.length === 0}>
          Add {entries.length > 0 ? `(${entries.length})` : ""}
        </Button>
      </div>
    </form>
  );
}
