"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  dismissing: boolean;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = "success", duration = 4000) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type, dismissing: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-300 max-w-sm",
              toast.type === "success" && "bg-green-600",
              toast.type === "error" && "bg-red-600",
              toast.type === "info" && "bg-saga-600",
              toast.dismissing ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
            )}
          >
            <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "ℹ"}</span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => {
                setToasts((prev) => prev.map((t) => (t.id === toast.id ? { ...t, dismissing: true } : t)));
                setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 300);
              }}
              className="ml-1 opacity-70 hover:opacity-100 shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
