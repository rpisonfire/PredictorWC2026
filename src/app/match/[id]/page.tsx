import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PlayerPicker } from "@/components/PlayerPicker";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { fmtDateTime, fmtDateTimeLong } from "@/lib/dates";
import { isLive } from "@/lib/matchStatus";
import { LiveChip } from "@/components/LiveChip";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Flag } from "@/components/Flag";
import { Emoji } from "@/components/Emoji";

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

  // Boost handling: one per matchday - locked once picked, no changes allowed
  const existing = await prisma.boost.findUnique({
    where: { userId_matchday: { userId: user.id, matchday: match.matchday } },
  });
  if (wantBoost && !existing) {
    await prisma.boost.create({ data: { userId: user.id, matchId, matchday: match.matchday } });
  }
  // if existing - do nothing; locked for the matchday

  revalidatePath("/dashboard");
  revalidatePath(`/match/${matchId}`);
  redirect(`/dashboard?saved=1`);
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
      predictions: { where: { userId: user.id } },
      boosts: { where: { userId: user.id } },
      comments: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!match) notFound();

  const pred = match.predictions[0];
  const boosted = match.boosts.length > 0;
  const locked = match.kickoff.getTime() - Date.now() < 5 * 60 * 1000;
  const finished = match.homeScore !== null && match.awayScore !== null;

  // Boost lock state for the matchday
  const matchdayBoost = await prisma.boost.findUnique({
    where: { userId_matchday: { userId: user.id, matchday: match.matchday } },
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
  });
  const boostLocked = !!matchdayBoost;
  const boostOnThisMatch = matchdayBoost?.matchId === match.id;

  // Show others' predictions once locked (or finished)
  const revealOthers = locked || finished;
  const othersPredictions = revealOthers
    ? await prisma.prediction.findMany({
        where: { matchId: match.id, NOT: { userId: user.id } },
        include: { user: true, player: true },
        orderBy: { pointsAwarded: "desc" },
      })
    : [];
  const allBoostsForMatch = revealOthers
    ? await prisma.boost.findMany({ where: { matchId: match.id } })
    : [];
  const boostedUserIds = new Set(allBoostsForMatch.map((b) => b.userId));
  const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];

  const live = isLive(match.kickoff, finished);

  return (
    <section className="max-w-2xl mx-auto">
      {live && <AutoRefresh intervalSec={60} />}
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
                  { name: match.homeTeam.name, flag: match.homeTeam.flag, players: match.homeTeam.players },
                  { name: match.awayTeam.name, flag: match.awayTeam.flag, players: match.awayTeam.players },
                ]}
              />
            </div>
          </div>

          {boostLocked && !boostOnThisMatch ? (
            <div className="flex items-center gap-3 rounded-xl border border-app bg-app-hover p-4 opacity-60">
              <div className="text-2xl">🔒</div>
              <div className="text-sm">
                <div className="font-black">Boost już użyty w kolejce {match.matchday}</div>
                <div className="text-app-muted">
                  Na meczu{" "}
                  <a href={`/match/${matchdayBoost.matchId}`} className="text-wc-gold underline">
                    {matchdayBoost.match.homeTeam.flag} {matchdayBoost.match.homeTeam.shortCode} vs {matchdayBoost.match.awayTeam.shortCode} {matchdayBoost.match.awayTeam.flag}
                  </a>{" "}
                  - nie można zmienić.
                </div>
              </div>
            </div>
          ) : boostOnThisMatch ? (
            <div className="flex items-center gap-3 rounded-xl border border-wc-gold/60 bg-wc-gold/10 p-4">
              <input type="hidden" name="boost" value="on" />
              <div className="text-2xl">⚡</div>
              <div className="text-sm">
                <div className="font-black text-wc-gold">Boost x3 aktywny na tym meczu</div>
                <div className="text-app-muted">Zablokowany - nie można cofnąć w tej kolejce.</div>
              </div>
            </div>
          ) : (
            <label className="flex items-center gap-3 rounded-xl border border-dashed border-wc-gold/60 bg-app-hover p-4 cursor-pointer hover:bg-app-hover">
              <input type="checkbox" name="boost" className="h-5 w-5 accent-wc-red" />
              <div>
                <div className="font-black text-wc-red">Boost x3 ⚡</div>
                <div className="text-xs text-app-muted">Pomnóż punkty z tego meczu razy 3. Jeden boost na kolejkę - <b>raz wybrany, zablokowany</b>.</div>
              </div>
            </label>
          )}

          <div className="rounded-xl bg-app-hover border border-app p-3 text-xs text-app-muted">
            💡 <b>Wskazówka:</b> wybierz <b>pierwszą drużynę</b> która strzeli (+2 pkt) i <b>strzelca</b> pierwszego gola (+5 pkt) żeby zmaksymalizować punkty z meczu.
          </div>

          <button className="btn-primary w-full">Zapisz typ</button>
        </form>
      ) : (
        <div className="card p-6 mt-4 text-center">
          <div className="font-black">Typowanie zamknięte 🔒</div>
          {pred && (
            <div className="mt-2 text-lg">
              Twój typ: <b>{pred.homeScore} : {pred.awayScore}</b>
              {boosted && <span className="ml-2 chip bg-wc-gold/15 text-wc-gold">x3 ⚡</span>}
            </div>
          )}
        </div>
      )}

      {revealOthers && othersPredictions.length > 0 && (
        <div className="card p-6 mt-4">
          <h2 className="font-black text-lg mb-3">👀 Typy innych</h2>
          <ul className="space-y-2">
            {othersPredictions.map((op) => {
              const opBoosted = boostedUserIds.has(op.userId);
              const opPts = opBoosted ? op.pointsAwarded * 3 : op.pointsAwarded;
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
                  {finished && (
                    <span className={`chip ${opPts > 0 ? "bg-wc-green/15 text-wc-green" : "bg-app-hover text-app-subtle"}`}>
                      {opPts} pkt
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
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
