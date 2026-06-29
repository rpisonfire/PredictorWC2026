import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { scorePrediction } from "@/lib/scoring";
import { hashPassword } from "@/lib/password";
import { getCurrentUser } from "@/lib/session";
import { fmtDate, fmtDateTimeLong } from "@/lib/dates";
import { sendPushToAll, sendPushToUser } from "@/lib/push";
import { matchGlowStyle } from "@/lib/teamColors";
import { prettyStage, isKnockoutStage } from "@/lib/stageLabel";
import { ADVANCEMENT, STAGE_FIRST_MATCH, bracketStageFromLabel, r16FifaNumber, stageOfFifaM, type BracketStage } from "@/lib/wc2026Bracket";
import { syncFinishedResults, syncSchedule } from "@/lib/syncResults";
import { cookies } from "next/headers";
import { Emoji } from "@/components/Emoji";
import { Flag } from "@/components/Flag";
import { PlayerPicker } from "@/components/PlayerPicker";
import { TeamRadioPicker } from "@/components/TeamRadioPicker";

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

export const dynamic = "force-dynamic";

async function setResult(formData: FormData) {
  "use server";
  const matchId = String(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const firstScorerTeam = String(formData.get("firstScorerTeam") || "NONE") as "HOME" | "AWAY" | "NONE";
  const firstGoalPlayerId = String(formData.get("firstGoalPlayerId") || "") || null;
  // Karne - zapisujemy tylko gdy podane oba pola (puste = brak karnych)
  const rawHomeSO = String(formData.get("homeShootoutScore") || "");
  const rawAwaySO = String(formData.get("awayShootoutScore") || "");
  const homeShootoutScore = rawHomeSO === "" ? null : Number(rawHomeSO);
  const awayShootoutScore = rawAwaySO === "" ? null : Number(rawAwaySO);

  // Pobierz mecz żeby zmapować HOME/AWAY na konkretne ID drużyn
  const matchRec = await prisma.match.findUnique({ where: { id: matchId } });
  if (!matchRec) return;
  const firstScorerTeamId =
    firstScorerTeam === "HOME" ? matchRec.homeTeamId
    : firstScorerTeam === "AWAY" ? matchRec.awayTeamId
    : null;

  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, homeShootoutScore, awayShootoutScore, firstScorerTeamId, firstGoalPlayerId },
  });

  // Propagacja awansu - jeżeli to mecz knockout, wpisz zwycięzcę do kolejnej rundy.
  // football-data nadpisze później to samo, ale dzięki temu drabinka ma teamy natychmiast po wpisaniu wyniku.
  await propagateAdvancement(matchId, homeScore, awayScore, homeShootoutScore, awayShootoutScore);

  // Recalculate points for all predictions on this match
  const preds = await prisma.prediction.findMany({ where: { matchId } });
  for (const p of preds) {
    const pts = scorePrediction(
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        firstScorerTeam: (p.firstScorerTeam as any) ?? null,
        firstGoalPlayerId: p.firstGoalPlayerId,
      },
      { homeScore, awayScore, firstScorerTeam, firstGoalPlayerId }
    );
    await prisma.prediction.update({ where: { id: p.id }, data: { pointsAwarded: pts } });
  }

  // Snapshot pozycji w globalnym rankingu - dla chipa "wskoczyłeś o X miejsc" na dashboardzie
  await snapshotRanking();

  // Po wpisaniu wyniku wszystkie strony zależne odświeżają się natychmiast
  revalidatePath("/leaderboard");
  revalidatePath("/groups");
  revalidatePath("/bracket");
  revalidatePath("/stats");
  revalidatePath("/dashboard");
  revalidatePath("/my-predictions");
  revalidatePath("/admin");
  redirect("/admin?toast=resultSaved");
}

// Identyfikuje mecz po FIFA M number (M73-M104) wykorzystując:
// - r16: para drużyn (lookup w R16_PAIR_TO_FIFA)
// - r8/qf/sf: pozycja po kickoff (idx + STAGE_FIRST_MATCH)
async function fifaMNumberOfMatch(matchId: string): Promise<number | null> {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: { select: { shortCode: true } }, awayTeam: { select: { shortCode: true } } },
  });
  if (!m) return null;
  const stage = bracketStageFromLabel(prettyStage(m.stage));
  if (!stage) return null;
  if (stage === "r16") {
    return r16FifaNumber(m.homeTeam.shortCode, m.awayTeam.shortCode);
  }
  if (stage === "final") return 104;
  if (stage === "bronze") return 103;
  // Dla r8/qf/sf: posortuj mecze tej fazy po kickoff i zwróć idx + STAGE_FIRST_MATCH
  const all = await prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    orderBy: { kickoff: "asc" },
    select: { id: true, stage: true },
  });
  const inStage = all.filter((x) => bracketStageFromLabel(prettyStage(x.stage)) === stage);
  const idx = inStage.findIndex((x) => x.id === matchId);
  if (idx < 0) return null;
  return STAGE_FIRST_MATCH[stage] + idx;
}

// Znajduje DB id meczu odpowiadającego FIFA M number.
async function findMatchByFifaM(num: number): Promise<string | null> {
  const stage = stageOfFifaM(num);
  if (!stage) return null;
  const all = await prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    orderBy: { kickoff: "asc" },
    select: { id: true, stage: true },
  });
  const inStage = all.filter((x) => bracketStageFromLabel(prettyStage(x.stage)) === stage);
  const idx = num - STAGE_FIRST_MATCH[stage];
  return inStage[idx]?.id ?? null;
}

async function propagateAdvancement(
  matchId: string,
  homeScore: number,
  awayScore: number,
  homeShootoutScore: number | null,
  awayShootoutScore: number | null,
) {
  const source = await prisma.match.findUnique({ where: { id: matchId } });
  if (!source) return;
  if (!isKnockoutStage(source.stage)) return;

  // Wyłonienie zwycięzcy: regulamin/dogrywka, przy remisie -> karne.
  let winnerTeamId: string | null = null;
  let loserTeamId: string | null = null;
  if (homeScore > awayScore) {
    winnerTeamId = source.homeTeamId;
    loserTeamId = source.awayTeamId;
  } else if (awayScore > homeScore) {
    winnerTeamId = source.awayTeamId;
    loserTeamId = source.homeTeamId;
  } else if (homeShootoutScore !== null && awayShootoutScore !== null) {
    if (homeShootoutScore > awayShootoutScore) {
      winnerTeamId = source.homeTeamId;
      loserTeamId = source.awayTeamId;
    } else if (awayShootoutScore > homeShootoutScore) {
      winnerTeamId = source.awayTeamId;
      loserTeamId = source.homeTeamId;
    }
  }
  if (!winnerTeamId) return; // remis bez karnych - nic nie robimy

  const sourceFifaM = await fifaMNumberOfMatch(matchId);
  if (sourceFifaM === null) return;
  const adv = ADVANCEMENT[sourceFifaM];
  if (!adv) return;

  // Wpisz zwycięzcę w kolejnej rundzie
  const winnerTargetId = await findMatchByFifaM(adv.winnerTo.m);
  if (winnerTargetId) {
    await prisma.match.update({
      where: { id: winnerTargetId },
      data: adv.winnerTo.slot === "home"
        ? { homeTeamId: winnerTeamId }
        : { awayTeamId: winnerTeamId },
    });
  }
  // Wpisz przegranego w meczu o 3. miejsce (dotyczy tylko SF M101/M102)
  if (adv.loserTo && loserTeamId) {
    const loserTargetId = await findMatchByFifaM(adv.loserTo.m);
    if (loserTargetId) {
      await prisma.match.update({
        where: { id: loserTargetId },
        data: adv.loserTo.slot === "home"
          ? { homeTeamId: loserTeamId }
          : { awayTeamId: loserTeamId },
      });
    }
  }
}

// Liczy pozycje wszystkich graczy i zapisuje currentRank/previousRank
async function snapshotRanking() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      currentRank: true,
      predictedChampionId: true,
      predictions: { select: { matchId: true, pointsAwarded: true } },
      boosts: { select: { matchId: true } },
      memberships: { select: { league: { select: { actualChampionId: true } } } },
    },
  });
  const scored = users.map((u) => {
    const boostSet = new Set(u.boosts.map((b) => b.matchId));
    let pts = u.predictions.reduce(
      (s, p) => s + (boostSet.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded),
      0,
    );
    // Bonus mistrza - jeśli któraś z lig usera ma actualChampion = predictedChampion
    if (u.predictedChampionId && u.memberships.some((m) => m.league.actualChampionId === u.predictedChampionId)) {
      pts += 10;
    }
    return { id: u.id, pts, prevCurrentRank: u.currentRank };
  });
  scored.sort((a, b) => b.pts - a.pts);
  await Promise.all(
    scored.map((s, idx) =>
      prisma.user.update({
        where: { id: s.id },
        data: { previousRank: s.prevCurrentRank, currentRank: idx + 1 },
      }),
    ),
  );
}

async function setChampion(formData: FormData) {
  "use server";
  const teamId = String(formData.get("teamId") ?? "") || null;
  const leagues = await prisma.league.findMany();
  for (const l of leagues) {
    await prisma.league.update({ where: { id: l.id }, data: { actualChampionId: teamId } });
  }
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}

async function addUserToLeague(formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me?.isAdmin) return;
  const userId = String(formData.get("userId") ?? "");
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!userId || !leagueId) return;
  await prisma.membership.upsert({
    where: { userId_leagueId: { userId, leagueId } },
    update: {},
    create: { userId, leagueId },
  });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

async function joinAllToLeague(formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me?.isAdmin) return;
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    await prisma.membership.upsert({
      where: { userId_leagueId: { userId: u.id, leagueId } },
      update: {},
      create: { userId: u.id, leagueId },
    });
  }
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

async function manualSync() {
  "use server";
  const me = await getCurrentUser();
  if (!me?.isAdmin) return;
  const result = await syncFinishedResults({ sendPush: false });
  await syncSchedule(); // też podlinkuj awanse + zaktualizuj daty meczy
  const c = await cookies();
  c.set("wcp_sync_result",
    `${result.ok ? "ok" : "err"}:${result.updated}:${result.scoredPredictions}`,
    { httpOnly: true, path: "/admin", maxAge: 60 },
  );
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/stats");
}

async function sendPush(formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me?.isAdmin) return;
  const title = String(formData.get("title") ?? "").trim() || "WC Predictor 2026";
  const body = String(formData.get("body") ?? "").trim();
  const url = String(formData.get("url") ?? "/dashboard").trim() || "/dashboard";
  const target = String(formData.get("target") ?? "all");
  if (!body) return;

  const result = target === "all"
    ? await sendPushToAll({ title, body, url })
    : await sendPushToUser(target, { title, body, url });

  const c = await cookies();
  c.set("wcp_push_result", `${result.sent}:${result.removed}`, { httpOnly: true, path: "/admin", maxAge: 60 });
  revalidatePath("/admin");
}

async function deleteUser(formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me?.isAdmin) return;
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === me.id) return;
  // Cascade Prisma usuwa: predictions, boosts, comments, memberships, pushSubs
  // (zdefiniowane w schema.prisma jako onDelete: Cascade)
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!target || target.isAdmin) return; // nie kasuj adminów
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/stats");
  revalidatePath("/groups");
  redirect("/admin?tab=users&toast=userDeleted");
}

async function resetPassword(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId"));
  const temp = randomBytes(4).toString("hex"); // 8 chars
  // Reset hasła + odblokowanie konta (zerowanie failed attempts)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(temp), failedAttempts: 0, lockedUntil: null },
  });
  const { cookies } = await import("next/headers");
  const c = await cookies();
  c.set("wcp_reset_info", `${userId}:${temp}`, { httpOnly: true, path: "/admin", maxAge: 300 });
  revalidatePath("/admin");
}

export default async function Admin({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) {
    return (
      <section className="max-w-md mx-auto py-10 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-black mb-2">Brak dostępu</h1>
        <p className="text-app-muted mb-6">Ta strona jest tylko dla admina ligi.</p>
        <Link href="/dashboard" className="btn-primary">Wróć do meczów</Link>
      </section>
    );
  }

  const { tab } = await searchParams;
  const activeTab = tab === "users" ? "users" : "matches";

  if (tab === "leagues") {
    const allLeagues = await prisma.league.findMany({
      orderBy: { createdAt: "asc" },
      include: { memberships: { include: { user: true } } },
    });
    const allUsers = await prisma.user.findMany({ orderBy: { nickname: "asc" } });
    return (
      <section>
        <AdminTabs active="leagues" />
        <h1 className="text-3xl font-black mb-2">Ligi 🏟️</h1>
        <p className="text-app-muted mb-6">Zarządzaj członkostwami - dodawaj graczy do lig ręcznie.</p>

        <div className="space-y-4">
          {allLeagues.map((l) => {
            const memberIds = new Set(l.memberships.map((m) => m.userId));
            const notInLeague = allUsers.filter((u) => !memberIds.has(u.id));
            return (
              <div key={l.id} className="card p-5">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div>
                    <div className="font-black text-lg">{l.name}</div>
                    <div className="text-xs text-app-subtle">
                      kod <code className="bg-app-hover px-1.5 py-0.5 rounded">{l.inviteCode}</code> · {l.memberships.length} {l.memberships.length === 1 ? "gracz" : "graczy"}
                    </div>
                  </div>
                  {notInLeague.length > 0 && (
                    <form action={joinAllToLeague}>
                      <input type="hidden" name="leagueId" value={l.id} />
                      <button className="btn-ghost text-xs py-1.5 px-3 whitespace-nowrap">
                        ➕ Dodaj wszystkich ({notInLeague.length})
                      </button>
                    </form>
                  )}
                </div>

                {/* Lista członków */}
                {l.memberships.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {l.memberships.map((m) => (
                      <span key={m.id} className="chip bg-app-hover">
                        {m.user.avatar} {m.user.nickname}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dodaj konkretnego użytkownika */}
                {notInLeague.length > 0 && (
                  <form action={addUserToLeague} className="flex gap-2 pt-3 border-t border-app">
                    <input type="hidden" name="leagueId" value={l.id} />
                    <select name="userId" required className="input text-sm flex-1">
                      <option value="">- wybierz gracza -</option>
                      {notInLeague.map((u) => (
                        <option key={u.id} value={u.id}>{u.avatar} {u.nickname}</option>
                      ))}
                    </select>
                    <button className="btn-primary text-sm py-1.5 px-4 whitespace-nowrap">Dodaj</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (tab === "push") {
    const usersWithSubs = await prisma.user.findMany({
      include: { _count: { select: { pushSubs: true } } },
      orderBy: { nickname: "asc" },
    });
    const subscribed = usersWithSubs.filter((u) => u._count.pushSubs > 0);
    const c = await cookies();
    const resultRaw = c.get("wcp_push_result")?.value;
    const [sent, removed] = resultRaw ? resultRaw.split(":").map(Number) : [0, 0];
    return (
      <section>
        <AdminTabs active="push" />
        <h1 className="text-3xl font-black mb-2">Powiadomienia push 🔔</h1>
        <p className="text-app-muted mb-6">
          Wyślij powiadomienie do wszystkich albo konkretnego użytkownika. Subskrybentów: <b>{subscribed.length}</b> z {usersWithSubs.length}.
        </p>

        <form action={sendPush} className="card p-5 space-y-4 mb-6">
          <div>
            <label className="text-sm font-semibold">Tytuł</label>
            <input name="title" maxLength={60} className="input mt-1" placeholder="WC Predictor 2026" defaultValue="WC Predictor 2026" />
          </div>
          <div>
            <label className="text-sm font-semibold">Treść *</label>
            <textarea name="body" required maxLength={200} rows={3} className="input mt-1" placeholder="np. ⚽ Polska gra za godzinę! Nie zapomnij wytypować." />
          </div>
          <div>
            <label className="text-sm font-semibold">Link po kliknięciu</label>
            <input name="url" className="input mt-1" placeholder="/dashboard" defaultValue="/dashboard" />
          </div>
          <div>
            <label className="text-sm font-semibold">Komu wysłać</label>
            <select name="target" defaultValue="all" className="input mt-1">
              <option value="all">📢 Wszyscy subskrybenci ({subscribed.length})</option>
              {subscribed.map((u) => (
                <option key={u.id} value={u.id}>{u.avatar} {u.nickname} ({u._count.pushSubs} {u._count.pushSubs === 1 ? "urządzenie" : "urządzeń"})</option>
              ))}
            </select>
          </div>
          {resultRaw && (
            <div className="text-sm bg-wc-green/10 text-wc-green border border-wc-green/30 rounded-lg px-3 py-2">
              ✅ Wysłano do {sent} {sent === 1 ? "urządzenia" : "urządzeń"}{removed > 0 && `, usunięto ${removed} nieaktywnych`}
            </div>
          )}
          <button className="btn-primary w-full">📨 Wyślij</button>
        </form>

        <h2 className="text-lg font-black mb-3">Kto ma włączone powiadomienia</h2>
        <div className="card overflow-hidden">
          {usersWithSubs.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3 border-b border-app last:border-0">
              <div className="flex items-center gap-3">
                <Emoji char={u.avatar} size="lg" alt={u.nickname} />
                <span className="font-bold">{u.nickname}</span>
              </div>
              {u._count.pushSubs > 0 ? (
                <span className="chip bg-wc-green/15 text-wc-green">🔔 {u._count.pushSubs}</span>
              ) : (
                <span className="text-xs text-app-subtle">brak</span>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (tab === "champion") {
    const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
    const league = await prisma.league.findFirst({ include: { actualChampion: true } });
    const users = await prisma.user.findMany({ include: { predictedChampion: true } });
    return (
      <section>
        <AdminTabs active="champion" />
        <h1 className="text-3xl font-black mb-6">Mistrz turnieju 🏆</h1>
        <form action={setChampion} className="card p-6 mb-6">
          <label className="text-sm font-semibold">Aktualnie ustawiony mistrz</label>
          <div className="flex gap-3 mt-2">
            <select name="teamId" defaultValue={league?.actualChampionId ?? ""} className="input flex-1">
              <option value="">- jeszcze nieustalony -</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
              ))}
            </select>
            <button className="btn-primary">Zapisz</button>
          </div>
          {league?.actualChampion && (
            <div className="text-xs text-app-subtle mt-2">
              Każdy kto wytypował {league.actualChampion.flag} {league.actualChampion.name} dostaje +10 pkt.
            </div>
          )}
        </form>

        <h2 className="text-lg font-black mb-3">Typy graczy</h2>
        <div className="card overflow-hidden">
          {users.map((u) => {
            const hit = league?.actualChampionId && u.predictedChampionId === league.actualChampionId;
            return (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 border-b border-app last:border-0">
                <div className="flex items-center gap-3">
                  <Emoji char={u.avatar} size="lg" alt={u.nickname} />
                  <span className="font-bold">{u.nickname}</span>
                </div>
                {u.predictedChampion ? (
                  <span className={`chip ${hit ? "bg-wc-gold/20 text-wc-gold" : "bg-app-hover text-app-muted"}`}>
                    {u.predictedChampion.flag} {u.predictedChampion.name} {hit && "🎉 +10"}
                  </span>
                ) : (
                  <span className="text-xs text-app-subtle">brak typu</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (activeTab === "users") {
    const users = await prisma.user.findMany({
      orderBy: { nickname: "asc" },
      include: {
        predictions: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { predictions: true } },
      },
    });
    const { cookies } = await import("next/headers");
    const c = await cookies();
    const resetInfo = c.get("wcp_reset_info")?.value;
    const [resetId, tempPw] = resetInfo ? resetInfo.split(":") : [];

    // Klasyfikacja aktywności (na podstawie ostatniej akcji = typowanie)
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;
    const activityChip = (lastAt: Date | null) => {
      if (!lastAt) return { text: "nigdy nie typował", color: "bg-wc-red/15 text-wc-red" };
      const days = Math.floor((now - lastAt.getTime()) / dayMs);
      if (days === 0) return { text: "aktywny dziś", color: "bg-wc-green/15 text-wc-green" };
      if (days <= 2) return { text: `${days} dni temu`, color: "bg-wc-green/10 text-wc-green" };
      if (days <= 7) return { text: `${days} dni temu`, color: "bg-wc-gold/15 text-wc-gold" };
      return { text: `${days} dni temu`, color: "bg-wc-red/15 text-wc-red" };
    };

    return (
      <section>
        <AdminTabs active="users" />
        <h1 className="text-3xl font-black mb-6">Admin - użytkownicy ({users.length})</h1>
        <div className="card overflow-hidden">
          {users.map((u) => {
            const lastPred = u.predictions[0]?.createdAt ?? null;
            const chip = activityChip(lastPred);
            return (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 border-b border-app last:border-0 gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Emoji char={u.avatar} size="lg" alt={u.nickname} />
                  <div className="min-w-0">
                    <div className="font-bold flex items-center gap-2 flex-wrap">
                      <span className="truncate">{u.nickname}</span>
                      {u.isAdmin && <span className="chip bg-wc-gold/15 text-wc-gold text-[10px]">admin</span>}
                      <span className={`chip text-[10px] ${chip.color}`}>{chip.text}</span>
                    </div>
                    <div className="text-xs text-app-subtle">
                      konto: {fmtDate(u.createdAt)} · typów: {u._count.predictions}
                      {lastPred && <> · ostatni typ: {fmtDate(lastPred)}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {resetId === u.id && tempPw && (
                    <div className="text-sm">
                      Nowe hasło: <code className="bg-wc-gold/15 text-wc-gold px-2 py-1 rounded font-bold">{tempPw}</code>
                    </div>
                  )}
                  <Link href={`/admin/user/${u.id}`} className="text-xs py-1.5 px-3 rounded-xl bg-app-hover hover:bg-wc-blue/15 font-bold">
                    📝 Typy
                  </Link>
                  <form action={resetPassword}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="btn-ghost text-xs py-1.5 px-3">Reset hasła</button>
                  </form>
                  {!u.isAdmin && (
                    <form action={deleteUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="confirmNickname" value={u.nickname} />
                      <button
                        className="text-xs py-1.5 px-3 rounded-xl bg-wc-red/15 text-wc-red hover:bg-wc-red/30 font-bold"
                      >
                        🗑️ Usuń
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-app-subtle mt-3">
          Tymczasowe hasło widoczne tylko teraz. Aktywność wg ostatniego typu (data ostatniego zapisanego typowania).
          Usunięcie konta kasuje typy, komentarze, boosty i członkostwa - <b className="text-wc-red">nieodwracalnie</b>.
        </p>
      </section>
    );
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });

  const c = await cookies();
  const syncRaw = c.get("wcp_sync_result")?.value;
  const [syncStatus, syncUpdated, syncScored] = syncRaw ? syncRaw.split(":") : [];

  return (
    <section>
      <AdminTabs active="matches" />
      <h1 className="text-3xl font-black mb-6">Admin - wpisz wyniki</h1>

      <div className="card p-4 mb-6 flex items-center gap-4 border-wc-blue/30">
        <div className="text-3xl">🔄</div>
        <div className="flex-1">
          <div className="font-black">Synchronizacja z API</div>
          <div className="text-sm text-app-muted">
            Pobierz świeże wyniki z football-data.org. Cron jest wyłączony - klikaj ręcznie gdy chcesz zsynchronizować zakończone mecze.
          </div>
          {syncRaw && (
            <div className={`text-xs mt-2 font-bold ${syncStatus === "ok" ? "text-wc-green" : "text-wc-red"}`}>
              {syncStatus === "ok"
                ? `✅ Sync OK: ${syncUpdated} wyników, ${syncScored} typów przeliczonych`
                : `❌ Sync nieudany - spróbuj ponownie za chwilę`}
            </div>
          )}
        </div>
        <form action={manualSync}>
          <button className="btn-primary whitespace-nowrap">🔄 Pobierz wyniki</button>
        </form>
      </div>

      {(() => {
        const upcoming = matches.filter((m) => m.homeScore === null);
        const finished = matches.filter((m) => m.homeScore !== null);

        // Efektywny matchday: knockout-y dostają 100+ od stage'a (niezależnie od DB).
        const KO_MD: Record<string, number> = {
          "1/16 finału": 100, "1/8 finału": 101, "Ćwierćfinał": 102,
          "Półfinał": 103, "Mecz o 3. miejsce": 104, "Finał": 105,
        };
        const effMd = (m: { stage: string; matchday: number }) => {
          const pretty = prettyStage(m.stage);
          return KO_MD[pretty] ?? m.matchday;
        };

        // Grupowanie nierozegranych per kolejka (efektywną)
        const byMatchday = new Map<number, typeof matches>();
        for (const m of upcoming) {
          const md = effMd(m);
          const arr = byMatchday.get(md) ?? [];
          arr.push(m);
          byMatchday.set(md, arr);
        }
        const sortedMatchdays = Array.from(byMatchday.keys()).sort((a, b) => a - b);
        // Aktualna kolejka:
        // 1) priorytet: najwcześniejsza kolejka z meczem przeterminowanym (kickoff < now, brak wyniku)
        //    - to są mecze które admin powinien jak najszybciej uzupełnić
        // 2) fallback: najbliższa nadchodząca (earliest > now)
        const now = Date.now();
        const overdueMd = sortedMatchdays.find((md) =>
          byMatchday.get(md)!.some((m) => m.kickoff.getTime() < now),
        );
        const nextUpcomingMd = sortedMatchdays
          .map((md) => ({ md, earliest: Math.min(...byMatchday.get(md)!.map((m) => m.kickoff.getTime())) }))
          .filter((x) => x.earliest > now)
          .sort((a, b) => a.earliest - b.earliest)[0]?.md;
        const currentMd = overdueMd ?? nextUpcomingMd ?? sortedMatchdays[0];

        return (
          <>
            {sortedMatchdays.map((md) => {
              const list = byMatchday.get(md)!;
              const isCurrent = md === currentMd;
              const firstStage = list[0]?.stage;
              const label = firstStage && isKnockoutStage(firstStage)
                ? prettyStage(firstStage)
                : `Kolejka ${md}`;
              return (
                <details key={md} open={isCurrent} className="mb-4">
                  <summary className="collapse-header">
                    <span className="flex items-center gap-2">
                      <span className="collapse-chev">▶</span>
                      {label}
                      <span className="collapse-count">· {list.length} {list.length === 1 ? "mecz" : "meczy"}</span>
                    </span>
                    {isCurrent && <span className="chip-no-pick">aktualna</span>}
                  </summary>
                  <div className="space-y-4 mt-4">
                    {list.map((m) => (
                      <MatchForm key={m.id} m={m} action={setResult} />
                    ))}
                  </div>
                </details>
              );
            })}

            {finished.length > 0 && (
              <details className="mt-8">
                <summary className="collapse-header">
                  <span className="flex items-center gap-2">
                    <span className="collapse-chev">▶</span>
                    Rozegrane
                    <span className="collapse-count">· {finished.length} {finished.length === 1 ? "mecz" : "meczy"}</span>
                  </span>
                  <span className="chip-after-match">edytuj</span>
                </summary>
                <div className="space-y-4 mt-4">
                  {finished.map((m) => (
                    <MatchForm key={m.id} m={m} action={setResult} compact />
                  ))}
                </div>
              </details>
            )}
          </>
        );
      })()}
    </section>
  );
}

function MatchForm({
  m, action, compact,
}: {
  m: any;
  action: (formData: FormData) => Promise<void>;
  compact?: boolean;
}) {
  return (
    <form
      action={action}
      className="match-tile block"
      style={matchGlowStyle(m.homeTeam.shortCode, m.awayTeam.shortCode)}
    >
      <div className="match-tile-inner" style={{ padding: "16px" }}>
        <input type="hidden" name="matchId" value={m.id} />
        <div className="match-tile-meta">
          <span>{isKnockoutStage(m.stage) ? prettyStage(m.stage) : `${m.stage} · Kolejka ${m.matchday}`}</span>
          <span>{fmtDateTimeLong(m.kickoff)}</span>
        </div>
        {/* Drużyny */}
        <div className="flex items-center justify-between gap-2 mt-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Flag emoji={m.homeTeam.flag} size="md" />
            <span className="font-bold truncate text-white">
              <span className="sm:hidden">{m.homeTeam.shortCode}</span>
              <span className="hidden sm:inline">{m.homeTeam.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="font-bold truncate text-right text-white">
              <span className="sm:hidden">{m.awayTeam.shortCode}</span>
              <span className="hidden sm:inline">{m.awayTeam.name}</span>
            </span>
            <Flag emoji={m.awayTeam.flag} size="md" />
          </div>
        </div>
        {/* Score inputs */}
        <div className="flex items-center justify-center gap-3">
          <input
            type="number" name="homeScore" min={0} max={20}
            defaultValue={m.homeScore ?? ""}
            className="input w-20 sm:w-24 text-center px-1 text-2xl font-black"
            style={{ fontFamily: "'Courier New', monospace", background: "rgba(0,0,0,0.4)", borderColor: "rgba(241,180,52,0.3)", color: "#F1B434", textShadow: "0 0 8px rgba(241,180,52,0.4)" }}
          />
          <span className="font-black text-2xl" style={{ color: "rgba(241,180,52,0.5)", fontFamily: "'Courier New', monospace" }}>:</span>
          <input
            type="number" name="awayScore" min={0} max={20}
            defaultValue={m.awayScore ?? ""}
            className="input w-20 sm:w-24 text-center px-1 text-2xl font-black"
            style={{ fontFamily: "'Courier New', monospace", background: "rgba(0,0,0,0.4)", borderColor: "rgba(241,180,52,0.3)", color: "#F1B434", textShadow: "0 0 8px rgba(241,180,52,0.4)" }}
          />
        </div>
        {/* Karne - tylko dla fazy pucharowej. Puste = brak karnych. */}
        {isKnockoutStage(m.stage) && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-widest text-center mb-1.5" style={{ color: "rgba(241,180,52,0.6)", fontFamily: "'Courier New', monospace" }}>
              Karne (puste = brak)
            </div>
            <div className="flex items-center justify-center gap-3">
              <input
                type="number" name="homeShootoutScore" min={0} max={30}
                defaultValue={m.homeShootoutScore ?? ""}
                placeholder="-"
                className="input w-16 sm:w-20 text-center px-1 text-lg font-black"
                style={{ fontFamily: "'Courier New', monospace", background: "rgba(0,0,0,0.4)", borderColor: "rgba(241,180,52,0.25)", color: "#F1B434" }}
              />
              <span className="font-black text-lg" style={{ color: "rgba(241,180,52,0.4)", fontFamily: "'Courier New', monospace" }}>:</span>
              <input
                type="number" name="awayShootoutScore" min={0} max={30}
                defaultValue={m.awayShootoutScore ?? ""}
                placeholder="-"
                className="input w-16 sm:w-20 text-center px-1 text-lg font-black"
                style={{ fontFamily: "'Courier New', monospace", background: "rgba(0,0,0,0.4)", borderColor: "rgba(241,180,52,0.25)", color: "#F1B434" }}
              />
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(241,180,52,0.75)", fontFamily: "'Courier New', monospace" }}>
              Pierwsza drużyna ze strzałem
            </label>
            <div className="mt-1">
              <TeamRadioPicker
                name="firstScorerTeam"
                defaultValue={
                  m.firstScorerTeamId === m.homeTeamId ? "HOME"
                  : m.firstScorerTeamId === m.awayTeamId ? "AWAY"
                  : "NONE"
                }
                home={{ flag: m.homeTeam.flag, shortCode: m.homeTeam.shortCode }}
                away={{ flag: m.awayTeam.flag, shortCode: m.awayTeam.shortCode }}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(241,180,52,0.75)", fontFamily: "'Courier New', monospace" }}>
              Pierwszy strzelec
            </label>
            <div className="mt-1">
              <PlayerPicker
                name="firstGoalPlayerId"
                defaultValue={m.firstGoalPlayerId}
                groups={[
                  { name: m.homeTeam.name, flag: m.homeTeam.flag, players: sortByPosition(m.homeTeam.players) },
                  { name: m.awayTeam.name, flag: m.awayTeam.flag, players: sortByPosition(m.awayTeam.players) },
                ]}
              />
            </div>
          </div>
        </div>
        <button className="btn-primary w-full mt-4">Zapisz wynik i przelicz punkty</button>
      </div>
    </form>
  );
}

function AdminTabs({ active }: { active: "matches" | "users" | "champion" | "push" | "leagues" }) {
  const tabs = [
    { key: "matches",  href: "/admin",                label: "Mecze" },
    { key: "users",    href: "/admin?tab=users",      label: "Użytkownicy" },
    { key: "leagues",  href: "/admin?tab=leagues",    label: "Ligi 🏟️" },
    { key: "champion", href: "/admin?tab=champion",   label: "Mistrz 🏆" },
    { key: "push",     href: "/admin?tab=push",       label: "Powiadomienia 🔔" },
  ];
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          className={`px-3 py-1.5 rounded-xl text-sm font-bold ${active === t.key ? "bg-wc-red text-white" : "bg-app-hover text-app-muted"}`}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}
