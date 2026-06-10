import { NextResponse } from "next/server";
import { syncFinishedResults } from "@/lib/syncResults";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  const isVercelCron = auth === `Bearer ${secret}` || req.headers.get("x-vercel-cron") === "1";
  const isManual = url.searchParams.get("key") === secret;
  if (secret && !isVercelCron && !isManual) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncFinishedResults({ sendPush: true });
  return NextResponse.json({ ...result, ts: new Date().toISOString() });
}
