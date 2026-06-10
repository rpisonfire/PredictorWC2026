"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <section className="max-w-md mx-auto py-12 text-center">
      <div className="text-6xl mb-4">⚽💥</div>
      <h1 className="text-3xl font-black mb-2">Coś poszło nie tak</h1>
      <p className="text-app-muted mb-6">
        Apka się przewróciła. Najczęściej pomaga odświeżenie. Jak dalej nie działa - daj znać rpisonfire&apos;owi.
      </p>
      {error.digest && (
        <div className="text-xs text-app-subtle font-mono bg-app-hover rounded px-3 py-2 mb-4">
          ID błędu: {error.digest}
        </div>
      )}
      <div className="flex gap-2 justify-center">
        <button onClick={reset} className="btn-primary">🔄 Spróbuj ponownie</button>
        <Link href="/dashboard" className="btn-ghost">Wróć na start</Link>
      </div>
    </section>
  );
}
