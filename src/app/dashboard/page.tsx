import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Toast } from "@/components/Toast";
import { Countdown } from "@/components/Countdown";
import { STADIUMS } from "@/lib/stadiums";
import { championPickIsLocked } from "@/lib/championLock";
import { fmtDateTime, dayKey } from "@/lib/dates";
import { isLive } from "@/lib/matchStatus";
import { LiveChip } from "@/components/LiveChip";
import { AutoRefresh } from "@/components/AutoRefresh";

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
  const champLock = await championPickIsLocked();
  const needsChampionPick = !user.predictedChampionId && !champLock.locked;

  const todayKey = dayKey(now);
  const todayMatches = matches.filter((m) => dayKey(m.kickoff) === todayKey);
  const hasLiveToday = todayMatches.some((m) => isLive(m.kickoff, m.homeScore !== null));

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
      {hasLiveToday && <AutoRefresh intervalSec={60} />}

      {preWorldCup && (
        <div className="mb-8">
          <Countdown />
        </div>
      )}

      <h1 className="text-3xl font-black mb-1">Mecze</h1>
      <p className="text-white/60 mb-6">Cześć <b>{user.nickname}</b> - typuj poniżej. Blokada 5 minut przed gwizdkiem.</p>

      {needsChampionPick && (
        <Link href="/champion" className="card p-4 mb-6 border-wc-gold/40 flex items-center gap-4 hover:bg-white/5">
          <div className="text-3xl">🏆</div>
          <div className="flex-1">
            <div className="font-black">Wybierz mistrza turnieju</div>
            <div className="text-sm text-white/60">+10 pkt jeśli trafisz. Można zmieniać do końca fazy grupowej.</div>
          </div>
          <div className="chip bg-wc-gold/15 text-wc-gold">Wybierz →</div>
        </Link>
      )}

      {/* Dzisiejsze mecze */}
      <div className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-2xl font-black">Dzisiejsze mecze 🔥</h2>
          <span className="text-xs text-white/40">{todayKey}</span>
        </div>
        {todayMatches.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-2">🌴</div>
            <div className="font-black">Hola hola, mundial się jeszcze nie zaczął</div>
            <p className="text-sm text-white/50 mt-1">Dziś nie ma żadnego meczu. Wracaj za parę dni 😎</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {todayMatches.map((m) => {
              const pred = m.predictions[0];
              const locked = m.kickoff.getTime() - now.getTime() < 5 * 60 * 1000;
              const boosted = m.boosts.length > 0;
              return (
                <MatchCard key={m.id} m={m} pred={pred} boosted={boosted} locked={locked} highlight />

              );
            })}
          </div>
        )}
      </div>

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
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {list.map((m) => {
              const pred = m.predictions[0];
              const locked = m.kickoff.getTime() - now.getTime() < 5 * 60 * 1000;
              const boosted = m.boosts.length > 0;
              return (
                <MatchCard key={m.id} m={m} pred={pred} boosted={boosted} locked={locked} />
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

function MatchCard({
  m, pred, boosted, locked, highlight,
}: {
  m: any; pred: any; boosted: boolean; locked: boolean; highlight?: boolean;
}) {
  const finished = m.homeScore !== null;
  const live = isLive(m.kickoff, finished);
  return (
    <Link
      href={`/match/${m.id}`}
      className={`card p-3 sm:p-4 hover:border-wc-red/40 transition ${highlight ? "border-wc-red/20" : ""}`}
    >
      <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/40">
        <span className="truncate">{m.stage}</span>
        <span className="shrink-0 ml-2">{fmtDateTime(m.kickoff)}</span>
      </div>

      {/* Vertical row layout — czytelne na mobile */}
      <div className="mt-2 space-y-1">
        <TeamRow
          flag={m.homeTeam.flag}
          shortCode={m.homeTeam.shortCode}
          name={m.homeTeam.name}
          score={finished ? m.homeScore : pred?.homeScore ?? null}
          color={finished ? "text-wc-gold" : "text-white"}
        />
        <TeamRow
          flag={m.awayTeam.flag}
          shortCode={m.awayTeam.shortCode}
          name={m.awayTeam.name}
          score={finished ? m.awayScore : pred?.awayScore ?? null}
          color={finished ? "text-wc-gold" : "text-white"}
        />
      </div>

      {finished && pred && (
        <div className="mt-1.5 text-[10px] text-white/40 uppercase tracking-wider">
          twój typ: {pred.homeScore}:{pred.awayScore}
        </div>
      )}

      <div className="mt-2 sm:mt-3 flex items-center gap-1.5 flex-wrap">
        {live && <LiveChip small />}
        {finished ? (
          <span className="chip bg-wc-gold/15 text-wc-gold text-[10px]">Po meczu</span>
        ) : pred ? (
          <span className="chip bg-wc-green/10 text-wc-green text-[10px]">Typ ✓</span>
        ) : (
          <span className="chip bg-wc-red/10 text-wc-red text-[10px]">Brak typu</span>
        )}
        {boosted && <span className="chip bg-wc-gold/15 text-wc-gold text-[10px]">x3 ⚡</span>}
        {locked && !finished && !live && <span className="chip bg-white/10 text-white/60 text-[10px]">🔒</span>}
        {finished && pred && (
          <span className={`chip text-[10px] ${pred.pointsAwarded > 0 ? "bg-wc-green/15 text-wc-green" : "bg-white/5 text-white/40"}`}>
            {boosted ? pred.pointsAwarded * 3 : pred.pointsAwarded} pkt
          </span>
        )}
      </div>
    </Link>
  );
}

function TeamRow({
  flag, shortCode, name, score, color,
}: { flag: string; shortCode: string; name: string; score: number | null; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <span className="text-xl sm:text-2xl shrink-0">{flag}</span>
        <span className="font-bold truncate">
          <span className="sm:hidden">{shortCode}</span>
          <span className="hidden sm:inline">{name}</span>
        </span>
      </div>
      <span className={`font-black text-xl sm:text-2xl tabular-nums shrink-0 ${color}`}>
        {score ?? <span className="text-white/20">-</span>}
      </span>
    </div>
  );
}
