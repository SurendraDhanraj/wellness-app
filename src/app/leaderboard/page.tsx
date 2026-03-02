"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Share2 } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";

const TABS = ["Overall", "Steps", "Weight Loss"];
const TAB_TYPES = ["points", "steps", "weight_loss"] as const;

export default function LeaderboardPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [tab, setTab] = useState(0);
    const [buFilter, setBuFilter] = useState<string | undefined>();
    const [deptFilter, setDeptFilter] = useState<string | undefined>();
    const [locFilter, setLocFilter] = useState<string | undefined>();

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const businessUnits = useQuery(api.config.getBusinessUnits) || [];
    const departments = useQuery(api.config.getDepartments) || [];
    const locations = useQuery(api.config.getLocations) || [];
    const leaderboard = useQuery(api.users.getLeaderboard, {
        type: TAB_TYPES[tab],
        businessUnitId: buFilter as any,
        departmentId: deptFilter as any,
        locationId: locFilter as any,
    }) || [];

    const myRank = leaderboard.findIndex((u: any) => u._id === auth?.id) + 1;
    const me = leaderboard.find((u: any) => u._id === auth?.id);
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    const getValue = (u: any) => tab === 0 ? u.totalPoints : (u.leaderboardValue ?? 0);
    const getUnit = () => tab === 1 ? "steps" : "pts";

    return (
        <div className="app-container">
            <header className="top-bar">
                <button onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>←</button>
                <h1 className="top-bar-title">Leaderboard</h1>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}><Share2 size={20} /></button>
            </header>

            <main className="page-content">
                {/* Tab bar */}
                <div className="segmented" style={{ marginBottom: "var(--spacing-md)" }}>
                    {TABS.map((t, i) => <button key={t} className={`seg-btn ${tab === i ? "active" : ""}`} onClick={() => setTab(i)} id={`lb-tab-${t.toLowerCase().replace(" ", "-")}`}>{t}</button>)}
                </div>

                {/* Filters */}
                <div className="chip-row" style={{ marginBottom: "var(--spacing-md)" }}>
                    <select className="input select" style={{ padding: "6px 32px 6px 12px", fontSize: 13, height: "auto", width: "auto", flexShrink: 0 }}
                        value={buFilter || ""} onChange={(e) => setBuFilter(e.target.value || undefined)} id="lb-bu-filter">
                        <option value="">All BUs</option>
                        {businessUnits.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                    <select className="input select" style={{ padding: "6px 32px 6px 12px", fontSize: 13, height: "auto", width: "auto", flexShrink: 0 }}
                        value={deptFilter || ""} onChange={(e) => setDeptFilter(e.target.value || undefined)} id="lb-dept-filter">
                        <option value="">All Depts</option>
                        {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    <select className="input select" style={{ padding: "6px 32px 6px 12px", fontSize: 13, height: "auto", width: "auto", flexShrink: 0 }}
                        value={locFilter || ""} onChange={(e) => setLocFilter(e.target.value || undefined)} id="lb-loc-filter">
                        <option value="">All Locations</option>
                        {locations.map((l: any) => <option key={l._id} value={l._id}>{l.name}</option>)}
                    </select>
                </div>

                {/* Podium */}
                {top3.length >= 1 && (
                    <div className="podium-container">
                        {/* 2nd */}
                        {top3[1] && (
                            <div className="podium-item">
                                <div className="podium-avatar-wrap">
                                    <div className="avatar-placeholder" style={{ width: 64, height: 64, fontSize: 22 }}>{(top3[1].firstName || "?")[0]}</div>
                                    <div className="podium-rank second">2</div>
                                </div>
                                <p className="podium-name">{top3[1].firstName} {top3[1].surname?.slice(0, 1)}.</p>
                                <span className="podium-pts">{getValue(top3[1]).toLocaleString()} {getUnit()}</span>
                            </div>
                        )}
                        {/* 1st */}
                        <div className="podium-item" style={{ marginBottom: -16 }}>
                            <div style={{ fontSize: 24, textAlign: "center", marginBottom: 4 }}>👑</div>
                            <div className="podium-avatar-wrap">
                                <div className="avatar-placeholder" style={{ width: 80, height: 80, fontSize: 28, border: "3px solid var(--color-warning)" }}>{(top3[0].firstName || "?")[0]}</div>
                                <div className="podium-rank first">1</div>
                            </div>
                            <p className="podium-name" style={{ fontWeight: 700, color: "var(--color-primary)" }}>{top3[0].firstName} {top3[0].surname?.slice(0, 1)}.</p>
                            <span className="podium-pts">{getValue(top3[0]).toLocaleString()} {getUnit()}</span>
                        </div>
                        {/* 3rd */}
                        {top3[2] && (
                            <div className="podium-item">
                                <div className="podium-avatar-wrap">
                                    <div className="avatar-placeholder" style={{ width: 64, height: 64, fontSize: 22 }}>{(top3[2].firstName || "?")[0]}</div>
                                    <div className="podium-rank third">3</div>
                                </div>
                                <p className="podium-name">{top3[2].firstName} {top3[2].surname?.slice(0, 1)}.</p>
                                <span className="podium-pts">{getValue(top3[2]).toLocaleString()} {getUnit()}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Rank list */}
                <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--color-border)", marginBottom: "var(--spacing-md)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 0, padding: "8px var(--spacing-md)", background: "var(--color-employee-bg)", borderBottom: "1px solid var(--color-border)" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Rank</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Employee</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Points</span>
                    </div>
                    {rest.map((u: any, i: number) => (
                        <div key={u._id} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", alignItems: "center", padding: "12px var(--spacing-md)", borderBottom: "1px solid var(--color-border)", background: u._id === auth?.id ? "var(--color-primary-light)" : "var(--color-surface)" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-secondary)" }}>{i + 4}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: 14 }}>{(u.firstName || "?")[0]}</div>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600 }}>{u.firstName} {u.surname}</p>
                                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{u.departmentId || ""}</p>
                                </div>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-primary)" }}>{getValue(u).toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400 }}>{getUnit()}</span></span>
                        </div>
                    ))}
                </div>

                {/* My rank pinned */}
                {me && myRank > 0 && (
                    <div className="my-rank-bar">
                        <span style={{ fontSize: 20, fontWeight: 800, minWidth: 32 }}>{myRank}</span>
                        <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 16, background: "rgba(255,255,255,0.2)", color: "white" }}>{(auth.firstName || "?")[0]}</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700 }}>{auth.firstName} {auth.surname} (You)</p>
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 800 }}>{getValue(me).toLocaleString()} <span style={{ fontSize: 11, opacity: 0.8 }}>{getUnit()}</span></span>
                    </div>
                )}
            </main>

            <EmployeeBottomNav />
        </div>
    );
}
