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
          <p className="mt-5 text-app-muted text-lg max-w-md">
            Prywatna liga typerska dla ciebie i znajomych. Strzelaj wyniki,
            wybieraj pierwszego strzelca i ustawiaj <b>boost x3</b> na pewniaka kolejki.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/login" className="btn-primary">Dołącz do ligi</Link>
            <Link href="/login" className="btn-ghost">Mam już konto</Link>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">Punktacja</div>
          <ul className="space-y-2 text-sm">
            <Row label="Dokładny wynik" pts={5} color="bg-wc-red" />
            <Row label="Różnica bramek" pts={3} color="bg-wc-blue" />
            <Row label="Trafiony zwycięzca / remis" pts={2} color="bg-wc-green" />
            <Row label="Trafione bramki gospodarza" pts={1} color="bg-wc-lime" />
            <Row label="Trafione bramki gości" pts={1} color="bg-wc-lime" />
            <Row label="Pierwsza drużyna która strzeli bramkę" pts={2} color="bg-wc-gold" />
            <Row label="Pierwszy strzelec" pts={5} color="bg-purple-600" />
          </ul>
          <div className="mt-5 rounded-xl bg-wc-gold/10 border border-dashed border-wc-gold/60 p-4 text-sm">
            <b className="text-wc-red">Boost x3</b> - raz na kolejkę pomnóż swoje punkty z jednego meczu razy trzy.
          </div>

          <div className="mt-5 rounded-xl border border-app p-4 text-sm space-y-3">
            <div className="text-xs uppercase tracking-wider text-app-subtle font-bold">Przykład</div>
            <div>
              Twój typ: <b className="tabular-nums">2 : 1</b> dla 🇲🇽 z Mbappé jako pierwszym strzelcem.
            </div>
            <div className="text-app-muted">
              Wynik meczu: <b className="text-app tabular-nums">2 : 0</b> dla 🇲🇽, pierwszy gol strzelił Hirving Lozano.
            </div>
            <ul className="space-y-1 pl-1">
              <li className="flex items-center gap-2">
                <span className="text-app-subtle">❌</span>
                <span>Dokładny wynik: nie (2:1 vs 2:0)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-app-subtle">❌</span>
                <span>Różnica bramek: nie (+1 vs +2)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-wc-green">✅</span>
                <span>Zwycięzca: tak (🇲🇽 wygrało) → <b className="text-wc-green">+2 pkt</b></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-wc-green">✅</span>
                <span>Bramki gospodarza: tak (2 = 2) → <b className="text-wc-green">+1 pkt</b></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-app-subtle">❌</span>
                <span>Bramki gości: nie (1 vs 0)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-wc-green">✅</span>
                <span>Pierwsza drużyna ze strzałem: tak (🇲🇽) → <b className="text-wc-green">+2 pkt</b></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-app-subtle">❌</span>
                <span>Pierwszy strzelec: nie (Mbappé vs Lozano)</span>
              </li>
            </ul>
            <div className="pt-3 border-t border-app flex items-center justify-between">
              <span className="font-bold">Razem:</span>
              <span className="text-2xl font-black text-wc-gold tabular-nums">5 pkt</span>
            </div>
            <div className="text-[11px] text-app-subtle">
              Gdybyś dał na ten mecz <b className="text-wc-red">boost x3</b>, dostałbyś <b className="text-wc-gold">15 pkt</b>.
            </div>
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
