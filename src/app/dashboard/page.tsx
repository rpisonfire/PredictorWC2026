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
  const byMatchday = matches.reduce<Record<number, typeof matches>>((acc, m) => {
    (acc[m.matchday] ||= []).push(m);
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
      <p className="text-app-muted mb-4">
        Cześć <b>{user.nickname}</b>. Poniżej znajdziesz mecze Mistrzostw Świata 2026. Wytypuj wynik, drużynę, która jako pierwsza trafi do siatki rywali, a nawet gracza, który otworzy wynik spotkania. Użyj boosta, aby odskoczyć rywalom w tabeli. Pamiętaj, że możliwość obstawiania zamyka się na 5 minut przed pierwszym gwizdkiem, powodzenia!
      </p>

      {nextMatch && hoursToNext !== null && hoursToNext < 48 && (
        <div className="card p-4 mb-6 flex items-center gap-4 border-wc-gold/30 bg-wc-gold/5">
          <div className="text-3xl">⏰</div>
          <div className="flex-1">
            <div className="font-black flex items-center gap-1.5 flex-wrap">
              <span>Najbliższy mecz:</span>
              <Flag emoji={nextMatch.homeTeam.flag} size="sm" />
              <span>{nextMatch.homeTeam.shortCode} vs {nextMatch.awayTeam.shortCode}</span>
              <Flag emoji={nextMatch.awayTeam.flag} size="sm" />
            </div>
            <div className="text-sm text-app-muted">
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
            <div className="font-black">Hola hola, mundial się jeszcze nie zaczął</div>
            <p className="text-sm text-app-subtle mt-1">Dziś nie ma żadnego meczu. Wracaj za parę dni 😎</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {todayMatches.map((m) => {
              const pred = m.predictions[0];
              const locked = m.kickoff.getTime() - now.getTime() < 5 * 60 * 1000;
              const boosted = m.boosts.length > 0;
              return (
                <MatchCard key={m.id} m={m} pred={pred} boosted={boosted} locked={locked} highlight boostedMatchInMd={boostByMatchday.get(m.matchday)} quickBoostAction={quickBoost} />

              );
            })}
          </div>
        )}
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
        return (
          <div key={md} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black">Kolejka {md}</h2>
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
                <div className="opacity-80">{renderCards(finished)}</div>
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
    <div className={`card p-3 sm:p-4 transition relative ${highlight ? "border-wc-red/20" : ""}`}>
      <Link href={`/match/${m.id}`} className="absolute inset-0 z-0" aria-label={`${m.homeTeam.name} vs ${m.awayTeam.name}`} />
      <div className="relative z-10 pointer-events-none">
      <div className="flex items-center justify-between text-[11px] sm:text-xs text-app-subtle">
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
          color={finished ? "text-wc-gold" : "text-app"}
        />
        <TeamRow
          flag={m.awayTeam.flag}
          shortCode={m.awayTeam.shortCode}
          name={m.awayTeam.name}
          score={finished ? m.awayScore : pred?.awayScore ?? null}
          color={finished ? "text-wc-gold" : "text-app"}
        />
      </div>

      {finished && pred && (
        <div className="mt-1.5 text-[10px] text-app-subtle uppercase tracking-wider">
          twój typ: {pred.homeScore}:{pred.awayScore}
        </div>
      )}

      <div className="mt-2 sm:mt-3 flex items-center gap-1.5 flex-wrap">
        {live && <LiveChip small />}
        {finished ? (
          <span className="chip bg-wc-gold/15 text-wc-gold text-[10px]">Po meczu</span>
        ) : pred ? (
          <span className="chip bg-wc-green/15 text-wc-green text-[10px] font-black">
            Zaakceptowano ✓
          </span>
        ) : (
          <span className="chip bg-wc-red/10 text-wc-red text-[10px]">Brak typu</span>
        )}
        {boosted && <span className="chip bg-wc-gold/15 text-wc-gold text-[10px]">x3 ⚡</span>}
        {locked && !finished && <span className="chip bg-app-hover text-app-muted text-[10px]">🔒</span>}
        {finished && pred && (
          <span className={`chip text-[10px] ${pred.pointsAwarded > 0 ? "bg-wc-green/15 text-wc-green" : "bg-app-hover text-app-subtle"}`}>
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
                ? "bg-wc-gold text-wc-ink shadow-lg shadow-wc-gold/30"
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
