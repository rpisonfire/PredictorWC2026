import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { BestXIPitch, type XIPlayer } from "@/components/BestXIPitch";
import { LeagueXIPitch, type LeagueXIEntry } from "@/components/LeagueXIPitch";
import { XI_SLOTS, BENCH_SLOTS, positionBucket, SLOT_ALLOWED_BUCKETS, isBenchSlot, type PositionBucket } from "@/lib/bestXI";

export const dynamic = "force-dynamic";

async function saveBestXI(formData: FormData): Promise<{ ok: boolean }> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  // Zbierz picki: wyjściowa XI + ławka rezerwowych (bez wymagań pozycji)
  const entries: { slot: string; playerId: string }[] = [];
  for (const key of [...XI_SLOTS.map((s) => s.key), ...BENCH_SLOTS]) {
    const playerId = String(formData.get(key) ?? "");
    if (!playerId) continue;
    entries.push({ slot: key, playerId });
  }
  if (entries.length === 0) return { ok: false };

  const players = await prisma.player.findMany({
    where: { id: { in: entries.map((e) => e.playerId) } },
    select: { id: true, position: true },
  });
  const posById = new Map(players.map((p) => [p.id, p.position]));

  // Duplikaty zawodników niedozwolone (w całym składzie 11+5)
  const ids = entries.map((e) => e.playerId);
  if (new Set(ids).size !== ids.length) return { ok: false };

  for (const e of entries) {
    if (!posById.has(e.playerId)) return { ok: false }; // nieistniejący zawodnik
    if (isBenchSlot(e.slot)) continue; // rezerwowy - dowolna pozycja
    const slotDef = XI_SLOTS.find((s) => s.key === e.slot)!;
    const bucket = positionBucket(posById.get(e.playerId));
    // MID<->FWD wymienne, GK i DEF sztywno
    if (!bucket || !SLOT_ALLOWED_BUCKETS[slotDef.bucket].includes(bucket)) return { ok: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.bestXIPick.deleteMany({ where: { userId: user.id } });
    await tx.bestXIPick.createMany({
      data: entries.map((e) => ({ userId: user.id, slot: e.slot, playerId: e.playerId })),
    });
  });
  return { ok: true };
}

export default async function BestXIPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [players, myPicks, allPicks] = await Promise.all([
    prisma.player.findMany({
      select: {
        id: true,
        name: true,
        photoUrl: true,
        position: true,
        team: { select: { shortCode: true, flag: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.bestXIPick.findMany({ where: { userId: user.id } }),
    // Jedenastka ligi - wszystkie picki wszystkich graczy
    prisma.bestXIPick.findMany({
      include: {
        player: {
          select: {
            id: true, name: true, photoUrl: true, position: true,
            team: { select: { flag: true } },
          },
        },
      },
    }),
  ]);

  // Agregat: głosy per zawodnik (dowolny slot), potem top N per kubełek pozycji
  const votes = new Map<string, { player: (typeof allPicks)[number]["player"]; n: number }>();
  for (const pick of allPicks) {
    const e = votes.get(pick.playerId) ?? { player: pick.player, n: 0 };
    e.n += 1;
    votes.set(pick.playerId, e);
  }
  const votesByBucket: Record<PositionBucket, { player: (typeof allPicks)[number]["player"]; n: number }[]> =
    { GK: [], DEF: [], MID: [], FWD: [] };
  for (const v of votes.values()) {
    const bucket = positionBucket(v.player.position);
    if (bucket) votesByBucket[bucket].push(v);
  }
  for (const b of Object.keys(votesByBucket) as PositionBucket[]) {
    votesByBucket[b].sort((a, c) => c.n - a.n);
  }
  // Przypisz najlepszych do slotów formacji (w kolejności głosów)
  const leagueXI: LeagueXIEntry[] = [];
  const takenPerBucket: Record<PositionBucket, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const s of XI_SLOTS) {
    const candidate = votesByBucket[s.bucket][takenPerBucket[s.bucket]];
    takenPerBucket[s.bucket] += 1;
    if (!candidate) continue;
    leagueXI.push({
      slotKey: s.key,
      name: candidate.player.name,
      photoUrl: candidate.player.photoUrl,
      position: candidate.player.position,
      teamFlag: candidate.player.team.flag,
      votes: candidate.n,
    });
  }
  const votersCount = new Set(allPicks.map((p) => p.userId)).size;

  const playersByBucket: Record<PositionBucket, XIPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) {
    if (p.team.shortCode === "TBD") continue;
    const bucket = positionBucket(p.position);
    if (!bucket) continue;
    playersByBucket[bucket].push({
      id: p.id,
      name: p.name,
      photoUrl: p.photoUrl,
      position: p.position,
      teamCode: p.team.shortCode,
      teamFlag: p.team.flag,
    });
  }

  const initialPicks: Record<string, string> = {};
  for (const pick of myPicks) initialPicks[pick.slot] = pick.playerId;

  return (
    <section className="max-w-xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Jedenastka turnieju ⭐</h1>
      <p className="text-app-muted mb-5">
        Wybierz swoją najlepszą XI Mundialu 2026 w formacji <b>4-3-3</b>. Kliknij pozycję na boisku i wskaż zawodnika.
      </p>

      <BestXIPitch
        playersByBucket={playersByBucket}
        initialPicks={initialPicks}
        saveAction={saveBestXI}
      />

      {leagueXI.length > 0 && (
        <div className="mt-10">
          <div
            className="text-center text-xs uppercase font-black mb-1"
            style={{ color: "#F1BF00", fontFamily: "'Courier New', monospace", letterSpacing: "3px", textShadow: "0 0 10px rgba(241,191,0,0.5)" }}
          >
            ⭐ JEDENASTKA LIGI ⭐
          </div>
          <p className="text-center text-xs text-app-subtle mb-4">
            Najczęściej wybierani zawodnicy · głosowało {votersCount} {votersCount === 1 ? "gracz" : "graczy"} · (liczba głosów)
          </p>
          <LeagueXIPitch entries={leagueXI} />
        </div>
      )}
    </section>
  );
}
