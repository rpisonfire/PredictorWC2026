"use client";
import { useEffect, useState } from "react";

export function Toast({ message }: { message: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 chip bg-wc-green/90 text-white shadow-lg shadow-wc-green/30 px-4 py-2 text-sm animate-in fade-in slide-in-from-top-2">
      ✅ {message}
    </div>
  );
}
