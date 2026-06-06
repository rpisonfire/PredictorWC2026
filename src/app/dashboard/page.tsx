import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Toast } from "@/components/Toast";
import { Countdown } from "@/components/Countdown";
import { STADIUMS } from "@/lib/stadiums";

export default async function Dashboard({
  searchParams,
}: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { saved } = await searchParams;

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: { where: { userId: user.id } },
      boosts: { where: { userId: user.id } },
    },
  });

  const byMatchday = matches.reduce<Record<number, typeof matches>>((acc, m) => {
    (acc[m.matchday] ||= []).push(m);
    return acc;
  }, {});

  const now = new Date();
  const WC_KICKOFF = new Date("2026-06-11T21:00:00+02:00");
  const preWorldCup = now < WC_KICKOFF;

  // Find next match (kickoff in future)
  const nextMatch = matches.find((m) => m.kickoff.getTime() > now.getTime());
  const hoursToNext = nextMatch ? (nextMatch.kickoff.getTime() - now.getTime()) / 3600_000 : null;

  // Boost reminder for current matchday
  const currentMd = nextMatch?.matchday;
  const currentMdMatches = currentMd ? matches.filter((m) => m.matchday === currentMd) : [];
  const currentMdHasBoost = currentMdMatches.some((m) => m.boosts.length > 0);
  const currentMdMissingPredictions = currentMdMatches.filter(
    (m) => m.predictions.length === 0 && m.kickoff.getTime() > now.getTime() + 5 * 60 * 1000
  );

  return (
    <section>
      {saved === "1" && <Toast message="Typ zapisany" />}

      {preWorldCup && (
        <div className="mb-8">
          <Countdown />
        </div>
      )}

      <h1 className="text-3xl font-black mb-1">Mecze</h1>
      <p className="text-white/60 mb-6">Cześć <b>{user.nickname}</b> — typuj poniżej. Blokada 5 minut przed gwizdkiem.</p>

      {nextMatch && hoursToNext !== null && hoursToNext < 48 && (
        <div className="card p-4 mb-6 flex items-center gap-4 border-wc-gold/30 bg-wc-gold/5">
          <div className="text-3xl">⏰</div>
          <div className="flex-1">
            <div className="font-black">
              Najbliższy mecz: {nextMatch.homeTeam.flag} {nextMatch.homeTeam.shortCode} vs {nextMatch.awayTeam.shortCode} {nextMatch.awayTeam.flag}
            </div>
            <div className="text-sm text-white/60">
              {hoursToNext < 1
                ? `Za ${Math.ceil(hoursToNext * 60)} min`
                : `Za ${Math.floor(hoursToNext)}h ${Math.round((hoursToNext % 1) * 60)}min`}
              {!currentMdHasBoost && currentMd && <> · <b className="text-wc-red">Nie użyłeś boosta w kolejce {currentMd}!</b></>}
              {currentMdMissingPredictions.length > 0 && (
                <> · Brak typu na {currentMdMissingPredictions.length} {currentMdMissingPredictions.length === 1 ? "mecz" : "mecze"}</>
              )}
            </div>
          </div>
        </div>
      )}

      {Object.keys(byMatchday).length === 0 && (
        <div className="card p-10 text-center mb-10">
          <div className="text-5xl mb-3">📅</div>
          <div className="font-bold">Brak meczów w bazie</div>
          <p className="text-sm text-white/50 mt-1">Admin doda terminarz przed startem turnieju.</p>
        </div>
      )}

      {Object.entries(byMatchday).map(([md, list]) => (
        <div key={md} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black">Kolejka {md}</h2>
            {list.some((m) => m.boosts.length > 0) && (
              <span className="chip bg-wc-gold/20 text-wc-gold">Boost użyty ⚡</span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {list.map((m) => {
              const pred = m.predictions[0];
              const locked = m.kickoff.getTime() - now.getTime() < 5 * 60 * 1000;
              const boosted = m.boosts.length > 0;
              return (
                <Link
                  key={m.id}
                  href={`/match/${m.id}`}
                  className="card p-4 hover:border-wc-red/40 transition"
                >
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>{m.stage}</span>
                    <span>{m.kickoff.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <Team flag={m.homeTeam.flag} name={m.homeTeam.name} />
                    <div className="text-center min-w-[80px]">
                      {m.homeScore !== null ? (
                        <>
                          <div className="text-2xl font-black text-wc-gold">
                            {m.homeScore} <span className="text-white/30">:</span> {m.awayScore}
                          </div>
                          {pred && (
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              twój: {pred.homeScore}:{pred.awayScore}
                            </div>
                          )}
                        </>
                      ) : pred ? (
                        <div className="text-2xl font-black">
                          {pred.homeScore} <span className="text-white/30">:</span> {pred.awayScore}
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-white/30">vs</div>
                      )}
                    </div>
                    <Team flag={m.awayTeam.flag} name={m.awayTeam.name} right />
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {m.homeScore !== null ? (
                      <span className="chip bg-wc-gold/15 text-wc-gold">Rozegrany</span>
                    ) : pred ? (
                      <span className="chip bg-wc-green/10 text-wc-green">Typ złożony</span>
                    ) : (
                      <span className="chip bg-wc-red/10 text-wc-red">Brak typu</span>
                    )}
                    {boosted && <span className="chip bg-wc-gold/15 text-wc-gold">x3 ⚡</span>}
                    {locked && m.homeScore === null && <span className="chip bg-white/10 text-white/60">Zablokowane</span>}
                    {m.homeScore !== null && pred && (
                      <span className={`chip ${pred.pointsAwarded > 0 ? "bg-wc-green/15 text-wc-green" : "bg-white/5 text-white/40"}`}>
                        {boosted ? pred.pointsAwarded * 3 : pred.pointsAwarded} pkt
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {preWorldCup && (
      <div className="mt-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-black">Stadiony Mundialu 🏟️</h2>
          <span className="text-xs text-white/40">{STADIUMS.length} aren · 3 kraje</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {STADIUMS.map((s) => (
            <div key={s.name} className="card p-3">
              <div className="flex items-start justify-between gap-1">
                <div className="font-black leading-tight text-sm">{s.name}</div>
                <span className="text-lg shrink-0">{s.flag}</span>
              </div>
              <div className="text-xs text-white/60 mt-0.5 truncate">{s.city}</div>
              <div className="mt-2 text-base font-black text-wc-gold tabular-nums">
                {s.capacity.toLocaleString("pl-PL")}
              </div>
              {s.note && (
                <div className="mt-1.5 chip bg-wc-red/15 text-wc-red text-[10px]">⭐ {s.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}
    </section>
  );
}

function Team({ flag, name, right }: { flag: string; name: string; right?: boolean }) {
  return (
    <div className={`flex items-center gap-2 flex-1 ${right ? "justify-end text-right" : ""}`}>
      {!right && <span className="text-2xl">{flag}</span>}
      <span className="font-bold truncate">{name}</span>
      {right && <span className="text-2xl">{flag}</span>}
    </div>
  );
}
