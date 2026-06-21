"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(value);
  const raf = useRef<number>();

  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    prevRef.current = value;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <>{display}</>;
}
