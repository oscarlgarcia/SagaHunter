"use client";

import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = "Delete", cancelLabel = "Cancel",
  variant = "danger", onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
              variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-saga-600 hover:bg-saga-700"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
