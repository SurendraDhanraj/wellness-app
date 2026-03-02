"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const stored = localStorage.getItem("heritage_auth");
    if (!stored) { router.replace("/login"); return; }
    try {
      const auth = JSON.parse(stored);
      if (auth.mustChangePassword) { router.replace("/set-password"); return; }
      if (auth.role === "employee") {
        if (!auth.isProfileComplete) { router.replace("/profile-setup"); return; }
        router.replace("/dashboard");
      } else {
        router.replace("/admin/dashboard");
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "var(--color-surface)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--color-primary-light)", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading…</p>
      </div>
    </div>
  );
}
