import { NextResponse } from "next/server";
import { setLocale, type Locale } from "@/lib/i18n";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const locale = body?.locale as Locale;
    if (locale !== "pl" && locale !== "en") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    await setLocale(locale);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
