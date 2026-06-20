import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { scorePrediction } from "@/lib/scoring";
import { Emoji } from "@/components/Emoji";
import { Flag } from "@/components/Flag";
import { fmtDateTimeLong } from "@/lib/dates";
import { TeamRadioPicker } from "@/components/TeamRadioPicker";
import { PlayerPicker } from "@/components/PlayerPicker";

export const dynamic = "force-dynamic";

function sortByPosition<T extends { position?: string | null; name: string }>(players: T[]): T[] {
  const order = (p?: string | null) => {
    if (!p) return 5;
    const x = p.toLowerCase();
    if (x.includes("goal")) return 1;
    if (x.includes("defence") || x.includes("defender") || x.includes("back")) return 2;
    if (x.includes("midfield")) return 3;
    if (x.includes("forward") || x.includes("attack") || x.includes("striker") || x.includes("winger")) return 4;
    return 5;
  };
  return [...players].sort((a, b) => order(a.position) - order(b.position) || a.name.localeCompare(b.name));
}

// Edycja pojedynczego typu usera przez admina + recalc
async function adminEditPrediction(formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me?.isAdmin) return;

  const predictionId = String(formData.get("predictionId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!predictionId) return;

  const homeScoreRaw = formData.get("homeScore");
  const awayScoreRaw = formData.get("awayScore");
  const homeScore = homeScoreRaw === "" || homeScoreRaw == null ? null : Number(homeScoreRaw);
  const awayScore = awayScoreRaw === "" || awayScoreRaw == null ? null : Number(awayScoreRaw);
  const firstScorerTeam = String(formData.get("firstScorerTeam") ?? "NONE") as "HOME" | "AWAY" | "NONE";
  const firstGoalPlayerId = String(formData.get("firstGoalPlayerId") ?? "") || null;

  const pred = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: { match: true },
  });
  if (!pred) return;

  // Zapis (tylko jeśli oba scores są ustawione, inaczej zostaw stare)
  const dataUpdate: any = {
    firstScorerTeam: firstScorerTeam === "NONE" ? null : firstScorerTeam,
    firstGoalPlayerId,
  };
  if (homeScore != null) dataUpdate.homeScore = homeScore;
  if (awayScore != null) dataUpdate.awayScore = awayScore;

  // Recalc punktów z aktualnymi danymi meczu
  if (pred.match.homeScore != null && pred.match.awayScore != null) {
    const matchFirstScorerTeam =
      pred.match.firstScorerTeamId === pred.match.homeTeamId ? "HOME"
      : pred.match.firstScorerTeamId === pred.match.awayTeamId ? "AWAY"
      : "NONE";
    const pts = scorePrediction(
      {
        homeScore: dataUpdate.homeScore ?? pred.homeScore,
        awayScore: dataUpdate.awayScore ?? pred.awayScore,
        firstScorerTeam: dataUpdate.firstScorerTeam ?? null,
        firstGoalPlayerId: dataUpdate.firstGoalPlayerId,
      },
      {
        homeScore: pred.match.homeScore,
        awayScore: pred.match.awayScore,
        firstScorerTeam: matchFirstScorerTeam,
        firstGoalPlayerId: pred.match.firstGoalPlayerId,
      }
    );
    dataUpdate.pointsAwarded = pts;
  }

  await prisma.prediction.update({ where: { id: predictionId }, data: dataUpdate });

  revalidatePath(`/admin/user/${userId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/my-predictions");
  redirect(`/admin/user/${userId}?toast=resultSaved`);
}

export default async function AdminUserPredictions({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/dashboard");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: {
      match: {
        include: {
          homeTeam: { include: { players: true } },
          awayTeam: { include: { players: true } },
        },
      },
      player: true,
    },
    orderBy: { match: { kickoff: "desc" } },
  });

  return (
    <section>
      <Link href="/admin?tab=users" className="text-sm text-app-subtle hover:text-app">← Lista użytkowników</Link>
      <div className="flex items-center gap-3 mt-3 mb-6">
        <Emoji char={user.avatar} size="2xl" alt={user.nickname} />
        <div>
          <h1 className="text-3xl font-black">Typy: {user.nickname}</h1>
          <p className="text-app-muted text-sm">{predictions.length} typów · klikaj żeby edytować</p>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">⚽</div>
          <div className="font-bold">{user.nickname} nie ma jeszcze żadnego typu</div>
        </div>
      ) : (
        <div className="space-y-3">
          {predictions.map((p) => (
            <details key={p.id} className="card p-0 group">
              <summary className="cursor-pointer flex items-center justify-between gap-3 p-4 hover:bg-app-hover">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-app-subtle text-xs sm:text-sm">
                    <span className="group-open:hidden">▶</span>
                    <span className="hidden group-open:inline">▼</span>
                  </span>
                  <Flag emoji={p.match.homeTeam.flag} size="sm" />
                  <span className="font-bold">{p.match.homeTeam.shortCode}</span>
                  {p.match.homeScore !== null ? (
                    <span className="text-wc-gold font-black tabular-nums">{p.match.homeScore}:{p.match.awayScore}</span>
                  ) : (
                    <span className="text-app-subtle">vs</span>
                  )}
                  <span className="font-bold">{p.match.awayTeam.shortCode}</span>
                  <Flag emoji={p.match.awayTeam.flag} size="sm" />
                  <span className="text-xs text-app-subtle ml-2 truncate">
                    typ {p.homeScore}:{p.awayScore}
                  </span>
                </div>
                <div className="shrink-0">
                  {p.match.homeScore !== null ? (
                    <span className={`chip text-xs ${p.pointsAwarded > 0 ? "bg-wc-green/15 text-wc-green" : "bg-app-hover text-app-subtle"}`}>
                      {p.pointsAwarded > 0 ? `+${p.pointsAwarded}` : "0"} pkt
                    </span>
                  ) : (
                    <span className="chip text-xs bg-app-hover text-app-subtle">przed meczem</span>
                  )}
                </div>
              </summary>
              <form action={adminEditPrediction} className="border-t border-app p-4 space-y-3">
                <input type="hidden" name="predictionId" value={p.id} />
                <input type="hidden" name="userId" value={user.id} />
                <div className="text-xs text-app-subtle">
                  {p.match.stage} · Kolejka {p.match.matchday} · {fmtDateTimeLong(p.match.kickoff)}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="number" name="homeScore" min={0} max={20}
                    defaultValue={p.homeScore}
                    className="input w-20 text-center text-xl font-black"
                  />
                  <span className="font-black text-app-subtle text-xl">:</span>
                  <input
                    type="number" name="awayScore" min={0} max={20}
                    defaultValue={p.awayScore}
                    className="input w-20 text-center text-xl font-black"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-app-subtle">Pierwsza drużyna ze strzałem</label>
                    <div className="mt-1">
                      <TeamRadioPicker
                        name="firstScorerTeam"
                        defaultValue={(p.firstScorerTeam as "HOME" | "AWAY" | "NONE" | null) ?? "NONE"}
                        home={{ flag: p.match.homeTeam.flag, shortCode: p.match.homeTeam.shortCode }}
                        away={{ flag: p.match.awayTeam.flag, shortCode: p.match.awayTeam.shortCode }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-app-subtle">Pierwszy strzelec</label>
                    <div className="mt-1">
                      <PlayerPicker
                        name="firstGoalPlayerId"
                        defaultValue={p.firstGoalPlayerId}
                        groups={[
                          { name: p.match.homeTeam.name, flag: p.match.homeTeam.flag, players: sortByPosition(p.match.homeTeam.players) },
                          { name: p.match.awayTeam.name, flag: p.match.awayTeam.flag, players: sortByPosition(p.match.awayTeam.players) },
                        ]}
                      />
                    </div>
                  </div>
                </div>
                <button className="btn-primary w-full">Zapisz zmiany w typie</button>
              </form>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
