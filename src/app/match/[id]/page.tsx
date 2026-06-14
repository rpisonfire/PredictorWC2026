import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PlayerPicker } from "@/components/PlayerPicker";
import { PlayerAvatar, PositionLegend } from "@/components/PlayerAvatar";
import { fmtDateTime, fmtDateTimeLong } from "@/lib/dates";

function positionOrder(pos?: string | null): number {
  if (!pos) return 5;
  const p = pos.toLowerCase();
  if (p.includes("goal")) return 1;
  if (p.includes("defence") || p.includes("defender") || p.includes("back")) return 2;
  if (p.includes("midfield")) return 3;
  if (p.includes("forward") || p.includes("attack") || p.includes("offence") || p.includes("striker") || p.includes("winger")) return 4;
  return 5;
}

function sortByPosition<T extends { position?: string | null; name: string }>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    const oa = positionOrder(a.position);
    const ob = positionOrder(b.position);
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
}
import { isLive } from "@/lib/matchStatus";
import { LiveChip } from "@/components/LiveChip";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Flag } from "@/components/Flag";
import { Emoji } from "@/components/Emoji";
import { UserPickSearch } from "@/components/UserPickSearch";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";

async function savePrediction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const matchId = String(formData.get("matchId"));
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;

  // Lock 5 min before kickoff
  if (match.kickoff.getTime() - Date.now() < 5 * 60 * 1000) return;

  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const firstScorerTeam = String(formData.get("firstScorerTeam") || "NONE");
  const firstGoalPlayerId = String(formData.get("firstGoalPlayerId") || "") || null;
  const wantBoost = formData.get("boost") === "on";

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { homeScore, awayScore, firstScorerTeam, firstGoalPlayerId },
    create: { userId: user.id, matchId, homeScore, awayScore, firstScorerTeam, firstGoalPlayerId },
  });

  // Boost handling:
  // - Można dowolnie przenosić między meczami w kolejce DOPÓKI żaden mecz się nie zaczął
  // - Boost na meczu który już zaczął/skończony jest ZABLOKOWANY (nie można zdjąć, nie można dać innym)
  const existing = await prisma.boost.findUnique({
    where: { userId_matchday: { userId: user.id, matchday: match.matchday } },
    include: { match: true },
  });
  // "Started" = mecz już za 5 min lub mniej (synchronizacja z lockiem typowania)
  const thisMatchStarted = match.kickoff.getTime() - Date.now() < 5 * 60 * 1000;
  const existingMatchStarted = existing && existing.match.kickoff.getTime() - Date.now() < 5 * 60 * 1000;

  if (wantBoost) {
    if (thisMatchStarted) {
      // Nie wolno dawać boosta na mecz który już się zaczął
    } else if (!existing) {
      await prisma.boost.create({ data: { userId: user.id, matchId, matchday: match.matchday } });
    } else if (existing.matchId !== matchId) {
      if (!existingMatchStarted) {
        // Przenieś boost na inny mecz
        await prisma.boost.delete({ where: { id: existing.id } });
        await prisma.boost.create({ data: { userId: user.id, matchId, matchday: match.matchday } });
      }
      // else: stary boost zablokowany (mecz w toku/po), nie można przenieść
    }
    // else: boost już jest na tym meczu, nic nie robimy
  } else {
    // Chce zdjąć boost
    if (existing && existing.matchId === matchId && !existingMatchStarted) {
      await prisma.boost.delete({ where: { id: existing.id } });
    }
    // else: nie można zdjąć boosta z meczu który już się zaczął
  }

  revalidatePath("/dashboard");
  revalidatePath(`/match/${matchId}`);
  redirect(`/dashboard?toast=saved`);
}

async function postComment(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const matchId = String(formData.get("matchId"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 500);
  if (!body) return;
  await prisma.comment.create({ data: { userId: user.id, matchId, body } });
  revalidatePath(`/match/${matchId}`);
  redirect(`/match/${matchId}?toast=commented#czat`);
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      predictions: { where: { userId: user.id }, include: { player: true } },
      boosts: { where: { userId: user.id } },
      comments: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!match) notFound();

  const pred = match.predictions[0];
  const boosted = match.boosts.length > 0;
  const locked = match.kickoff.getTime() - Date.now() < 5 * 60 * 1000;
  const finished = match.homeScore !== null && match.awayScore !== null;
  const revealOthers = locked || finished;

  // Wszystkie dodatkowe równolegle
  const [matchdayBoost, othersPredictions, allBoostsForMatch, crowdAggregate, teamFormMatches] = await Promise.all([
    prisma.boost.findUnique({
      where: { userId_matchday: { userId: user.id, matchday: match.matchday } },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
    }),
    revealOthers
      ? prisma.prediction.findMany({
          where: { matchId: match.id, NOT: { userId: user.id } },
          include: { user: true, player: true },
          orderBy: { pointsAwarded: "desc" },
        })
      : Promise.resolve([] as any[]),
    revealOthers
      ? prisma.boost.findMany({ where: { matchId: match.id } })
      : Promise.resolve([] as any[]),
    // Wisdom of the crowd - przed lockiem agreguj typy innych (tylko wyniki, anonimowo)
    !revealOthers && !finished
      ? prisma.prediction.findMany({
          where: { matchId: match.id, NOT: { userId: user.id } },
          select: { homeScore: true, awayScore: true },
        })
      : Promise.resolve([] as { homeScore: number; awayScore: number }[]),
    // Forma drużyn - mecze WC obu drużyn rozegrane przed bieżącym
    prisma.match.findMany({
      where: {
        kickoff: { lt: match.kickoff },
        homeScore: { not: null },
        OR: [
          { homeTeamId: match.homeTeamId },
          { awayTeamId: match.homeTeamId },
          { homeTeamId: match.awayTeamId },
          { awayTeamId: match.awayTeamId },
        ],
      },
      select: {
        id: true, kickoff: true,
        homeScore: true, awayScore: true,
        homeTeamId: true, awayTeamId: true,
        homeTeam: { select: { shortCode: true, flag: true } },
        awayTeam: { select: { shortCode: true, flag: true } },
      },
      orderBy: { kickoff: "desc" },
      take: 10,
    }),
  ]);

  // Agreguj wisdom: zlicz typy per wynik, posortuj DESC, weź top 3 (z minimum 2 głosów)
  const crowdTop: { score: string; count: number }[] = [];
  if (crowdAggregate.length >= 2) {
    const tally = new Map<string, number>();
    for (const p of crowdAggregate) {
      const key = `${p.homeScore}:${p.awayScore}`;
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    crowdTop.push(
      ...Array.from(tally.entries())
        .map(([score, count]) => ({ score, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    );
  }

  // Forma drużyn: ostatnie 5 dla każdej, oznacz W/D/L z perspektywy tej drużyny
  type FormItem = { result: "W" | "D" | "L"; opponent: string; opponentFlag: string; score: string };
  const formFor = (teamId: string): FormItem[] => {
    const items: FormItem[] = [];
    for (const m of teamFormMatches) {
      if (m.homeTeamId !== teamId && m.awayTeamId !== teamId) continue;
      const isHome = m.homeTeamId === teamId;
      const my = isHome ? m.homeScore! : m.awayScore!;
      const opp = isHome ? m.awayScore! : m.homeScore!;
      const oppTeam = isHome ? m.awayTeam : m.homeTeam;
      const result: "W" | "D" | "L" = my > opp ? "W" : my === opp ? "D" : "L";
      items.push({
        result,
        opponent: oppTeam.shortCode,
        opponentFlag: oppTeam.flag,
        score: `${my}:${opp}`,
      });
      if (items.length === 5) break;
    }
    return items;
  };
  const homeForm = formFor(match.homeTeamId);
  const awayForm = formFor(match.awayTeamId);
  const showForm = homeForm.length > 0 || awayForm.length > 0;
  const boostOnThisMatch = matchdayBoost?.matchId === match.id;
  // Mecz zaczął się (lub jest po) - nie można edytować boosta na tym meczu
  // "Started" = 5 min lub mniej do gwizdka, blokada zgodna z typowaniem
  const thisMatchStarted = match.kickoff.getTime() - Date.now() < 5 * 60 * 1000;
  const otherBoostMatchStarted = !!matchdayBoost && !boostOnThisMatch && matchdayBoost.match.kickoff.getTime() - Date.now() < 5 * 60 * 1000;
  const boostedUserIds = new Set(allBoostsForMatch.map((b) => b.userId));
  const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];

  const live = isLive(match.kickoff, finished);

  return (
    <section className="max-w-2xl mx-auto">
      {/* AutoRefresh wyłączony - user sam F5 jak chce sprawdzić wynik live */}
      {finished && pred && pred.homeScore === match.homeScore && pred.awayScore === match.awayScore && (
        <ConfettiCelebration matchId={match.id} gold={boosted} />
      )}
      <div className="card p-6">
        <div className="flex justify-between items-center text-xs text-app-subtle">
          <span>{match.stage} · Kolejka {match.matchday}</span>
          <div className="flex items-center gap-2">
            {live && <LiveChip small />}
            <span>{fmtDateTimeLong(match.kickoff)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-center">
          <div className="flex-1">
            <Flag emoji={match.homeTeam.flag} size="xl" alt={match.homeTeam.name} className="mx-auto" />
            <div className="font-black mt-1">{match.homeTeam.name}</div>
          </div>
          <div className="px-3 text-3xl font-black text-app-subtle">
            {finished ? `${match.homeScore} : ${match.awayScore}` : "vs"}
          </div>
          <div className="flex-1">
            <Flag emoji={match.awayTeam.flag} size="xl" alt={match.awayTeam.name} className="mx-auto" />
            <div className="font-black mt-1">{match.awayTeam.name}</div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card p-4 mt-4">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-3">📈 Forma na mundialu</div>
          <div className="space-y-3">
            <TeamFormRow flag={match.homeTeam.flag} code={match.homeTeam.shortCode} form={homeForm} />
            <TeamFormRow flag={match.awayTeam.flag} code={match.awayTeam.shortCode} form={awayForm} />
          </div>
        </div>
      )}

      {crowdTop.length > 0 && (
        <div className="card p-4 mt-4">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-3">
            🔮 Tłum typuje (anonimowo, top wyniki)
          </div>
          <div className="space-y-2">
            {crowdTop.map((c) => {
              const max = crowdTop[0].count;
              const pct = Math.round((c.count / max) * 100);
              return (
                <div key={c.score} className="flex items-center gap-3">
                  <div className="font-black text-lg tabular-nums w-14">{c.score}</div>
                  <div className="flex-1 h-2 rounded-full bg-app-hover overflow-hidden">
                    <div className="h-full bg-wc-gold" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-app-subtle tabular-nums w-12 text-right">
                    {c.count} {c.count === 1 ? "głos" : c.count < 5 ? "głosy" : "głosów"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!locked ? (
        <form action={savePrediction} className="card p-6 mt-4 space-y-5">
          <input type="hidden" name="matchId" value={match.id} />
          <h2 className="font-black text-lg">Twój typ</h2>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold">{match.homeTeam.shortCode}</span>
              <input
                type="number" name="homeScore" min={0} max={20} required
                defaultValue={pred?.homeScore ?? ""}
                className="input mt-1 text-center text-2xl font-black"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">{match.awayTeam.shortCode}</span>
              <input
                type="number" name="awayScore" min={0} max={20} required
                defaultValue={pred?.awayScore ?? ""}
                className="input mt-1 text-center text-2xl font-black"
              />
            </label>
          </div>

          <div>
            <span className="text-sm font-semibold">Pierwsza drużyna która strzeli bramkę</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { val: "HOME", label: `${match.homeTeam.flag} ${match.homeTeam.shortCode}` },
                { val: "NONE", label: "0 : 0" },
                { val: "AWAY", label: `${match.awayTeam.shortCode} ${match.awayTeam.flag}` },
              ].map((opt) => (
                <label key={opt.val} className="cursor-pointer">
                  <input
                    type="radio" name="firstScorerTeam" value={opt.val}
                    defaultChecked={pred?.firstScorerTeam === opt.val}
                    className="peer sr-only"
                  />
                  <span className="block text-center font-bold py-2 rounded-xl border border-app peer-checked:bg-wc-blue peer-checked:text-white peer-checked:border-wc-blue">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold">Pierwszy strzelec meczu</span>
            <div className="mt-1">
              <PlayerPicker
                name="firstGoalPlayerId"
                defaultValue={pred?.firstGoalPlayerId}
                groups={[
                  { name: match.homeTeam.name, flag: match.homeTeam.flag, players: sortByPosition(match.homeTeam.players) },
                  { name: match.awayTeam.name, flag: match.awayTeam.flag, players: sortByPosition(match.awayTeam.players) },
                ]}
              />
              <div className="mt-2">
                <PositionLegend />
              </div>
            </div>
          </div>

          {/* BOOST UI */}
          {boostOnThisMatch && thisMatchStarted ? (
            // Boost na tym meczu, mecz już się zaczął - zablokowany
            <div className="flex items-center gap-3 rounded-xl border border-wc-gold/60 bg-wc-gold/10 p-4">
              <input type="hidden" name="boost" value="on" />
              <div className="text-2xl">🔒</div>
              <div className="text-sm">
                <div className="font-black text-wc-gold">Boost x3 zablokowany na tym meczu</div>
                <div className="text-app-muted">Mecz już się rozpoczął - boost został utrwalony.</div>
              </div>
            </div>
          ) : otherBoostMatchStarted ? (
            // Boost na innym meczu kolejki ale tamten już się zaczął - nie można przenieść
            <div className="flex items-center gap-3 rounded-xl border border-app bg-app-hover p-4 opacity-60">
              <div className="text-2xl">🔒</div>
              <div className="text-sm">
                <div className="font-black">Boost zablokowany w kolejce {match.matchday}</div>
                <div className="text-app-muted">
                  Boost stoi na meczu{" "}
                  <a href={`/match/${matchdayBoost.matchId}`} className="text-wc-gold underline">
                    {matchdayBoost.match.homeTeam.shortCode} vs {matchdayBoost.match.awayTeam.shortCode}
                  </a>{" "}
                  który już się rozpoczął - nie można przenieść.
                </div>
              </div>
            </div>
          ) : thisMatchStarted ? (
            // Ten mecz zaczął się, boost nie był ustawiony - nie można już dać
            <div className="flex items-center gap-3 rounded-xl border border-app bg-app-hover p-4 opacity-60">
              <div className="text-2xl">⏰</div>
              <div className="text-sm">
                <div className="font-black">Boost niedostępny</div>
                <div className="text-app-muted">Mecz już się rozpoczął - za późno na boost.</div>
              </div>
            </div>
          ) : (
            // Możesz wybrać/zmienić - mecz jeszcze się nie zaczął
            <label className="flex items-center gap-3 rounded-xl border border-dashed border-wc-gold/60 bg-app-hover p-4 cursor-pointer hover:bg-app-hover">
              <input type="checkbox" name="boost" defaultChecked={boostOnThisMatch} className="h-5 w-5 accent-wc-red" />
              <div>
                <div className="font-black text-wc-red">
                  {boostOnThisMatch ? "⚡ Boost x3 aktywny na tym meczu" : matchdayBoost ? "⚡ Przenieś boost x3 na ten mecz" : "Boost x3 ⚡"}
                </div>
                <div className="text-xs text-app-muted">
                  {boostOnThisMatch
                    ? "Odznacz żeby zdjąć boost. Możesz też wybrać inny mecz tej kolejki."
                    : matchdayBoost
                    ? `Boost obecnie na ${matchdayBoost.match.homeTeam.shortCode} vs ${matchdayBoost.match.awayTeam.shortCode}. Zaznacz żeby przenieść tutaj.`
                    : "Pomnóż punkty z tego meczu razy 3. Jeden boost na kolejkę. Możesz zmieniać do gwizdka."}
                </div>
              </div>
            </label>
          )}

          <div className="rounded-xl bg-app-hover border border-app p-3 text-xs text-app-muted">
            💡 <b>Wskazówka:</b> wybierz <b>pierwszą drużynę</b> która strzeli (+2 pkt) i <b>strzelca</b> pierwszego gola (+5 pkt) żeby zmaksymalizować punkty z meczu.
          </div>

          <button className="btn-primary w-full">Zapisz typ</button>
        </form>
      ) : (
        <div className="card p-6 mt-4">
          <div className="font-black text-center">Typowanie zamknięte 🔒</div>
          {pred ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-center gap-2 text-lg">
                <span>Twój typ:</span>
                <b className="text-2xl tabular-nums">{pred.homeScore} : {pred.awayScore}</b>
                {boosted && <span className="chip bg-wc-gold/15 text-wc-gold">x3 ⚡</span>}
              </div>
              <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
                {pred.firstScorerTeam && pred.firstScorerTeam !== "NONE" && (
                  <span className="chip bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    1. drużyna ze strzałem:{" "}
                    <b className="ml-1">
                      {pred.firstScorerTeam === "HOME" ? match.homeTeam.shortCode : match.awayTeam.shortCode}
                    </b>
                  </span>
                )}
                {pred.firstScorerTeam === "NONE" && (
                  <span className="chip bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    1. drużyna ze strzałem: <b className="ml-1">0:0</b>
                  </span>
                )}
                {pred.player ? (
                  <div className="chip bg-app-hover flex items-center gap-1.5 pl-1">
                    <PlayerAvatar
                      name={pred.player.name}
                      photoUrl={pred.player.photoUrl}
                      position={pred.player.position}
                      size={20}
                    />
                    <span>1. strzelec: <b>{pred.player.name}</b></span>
                  </div>
                ) : (
                  <span className="chip bg-app-hover text-app-subtle">brak typu na strzelca</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-app-subtle text-center">Nie wytypowałeś tego meczu.</div>
          )}
        </div>
      )}

      {revealOthers && othersPredictions.length > 0 && (
        finished ? (
          <div className="mt-4">
            <UserPickSearch
              homeShort={match.homeTeam.shortCode}
              awayShort={match.awayTeam.shortCode}
              result={{
                homeScore: match.homeScore!,
                awayScore: match.awayScore!,
                firstScorerTeam:
                  match.firstScorerTeamId === match.homeTeamId ? "HOME"
                  : match.firstScorerTeamId === match.awayTeamId ? "AWAY"
                  : "NONE",
                firstGoalPlayerId: match.firstGoalPlayerId,
              }}
              picks={[
                ...othersPredictions.map((op) => ({
                  userId: op.userId,
                  nickname: op.user.nickname,
                  avatar: op.user.avatar,
                  homeScore: op.homeScore,
                  awayScore: op.awayScore,
                  firstScorerTeam: (op.firstScorerTeam as "HOME" | "AWAY" | "NONE" | null) ?? null,
                  firstGoalPlayer: op.player
                    ? { id: op.player.id, name: op.player.name, photoUrl: op.player.photoUrl, position: op.player.position }
                    : null,
                  pointsAwarded: op.pointsAwarded,
                  boosted: boostedUserIds.has(op.userId),
                })),
              ].sort((a, b) => (b.boosted ? b.pointsAwarded * 3 : b.pointsAwarded) - (a.boosted ? a.pointsAwarded * 3 : a.pointsAwarded))}
            />
          </div>
        ) : (
          <div className="card p-6 mt-4">
            <h2 className="font-black text-lg mb-3">👀 Typy innych</h2>
            <ul className="space-y-2">
              {othersPredictions.map((op) => {
                const opBoosted = boostedUserIds.has(op.userId);
                return (
                  <li key={op.id} className="flex items-center gap-3 py-2 border-b border-app last:border-0">
                    <Emoji char={op.user.avatar} size="md" alt={op.user.nickname} />
                    <span className="font-bold flex-1">{op.user.nickname}</span>
                    <span className="font-black text-lg">{op.homeScore} : {op.awayScore}</span>
                    {op.player && (
                      <span className="hidden sm:flex items-center gap-1.5 chip bg-app-hover">
                        <PlayerAvatar name={op.player.name} photoUrl={op.player.photoUrl} size={18} />
                        <span className="text-xs">{op.player.name}</span>
                      </span>
                    )}
                    {opBoosted && <span className="chip bg-wc-gold/15 text-wc-gold">x3</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}

      <div className="card p-6 mt-4">
        <h2 className="font-black text-lg mb-3">💬 Czat meczowy</h2>
        <form action={postComment} className="flex gap-2 mb-4">
          <input type="hidden" name="matchId" value={match.id} />
          <input name="body" required maxLength={500} placeholder="Napisz coś..." className="input" />
          <button className="btn-primary">Wyślij</button>
        </form>
        <ul className="space-y-3">
          {match.comments.length === 0 && (
            <li className="text-sm text-app-subtle">Brak komentarzy. Rzuć pierwszą zaczepkę 🔥</li>
          )}
          {match.comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Emoji char={c.user.avatar} size="md" alt={c.user.nickname} />
              <div>
                <div className="text-sm">
                  <b>{c.user.nickname}</b>
                  <span className="text-app-subtle ml-2">{fmtDateTime(c.createdAt)}</span>
                </div>
                <div className="text-sm">{c.body}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TeamFormRow({
  flag, code, form,
}: {
  flag: string; code: string;
  form: { result: "W" | "D" | "L"; opponent: string; opponentFlag: string; score: string }[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-24 shrink-0">
        <Flag emoji={flag} size="sm" />
        <span className="font-bold text-sm">{code}</span>
      </div>
      {form.length === 0 ? (
        <div className="text-xs text-app-subtle">Pierwszy mecz na turnieju</div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          {form.map((f, i) => {
            const color =
              f.result === "W" ? "bg-wc-green/20 text-wc-green border-wc-green/30"
              : f.result === "L" ? "bg-wc-red/15 text-wc-red border-wc-red/30"
              : "bg-app-hover text-app-subtle border-app";
            return (
              <span
                key={i}
                title={`vs ${f.opponent} ${f.score}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-black tabular-nums ${color}`}
              >
                {f.result}
                <span className="text-[10px] font-normal opacity-70">{f.score}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
