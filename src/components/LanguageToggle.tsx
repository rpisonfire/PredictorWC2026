"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Locale = "pl" | "en";

async function setLocaleAction(locale: Locale) {
  const res = await fetch("/api/language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
  return res.ok;
}

export function LanguageToggle({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1 rounded-xl bg-app-hover p-1">
      <button
        type="button"
        onClick={() => switchTo("pl")}
        disabled={pending}
        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-bold transition ${current === "pl" ? "bg-wc-red text-white" : "text-app-muted"}`}
      >
        🇵🇱 Polski
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        disabled={pending}
        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-bold transition ${current === "en" ? "bg-wc-red text-white" : "text-app-muted"}`}
      >
        🇬🇧 English
      </button>
    </div>
  );
}
