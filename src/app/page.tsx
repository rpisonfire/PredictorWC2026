import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Countdown } from "@/components/Countdown";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <section className="py-12">
      <div className="mb-10">
        <Countdown />
      </div>
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-wc-green/15 text-wc-green border border-wc-green/30">Mundial 2026</span>
            <span className="text-3xl" title="USA">🇺🇸</span>
            <span className="text-3xl" title="Kanada">🇨🇦</span>
            <span className="text-3xl" title="Meksyk">🇲🇽</span>
          </div>
          <h1 className="mt-3 text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
            Typuj mecze.<br />
            <span className="text-wc-red">Zgarniaj</span> punkty.<br />
            <span className="text-wc-gold">Pokonaj</span> ekipę.
          </h1>
          <p className="mt-5 text-white/60 text-lg max-w-md">
            Prywatna liga typerska dla ciebie i znajomych. Strzelaj wyniki,
            wybieraj pierwszego strzelca i ustawiaj <b>boost x3</b> na pewniaka kolejki.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/login" className="btn-primary">Dołącz do ligi</Link>
            <Link href="/login" className="btn-ghost">Mam już konto</Link>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Punktacja</div>
          <ul className="space-y-2 text-sm">
            <Row label="Dokładny wynik" pts={5} color="bg-wc-red" />
            <Row label="Różnica bramek" pts={3} color="bg-wc-blue" />
            <Row label="Trafiony zwycięzca / remis" pts={2} color="bg-wc-green" />
            <Row label="Pierwsza drużyna która strzeli bramkę" pts={2} color="bg-wc-gold" />
            <Row label="Pierwszy strzelec" pts={5} color="bg-white/20" />
          </ul>
          <div className="mt-5 rounded-xl bg-wc-gold/10 border border-dashed border-wc-gold/60 p-4 text-sm">
            <b className="text-wc-red">Boost x3</b> — raz na kolejkę pomnóż swoje punkty z jednego meczu razy trzy.
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, pts, color }: { label: string; pts: number; color: string }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`chip text-white ${color}`}>+{pts} pkt</span>
    </li>
  );
}
