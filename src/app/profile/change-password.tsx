"use client";
import { useActionState, useState } from "react";
import type { PwState } from "./page";

type Action = (prev: PwState, fd: FormData) => Promise<PwState>;

export function ChangePasswordForm({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<PwState, FormData>(action, {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full">
        🔒 Zmień hasło
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 border-t border-white/10 pt-5">
      <div className="flex items-center justify-between">
        <h3 className="font-black">Zmiana hasła</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-white/40 text-sm hover:text-white">Anuluj</button>
      </div>
      <input type="password" name="oldPassword" required placeholder="Stare hasło" className="input" />
      <input type="password" name="newPassword" required minLength={6} placeholder="Nowe hasło (min. 6 znaków)" className="input" />
      <input type="password" name="confirmPassword" required minLength={6} placeholder="Powtórz nowe hasło" className="input" />
      {state.error && <div className="text-sm text-wc-red bg-wc-red/10 border border-wc-red/30 rounded-lg px-3 py-2">{state.error}</div>}
      {state.ok && <div className="text-sm text-wc-green bg-wc-green/10 border border-wc-green/30 rounded-lg px-3 py-2">✅ Hasło zmienione</div>}
      <button disabled={pending} className="btn-primary w-full disabled:opacity-50">
        {pending ? "Zapisuję..." : "Zapisz nowe hasło"}
      </button>
    </form>
  );
}
