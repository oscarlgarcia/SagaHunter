import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number | null): string {
  if (score === null) return "--";
  return `${score}/100`;
}

export function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-gray-500";
}

export function statusColor(status: string): string {
  switch (status) {
    case "discovered": return "bg-blue-100 text-blue-800";
    case "analyzing":  return "bg-yellow-100 text-yellow-800";
    case "analyzed":   return "bg-purple-100 text-purple-800";
    case "developing": return "bg-green-100 text-green-800";
    case "published":  return "bg-gray-800 text-white";
    default:           return "bg-gray-100 text-gray-800";
  }
}
