import webpush from "web-push";
import { prisma } from "./db";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@wc-predictor.local";

if (PUBLIC && PRIVATE) {
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!PUBLIC || !PRIVATE) return { sent: 0, removed: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0, removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } });
        removed++;
      }
    }
  }
  return { sent, removed };
}

export async function sendPushToAll(payload: PushPayload) {
  if (!PUBLIC || !PRIVATE) return { sent: 0, removed: 0 };
  const subs = await prisma.pushSubscription.findMany();
  let sent = 0, removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } });
        removed++;
      }
    }
  }
  return { sent, removed };
}
