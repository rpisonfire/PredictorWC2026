import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await sendPushToUser(user.id, {
    title: "WC Predictor 2026",
    body: "🔔 Test! Powiadomienia działają.",
    url: "/dashboard",
  });
  return NextResponse.json(result);
}
