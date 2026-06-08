"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "./page";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="card p-6 space-y-4">
      <h1 className="text-2xl font-black">Zaloguj się</h1>
      <div>
        <label className="text-sm font-semibold">Nick</label>
        <input name="nickname" required maxLength={20} className="input mt-1" placeholder="Twój nick" />
      </div>
      <div>
        <label className="text-sm font-semibold">Hasło</label>
        <input type="password" name="password" required className="input mt-1" placeholder="Hasło" />
      </div>
      {state.error && <div className="text-sm text-wc-red bg-wc-red/10 border border-wc-red/30 rounded-lg px-3 py-2">{state.error}</div>}
      <button disabled={pending} className="btn-primary w-full disabled:opacity-50">
        {pending ? "Loguję..." : "Wejdź"}
      </button>
      <p className="text-xs text-app-subtle text-center">
        Nie masz konta? <Link href="/login?mode=signup" className="text-wc-red font-bold">Załóż je</Link>
        <br />
        Nie pamiętasz hasła? Poproś admina o reset.
      </p>
    </form>
  );
}

type Team = { id: string; name: string; flag: string };

export function SignUpForm({ action, avatars, teams }: { action: Action; avatars: string[]; teams: Team[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="card p-6 space-y-4">
      <h1 className="text-2xl font-black">Załóż konto</h1>
      <div>
        <label className="text-sm font-semibold">Nick</label>
        <input name="nickname" required maxLength={20} className="input mt-1" placeholder="np. Lewy9" />
      </div>
      <div>
        <label className="text-sm font-semibold">Hasło</label>
        <input type="password" name="password" required minLength={6} className="input mt-1" placeholder="Min. 6 znaków" />
      </div>
      <div>
        <label className="text-sm font-semibold">Kod ligi</label>
        <input name="inviteCode" required className="input mt-1 uppercase" placeholder="MUNDIAL2026" />
      </div>
      <div>
        <label className="text-sm font-semibold">Mistrz turnieju 🏆 <span className="text-app-subtle font-normal">(+10 pkt jeśli trafisz)</span></label>
        <select name="predictedChampionId" required defaultValue="" className="input mt-1">
          <option value="" disabled>- wybierz drużynę -</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold">Wybierz awatar</label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {avatars.map((a, i) => (
            <label key={a} className="cursor-pointer">
              <input type="radio" name="avatar" value={a} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex items-center justify-center aspect-square text-3xl rounded-xl border border-app peer-checked:border-wc-red peer-checked:bg-wc-red/10">{a}</span>
            </label>
          ))}
        </div>
      </div>
      {state.error && <div className="text-sm text-wc-red bg-wc-red/10 border border-wc-red/30 rounded-lg px-3 py-2">{state.error}</div>}
      <button disabled={pending} className="btn-primary w-full disabled:opacity-50">
        {pending ? "Tworzę..." : "Wskakuję do gry"}
      </button>
      <p className="text-xs text-app-subtle text-center">
        Demo kod ligi: <code className="bg-app-hover px-1.5 py-0.5 rounded">MUNDIAL2026</code>
      </p>
    </form>
  );
}
