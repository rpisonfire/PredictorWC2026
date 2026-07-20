import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { BestXIPitch, type XIPlayer } from "@/components/BestXIPitch";
import { XI_SLOTS, positionBucket, type PositionBucket } from "@/lib/bestXI";

export const dynamic = "force-dynamic";

async function saveBestXI(formData: FormData): Promise<{ ok: boolean }> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  // Zbierz picki ze wszystkich slotów + walidacja pozycji po stronie serwera
  const entries: { slot: string; playerId: string }[] = [];
  for (const s of XI_SLOTS) {
    const playerId = String(formData.get(s.key) ?? "");
    if (!playerId) continue;
    entries.push({ slot: s.key, playerId });
  }
  if (entries.length === 0) return { ok: false };

  const players = await prisma.player.findMany({
    where: { id: { in: entries.map((e) => e.playerId) } },
    select: { id: true, position: true },
  });
  const posById = new Map(players.map((p) => [p.id, p.position]));

  // Duplikaty zawodników niedozwolone
  const ids = entries.map((e) => e.playerId);
  if (new Set(ids).size !== ids.length) return { ok: false };

  for (const e of entries) {
    const slotDef = XI_SLOTS.find((s) => s.key === e.slot)!;
    const bucket = positionBucket(posById.get(e.playerId));
    if (bucket !== slotDef.bucket) return { ok: false }; // zawodnik nie pasuje do pozycji
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

  const [players, myPicks] = await Promise.all([
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
  ]);

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
    </section>
  );
}
