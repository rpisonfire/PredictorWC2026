import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Countdown } from "@/components/Countdown";
import { STADIUMS } from "@/lib/stadiums";
import { championPickIsLocked } from "@/lib/championLock";
import { fmtDateTime, dayKey } from "@/lib/dates";
import { isLive } from "@/lib/matchStatus";
import { LiveChip } from "@/components/LiveChip";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Flag } from "@/components/Flag";
import { matchGlowStyle } from "@/lib/teamColors";
import { PersonalScoreboard } from "@/components/PersonalScoreboard";
import { prettyStage, isKnockoutStage } from "@/lib/stageLabel";

// Z listy meczy w danej kolejce zwróć etykietę.
// Knockout → nazwa etapu (1/16 finału, Ćwierćfinał, ...). Grupowa → "Kolejka X".
// Jeśli matchday ma WSZYSTKIE mecze pucharowe → użyj nazwy etapu.
// Jeśli mix (np. uszkodzone dane gdzie knockout wpadł do Kolejki 1) → "Kolejka X".
function matchdayLabel(list: { stage: string }[], md: number | string): string {
  if (list.length === 0) return `Kolejka ${md}`;
  const stagesInGroup = new Set(list.map((m) => prettyStage(m.stage)));
  // Jeśli wszystkie mecze należą do tego samego etapu pucharowego - użyj etapu
  if (stagesInGroup.size === 1) {
    const single = [...stagesInGroup][0];
    if (!single.startsWith("Grupa") && single !== "Faza grupowa") return single;
  }
  return `Kolejka ${md}`;
}

async function quickBoost(formData: FormData) {
  "use server";
  const user = await requireAuth();
  const matchId = String(formData.get("matchId"));
  const action = String(formData.get("action") ?? "");
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;
  // Blokada 5 min przed gwizdkiem - identycznie jak savePrediction
  if (match.kickoff.getTime() - Date.now() < 5 * 60 * 1000) return;

  const existing = await prisma.boost.findUnique({
    where: { userId_matchday: { userId: user.id, matchday: match.matchday } },
    include: { match: true },
  });
  // Boost na starym meczu jest zablokowany 5 min przed jego gwizdkiem
  const existingStarted = existing && existing.match.kickoff.getTime() - Date.now() < 5 * 60 * 1000;

  if (action === "set") {
    if (existing) {
      if (existing.matchId === matchId) {
        // już jest, nic nie rób
      } else if (existingStarted) {
        // nie można przenieść z meczu który się zaczął
      } else {
        await prisma.boost.delete({ where: { id: existing.id } });
        await prisma.boost.create({ data: { userId: user.id, matchId, matchday: match.matchday } });
      }
    } else {
      await prisma.boost.create({ data: { userId: user.id, matchId, matchday: match.matchday } });
    }
  } else if (action === "unset") {
    if (existing && existing.matchId === matchId && !existingStarted) {
      await prisma.boost.delete({ where: { id: existing.id } });
    }
  }

  revalidatePath("/dashboard");
}

export default async function Dashboard() {
  const user = await requireAuth();

  // Równolegle - 2 query w jednym round-tripie
  const [matches, champLock] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoff: "asc" },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: { where: { userId: user.id } },
        boosts: { where: { userId: user.id } },
      },
    }),
    championPickIsLocked(),
  ]);

  // Grupowanie po kolejce, a wewnątrz: najpierw nierozegrane (rosnąco po kickoff), potem rozegrane (rosnąco)
  // Efektywny matchday: dla knockout-ów wymuś 100+ na podstawie stage'a (niezależnie od m.matchday w DB).
  // Inaczej knockout mecze z football-data wpadają do "Kolejka 1/2/3" obok grupowych.
  const KO_MD: Record<string, number> = {
    "1/16 finału": 100, "1/8 finału": 101, "Ćwierćfinał": 102,
    "Półfinał": 103, "Mecz o 3. miejsce": 104, "Finał": 105,
  };
  const effectiveMatchday = (m: { stage: string; matchday: number }) => {
    const pretty = prettyStage(m.stage);
    return KO_MD[pretty] ?? m.matchday;
  };

  const byMatchday = matches.reduce<Record<number, typeof matches>>((acc, m) => {
    const md = effectiveMatchday(m);
    (acc[md] ||= []).push(m);
    return acc;
  }, {});
  for (const md of Object.keys(byMatchday)) {
    byMatchday[Number(md)].sort((a, b) => {
      const aFin = a.homeScore !== null ? 1 : 0;
      const bFin = b.homeScore !== null ? 1 : 0;
      if (aFin !== bFin) return aFin - bFin;
      return a.kickoff.getTime() - b.kickoff.getTime();
    });
  }

  // Mapa: matchday → id meczu na którym user ma boost
  const boostByMatchday = new Map<number, string>();
  for (const m of matches) {
    if (m.boosts.length > 0) boostByMatchday.set(m.matchday, m.id);
  }

  const now = new Date();
  const WC_KICKOFF = new Date("2026-06-11T21:00:00+02:00");
  const preWorldCup = now < WC_KICKOFF;
  const needsChampionPick = !user.predictedChampionId && !champLock.locked;

  const todayKey = dayKey(now);
  const todayMatches = matches.filter((m) => dayKey(m.kickoff) === todayKey);
  const hasLiveToday = todayMatches.some((m) => isLive(m.kickoff, m.homeScore !== null));

  // Find next match (kickoff in future)
  const nextMatch = matches.find((m) => m.kickoff.getTime() > now.getTime());
  const hoursToNext = nextMatch ? (nextMatch.kickoff.getTime() - now.getTime()) / 3600_000 : null;

  // Ostatni rozegrany mecz tego usera (jeśli ma predykcję)
  const finishedWithPred = matches
    .filter((m) => m.homeScore !== null && m.predictions[0])
    .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());
  const lastMatch = finishedWithPred[0];
  const lastPred = lastMatch?.predictions[0];
  const lastBoosted = lastMatch ? lastMatch.boosts.length > 0 : false;
  const lastPts = lastPred ? (lastBoosted ? lastPred.pointsAwarded * 3 : lastPred.pointsAwarded) : 0;
  const lastExact = lastMatch && lastPred && lastPred.homeScore === lastMatch.homeScore && lastPred.awayScore === lastMatch.awayScore;

  // Boost reminder for current matchday
  const currentMd = nextMatch?.matchday;
  const currentMdMatches = currentMd ? matches.filter((m) => m.matchday === currentMd) : [];
  const currentMdHasBoost = currentMdMatches.some((m) => m.boosts.length > 0);
  const currentMdMissingPredictions = currentMdMatches.filter(
    (m) => m.predictions.length === 0 && m.kickoff.getTime() > now.getTime() + 5 * 60 * 1000
  );

  return (
    <section>
      {/* Auto-refresh wyłączony na dashboardzie - kumple sami odświeżą jak chcą zobaczyć wynik */}

      {preWorldCup && (
        <div className="mb-8">
          <Countdown />
        </div>
      )}

      <h1 className="text-3xl font-black mb-1">Mecze</h1>
      <p className="text-app-muted mb-4 text-sm sm:text-base">
        Cześć <b>{user.nickname}</b>. Typuj wynik, pierwszą drużynę ze strzałem i strzelca pierwszego gola. Użyj boosta x3 by odskoczyć rywalom. <b>Blokada 5 min przed gwizdkiem</b>.
      </p>

      <PersonalScoreboard
        nextMatch={nextMatch && hoursToNext !== null && hoursToNext < 48 ? {
          id: nextMatch.id,
          homeTeam: { flag: nextMatch.homeTeam.flag, shortCode: nextMatch.homeTeam.shortCode },
          awayTeam: { flag: nextMatch.awayTeam.flag, shortCode: nextMatch.awayTeam.shortCode },
          hoursToNext,
          missingPicks: currentMdMissingPredictions.length,
          noBoost: !currentMdHasBoost,
          currentMd: currentMd ?? null,
        } : null}
        rank={user.currentRank != null && user.previousRank != null ? { current: user.currentRank, previous: user.previousRank } : null}
        lastMatch={lastMatch && lastPred ? {
          id: lastMatch.id,
          homeTeam: { flag: lastMatch.homeTeam.flag, shortCode: lastMatch.homeTeam.shortCode },
          awayTeam: { flag: lastMatch.awayTeam.flag, shortCode: lastMatch.awayTeam.shortCode },
          homeScore: lastMatch.homeScore!,
          awayScore: lastMatch.awayScore!,
          myHome: lastPred.homeScore,
          myAway: lastPred.awayScore,
          pts: lastPts,
          boosted: lastBoosted,
          exact: !!lastExact,
        } : null}
      />

      {needsChampionPick && (
        <Link href="/champion" className="card p-4 mb-6 border-wc-gold/40 flex items-center gap-4 hover:bg-app-hover">
          <div className="text-3xl">🏆</div>
          <div className="flex-1">
            <div className="font-black">Wybierz mistrza turnieju</div>
            <div className="text-sm text-app-muted">+10 pkt jeśli trafisz. Można zmieniać do końca fazy grupowej.</div>
          </div>
          <div className="chip bg-wc-gold/15 text-wc-gold">Wybierz →</div>
        </Link>
      )}

      {/* Dzisiejsze mecze */}
      <div className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-2xl font-black">Dzisiejsze mecze 🔥</h2>
          <span className="text-xs text-app-subtle">{todayKey}</span>
        </div>
        {todayMatches.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-2">🌴</div>
            <div className="font-black">Dziś dzień przerwy</div>
            <p className="text-sm text-app-subtle mt-1">Brak meczu w dzisiejszym terminarzu. Sprawdź następne kolejki poniżej 😎</p>
          </div>
        ) : (() => {
          const todayUpcoming = todayMatches.filter((m) => m.homeScore === null);
          const todayFinished = todayMatches.filter((m) => m.homeScore !== null);
          const renderToday = (items: typeof todayMatches) => (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {items.map((m) => {
                const pred = m.predictions[0];
                const locked = m.kickoff.getTime() - now.getTime() < 5 * 60 * 1000;
                const boosted = m.boosts.length > 0;
                return (
                  <MatchCard key={m.id} m={m} pred={pred} boosted={boosted} locked={locked} highlight boostedMatchInMd={boostByMatchday.get(m.matchday)} quickBoostAction={quickBoost} />
                );
              })}
            </div>
          );
          return (
            <>
              {todayUpcoming.length > 0 && renderToday(todayUpcoming)}
              {todayFinished.length > 0 && (
                <details className={todayUpcoming.length > 0 ? "mt-4" : ""} open={todayUpcoming.length === 0}>
                  <summary className="collapse-header mb-3">
                    <span className="flex items-center gap-2">
                      <span className="collapse-chev">▶</span>
                      Rozegrane dzisiaj
                    </span>
                    <span className="collapse-count">{todayFinished.length} {todayFinished.length === 1 ? "mecz" : "meczy"}</span>
                  </summary>
                  <div className="opacity-60">{renderToday(todayFinished)}</div>
                </details>
              )}
            </>
          );
        })()}
      </div>

      {Object.keys(byMatchday).length === 0 && (
        <div className="card p-10 text-center mb-10">
          <div className="text-5xl mb-3">📅</div>
          <div className="font-bold">Brak meczów w bazie</div>
          <p className="text-sm text-app-subtle mt-1">Admin doda terminarz przed startem turnieju.</p>
        </div>
      )}

      {Object.entries(byMatchday).map(([md, list]) => {
        const upcoming = list.filter((m) => m.homeScore === null);
        const finished = list.filter((m) => m.homeScore !== null);
        const allFinished = upcoming.length === 0 && finished.length > 0;
        const renderCards = (items: typeof list) => (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {items.map((m) => {
              const pred = m.predictions[0];
              const locked = m.kickoff.getTime() - now.getTime() < 5 * 60 * 1000;
              const boosted = m.boosts.length > 0;
              return (
                <MatchCard key={m.id} m={m} pred={pred} boosted={boosted} locked={locked} boostedMatchInMd={boostByMatchday.get(m.matchday)} quickBoostAction={quickBoost} />
              );
            })}
          </div>
        );

        const label = matchdayLabel(list, md);
        // Cała kolejka rozegrana → schowaj w collapsible (domyślnie zwiniętą)
        if (allFinished) {
          return (
            <details key={md} className="mb-4">
              <summary className="collapse-header">
                <span className="flex items-center gap-2">
                  <span className="collapse-chev">▶</span>
                  {label}
                  <span className="collapse-count">· {finished.length} rozegranych</span>
                </span>
                <span className="chip-after-match">zakończona</span>
              </summary>
              <div className="opacity-60 mt-3">{renderCards(finished)}</div>
            </details>
          );
        }

        return (
          <div key={md} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black">{label}</h2>
              {list.some((m) => m.boosts.length > 0) && (
                <span className="chip bg-wc-gold/20 text-wc-gold">Boost użyty ⚡</span>
              )}
            </div>
            {upcoming.length > 0 && renderCards(upcoming)}
            {finished.length > 0 && (
              <>
                {upcoming.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 mb-2 text-[10px] uppercase tracking-wider text-app-subtle">
                    <span>Rozegrane</span>
                    <div className="flex-1 h-px bg-app" />
                  </div>
                )}
                <div className="opacity-60">{renderCards(finished)}</div>
              </>
            )}
          </div>
        );
      })}

      {preWorldCup && (
      <div className="mt-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-black">Stadiony Mundialu 🏟️</h2>
          <span className="text-xs text-app-subtle">{STADIUMS.length} aren · 3 kraje</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {STADIUMS.map((s) => (
            <div key={s.name} className="card p-3">
              <div className="flex items-start justify-between gap-1">
                <div className="font-black leading-tight text-sm">{s.name}</div>
                <span className="text-lg shrink-0">{s.flag}</span>
              </div>
              <div className="text-xs text-app-muted mt-0.5 truncate">{s.city}</div>
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
  m, pred, boosted, locked, highlight, boostedMatchInMd, quickBoostAction,
}: {
  m: any; pred: any; boosted: boolean; locked: boolean; highlight?: boolean;
  boostedMatchInMd?: string;
  quickBoostAction: (formData: FormData) => Promise<void>;
}) {
  const finished = m.homeScore !== null;
  const live = isLive(m.kickoff, finished);
  // Boost dostępny tylko gdy do gwizdka > 5 min (identycznie jak typowanie)
  const canBoost = !finished && !live && m.kickoff.getTime() - Date.now() > 5 * 60 * 1000;
  return (
    <div
      className="match-tile relative"
      style={matchGlowStyle(m.homeTeam.shortCode, m.awayTeam.shortCode)}
    >
      <Link href={`/match/${m.id}`} className="absolute inset-0 z-0" aria-label={`${m.homeTeam.name} vs ${m.awayTeam.name}`} />
      <div className="match-tile-inner relative z-10 pointer-events-none">
      <div className="match-tile-meta">
        <span className="truncate">{prettyStage(m.stage)}</span>
        <span className="shrink-0 ml-2">{fmtDateTime(m.kickoff)}</span>
      </div>

      {/* Vertical row layout — czytelne na mobile */}
      <div className="mt-2 space-y-1">
        <TeamRow
          flag={m.homeTeam.flag}
          shortCode={m.homeTeam.shortCode}
          name={m.homeTeam.name}
          score={finished ? m.homeScore : pred?.homeScore ?? null}
          finished={finished}
        />
        <TeamRow
          flag={m.awayTeam.flag}
          shortCode={m.awayTeam.shortCode}
          name={m.awayTeam.name}
          score={finished ? m.awayScore : pred?.awayScore ?? null}
          finished={finished}
        />
      </div>

      {finished && pred && (
        <div className="mt-1.5 text-[10px] uppercase tracking-wider" style={{ color: "rgba(241,180,52,0.55)", fontFamily: "'Courier New', monospace" }}>
          twój typ: {pred.homeScore}:{pred.awayScore}
        </div>
      )}

      <div className="mt-2 sm:mt-3 flex items-center gap-1 flex-wrap pr-12">
        {live && <LiveChip small />}
        {finished ? (
          <span className="chip-after-match">
            <span className="sm:hidden">Koniec</span>
            <span className="hidden sm:inline">Po meczu</span>
          </span>
        ) : pred ? (
          <span className="chip-accepted">
            <span className="sm:hidden">Typ ok</span>
            <span className="hidden sm:inline">Zaakceptowano</span>
          </span>
        ) : (
          <span className="chip-no-pick">
            <span className="sm:hidden">Typuj</span>
            <span className="hidden sm:inline">Brak typu</span>
          </span>
        )}
        {boosted && <span className="chip-boost">x3</span>}
        {locked && !finished && <span className="chip-lock">Lock</span>}
        {finished && pred && (
          <span className={`chip-pts ${pred.pointsAwarded > 0 ? "" : "zero"}`}>
            {boosted ? pred.pointsAwarded * 3 : pred.pointsAwarded} pkt
          </span>
        )}
      </div>
      </div>

      {/* Quick boost button - z-index ponad Link */}
      {canBoost && (
        <form action={quickBoostAction} className="absolute bottom-2 right-2 z-20">
          <input type="hidden" name="matchId" value={m.id} />
          <input type="hidden" name="action" value={boosted ? "unset" : "set"} />
          <button
            type="submit"
            title={
              boosted
                ? "Zdejmij boost x3"
                : boostedMatchInMd
                ? "Przenieś boost x3 na ten mecz"
                : "Daj boost x3 na ten mecz"
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition active:scale-90 ${
              boosted
                ? "bg-wc-gold text-wc-ink shadow-lg shadow-wc-gold/30 boost-lightning"
                : "bg-app-hover hover:bg-wc-gold/20 text-app-muted hover:text-wc-gold"
            }`}
          >
            ⚡
          </button>
        </form>
      )}
    </div>
  );
}

function TeamRow({
  flag, shortCode, name, score, finished,
}: { flag: string; shortCode: string; name: string; score: number | null; finished?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <Flag emoji={flag} size="md" />
        <span className="font-bold truncate text-white">
          <span className="sm:hidden">{shortCode}</span>
          <span className="hidden sm:inline">{name}</span>
        </span>
      </div>
      <span
        className="score-stadium text-xl sm:text-2xl shrink-0"
        style={{
          color: finished ? "#F1B434" : "white",
          textShadow: finished ? "0 0 8px rgba(241,180,52,0.5)" : "none",
        }}
      >
        {score ?? <span style={{ color: "rgba(255,255,255,0.2)" }}>-</span>}
      </span>
    </div>
  );
}
