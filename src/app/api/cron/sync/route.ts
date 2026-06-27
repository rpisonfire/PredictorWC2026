import { NextResponse } from "next/server";
import { syncFinishedResults, syncSchedule } from "@/lib/syncResults";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  const isVercelCron = auth === `Bearer ${secret}` || req.headers.get("x-vercel-cron") === "1";
  const isManual = url.searchParams.get("key") === secret;
  if (secret && !isVercelCron && !isManual) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1) Sync wyników (finished + recalc punktów + opcjonalny push)
  const results = await syncFinishedResults({ sendPush: true });
  // 2) Sync terminarza (daty + awansowanie drużyn TBD → realne)
  const schedule = await syncSchedule();

  return NextResponse.json({
    results,
    schedule,
    ts: new Date().toISOString(),
  });
}
