"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type LoginResponse } from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/shop");
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "register") {
        await api("/api/users/register/", {
          method: "POST",
          body: { email, password },
        });
        setInfo("Account created. Signing you in…");
      }

      const data = await api<LoginResponse>("/api/users/login/", {
        method: "POST",
        body: { email, password },
      });
      setSession(data.access, email);
      router.replace("/shop");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md animate-rise rounded-[22px] border border-line bg-white p-7 shadow-panel sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Raco AI Assessment
        </h1>
        <p className="mt-2 mb-6 leading-relaxed text-muted">
          Sign in to browse products, place orders, and pay with Stripe or
          bKash.
        </p>

        <div
          className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1"
          role="tablist"
        >
          <button
            type="button"
            className={`rounded-full px-3 py-2.5 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-white text-ink shadow-sm"
                : "bg-transparent text-muted"
            }`}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-2.5 text-sm font-semibold transition ${
              mode === "register"
                ? "bg-white text-ink shadow-sm"
                : "bg-transparent text-muted"
            }`}
            onClick={() => setMode("register")}
          >
            Create account
          </button>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {info ? <div className="alert alert-ok">{info}</div> : null}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="field-input"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="field-input"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account & continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
