"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminPin, verifyPin } from "@/lib/oopDeck";

/**
 * Front-door password gate for the editor. Verifies the stored PIN on mount
 * (open access if no ADMIN_PIN is configured), otherwise shows a password
 * form. The real protection is still server-side on the write routes — this
 * just keeps the editor UI from opening without the password.
 */
export function OopAdminGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    verifyPin(getAdminPin()).then((ok) => setState(ok ? "open" : "locked"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const value = pin.trim();
    const ok = await verifyPin(value);
    setBusy(false);
    if (ok) {
      localStorage.setItem("trivia-admin-pin", value);
      setState("open");
    } else {
      setError("Wrong password. Try again.");
    }
  }

  if (state === "checking") {
    return (
      <div className="oop-scope flex min-h-dvh items-center justify-center">
        <p className="text-lg font-bold tracking-widest text-black/50">Checking…</p>
      </div>
    );
  }

  if (state === "open") return <>{children}</>;

  return (
    <div className="oop-scope flex min-h-dvh items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border-4 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]"
      >
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-2xl font-extrabold uppercase tracking-wide">
          Editor locked
        </h1>
        <p className="mt-1 text-sm text-black/60">
          Enter the password to edit the trivia.
        </p>
        <input
          type="password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Password"
          className="mt-5 w-full rounded-lg border-2 border-black px-3 py-2.5 text-center text-lg font-bold outline-none focus:bg-[var(--oop-yellow)]/30"
        />
        {error && (
          <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy || !pin.trim()}
          className="mt-4 w-full rounded-lg border-4 border-black bg-[var(--oop-cyan)] px-4 py-3 text-base font-extrabold uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-[6px_6px_0_0_#000] disabled:opacity-50"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
        <Link
          href="/out-of-pocket"
          className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-black/40 underline-offset-4 hover:text-black hover:underline"
        >
          ← Back to lobby
        </Link>
      </form>
    </div>
  );
}
