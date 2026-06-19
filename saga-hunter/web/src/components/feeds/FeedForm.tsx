"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface FeedFormData {
  name: string;
  url: string;
  sourceType: "news" | "curiosity" | "trend";
  language: string;
  intervalMinutes: number;
}

interface FeedFormProps {
  initial?: FeedFormData;
  onSubmit: (data: FeedFormData) => void;
  onCancel: () => void;
}

const DEFAULT_FORM: FeedFormData = {
  name: "",
  url: "",
  sourceType: "news",
  language: "en",
  intervalMinutes: 360,
};

export function FeedForm({ initial, onSubmit, onCancel }: FeedFormProps) {
  const [form, setForm] = useState<FeedFormData>(initial || DEFAULT_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border-gray-300 text-sm"
          placeholder="BBC News"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RSS URL</label>
        <input
          type="url"
          required
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          className="w-full rounded-lg border-gray-300 text-sm"
          placeholder="http://feeds.bbci.co.uk/news/rss.xml"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.sourceType}
            onChange={(e) => setForm({ ...form, sourceType: e.target.value as any })}
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
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full rounded-lg border-gray-300 text-sm"
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="it">IT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interval (min)</label>
          <input
            type="number"
            required
            min={5}
            value={form.intervalMinutes}
            onChange={(e) => setForm({ ...form, intervalMinutes: parseInt(e.target.value) || 360 })}
            className="w-full rounded-lg border-gray-300 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? "Update" : "Add Feed"}</Button>
      </div>
    </form>
  );
}
