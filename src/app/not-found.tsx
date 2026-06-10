import Link from "next/link";

export default function NotFound() {
  return (
    <section className="max-w-md mx-auto py-12 text-center">
      <div className="text-6xl mb-4">🔍⚽</div>
      <h1 className="text-3xl font-black mb-2">404 - Off-side</h1>
      <p className="text-app-muted mb-6">
        Ta strona nie istnieje. Może mecz został przeniesiony?
      </p>
      <Link href="/dashboard" className="btn-primary">🏠 Wróć na start</Link>
    </section>
  );
}
