"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Trophy, Lock, Download, Star } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

export default function RewardsPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const allBadges = useQuery(api.badges.getBadges) || [];
    const userBadges = useQuery(api.badges.getUserBadges, auth ? { userId: auth.id } : "skip") || [];
    const earnedIds = new Set(userBadges.map((ub: any) => ub.badgeId));

    return (
        <div className="app-container">
            <header className="top-bar">
                <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>←</button>
                <h1 className="top-bar-title">Achievements</h1>
                <div style={{ width: 24 }} />
            </header>

            <main className="page-content">
                {/* Total points + redeem */}
                <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>Total Rewards</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "4px 0 var(--spacing-md)" }}>
                        <span style={{ fontSize: 40, fontWeight: 800, color: "var(--color-primary)" }}>{(auth as any)?.totalPoints ?? 0}</span>
                        <span style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>Points Available</span>
                    </div>
                    <button className="btn btn-primary btn-full" id="redeem-pts-btn">🎁 Redeem Points</button>
                </div>

                {/* Badges */}
                <div className="section-header">
                    <h2 className="section-title">Badges</h2>
                    <button className="section-link">View All</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-lg)" }}>
                    {allBadges.map((b: any) => {
                        const earned = earnedIds.has(b._id);
                        const ub = userBadges.find((u: any) => u.badgeId === b._id);
                        return (
                            <div key={b._id} className="card" style={{ textAlign: "center", opacity: earned ? 1 : 0.7, position: "relative", overflow: "hidden" }}>
                                <div style={{ width: 64, height: 64, borderRadius: "50%", background: earned ? "var(--color-primary-light)" : "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-sm)", fontSize: 28 }}>
                                    {earned ? b.icon : <Lock size={24} color="var(--color-text-muted)" />}
                                </div>
                                {earned && (
                                    <div style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>
                                    </div>
                                )}
                                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{b.name}</p>
                                <p style={{ fontSize: 11, color: earned ? "var(--color-text-secondary)" : "var(--color-text-muted)" }}>
                                    {earned && ub ? `Earned ${format(new Date(ub.earnedAt), "MMM d")}` : b.description}
                                </p>
                            </div>
                        );
                    })}
                    {allBadges.length === 0 && (
                        <div style={{ gridColumn: "span 2" }}>
                            <div className="empty-state">
                                <Trophy size={48} className="empty-state-icon" />
                                <p className="empty-state-title">No badges yet</p>
                                <p className="empty-state-body">Complete activities to unlock badges!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Earned badges / certificates */}
                {userBadges.length > 0 && (
                    <>
                        <h2 className="section-title" style={{ marginBottom: "var(--spacing-md)" }}>Certificates</h2>
                        {userBadges.map((ub: any) => (
                            <div key={ub._id} className="list-item">
                                <div className="icon-wrap primary"><Star size={20} /></div>
                                <div className="list-item-content">
                                    <p className="list-item-title">{ub.badge?.name}</p>
                                    <p className="list-item-subtitle">Earned {format(new Date(ub.earnedAt), "MMM d, yyyy")}</p>
                                </div>
                                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}><Download size={18} /></button>
                            </div>
                        ))}
                    </>
                )}
            </main>

            <EmployeeBottomNav />
        </div>
    );
}
