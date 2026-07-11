"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type LoginResponse } from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/shop");
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
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

        <div className="mb-5 rounded-xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink">
          <p className="font-semibold">Demo admin</p>
          <p className="mt-1 text-muted">
            Email:{" "}
            <span className="font-mono text-ink">admin@example.com</span>
          </p>
          <p className="text-muted">
            Password:{" "}
            <span className="font-mono text-ink">Admin12345!</span>
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
            onClick={() => {
              setEmail("admin@example.com");
              setPassword("Admin12345!");
            }}
          >
            Fill admin credentials
          </button>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

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
              autoComplete="current-password"
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
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
