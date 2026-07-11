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
    <main className="grid min-h-screen place-items-center px-4">
      <p className="text-muted">Loading…</p>
    </main>
  );
}
