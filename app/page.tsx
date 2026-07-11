"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/shop" : "/login");
  }, [router]);

  return (
    <main className="auth-page">
      <p className="auth-panel__lead">Loading…</p>
    </main>
  );
}
