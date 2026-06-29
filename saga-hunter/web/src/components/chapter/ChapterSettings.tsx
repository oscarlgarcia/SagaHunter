"use client";

import { Sparkles, Loader2 } from "lucide-react";

interface ChapterSettingsProps {
  title: string;
  synopsis: string;
  status: string;
  wordCountTarget: number | null;
  onTitleChange: (v: string) => void;
  onSynopsisChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onWordCountChange: (v: number | null) => void;
  onGenerateSynopsis: () => void;
  onSave: () => void;
  saving: boolean;
  generating: boolean;
}

export default function ChapterSettings({
  title, synopsis, status, wordCountTarget,
  onTitleChange, onSynopsisChange, onStatusChange, onWordCountChange,
  onGenerateSynopsis, onSave, saving, generating,
}: ChapterSettingsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Settings</h3>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-1.5 text-xs font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors disabled:opacity-50"
          type="button"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saga-400"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saga-400 bg-white"
        >
          <option value="outline">Outline</option>
          <option value="drafted">Drafted</option>
          <option value="revised">Revised</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Word Count Target</label>
        <input
          type="number"
          value={wordCountTarget ?? ""}
          onChange={(e) => onWordCountChange(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saga-400"
          placeholder="e.g. 2500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-500">Synopsis</label>
          <button
            onClick={onGenerateSynopsis}
            disabled={generating}
            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50"
            type="button"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? "Generating..." : "Regenerate with AI"}
          </button>
        </div>
        <textarea
          value={synopsis}
          onChange={(e) => onSynopsisChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saga-400 resize-none"
          rows={5}
          placeholder="Chapter synopsis..."
        />
      </div>
    </div>
  );
}
