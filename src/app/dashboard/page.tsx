"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Bell, Star, BarChart2, Activity, TrendingUp, ChevronRight, Plus, Heart, Footprints } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";

export default function DashboardPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        const a = JSON.parse(stored);
        if (a.role !== "employee") { router.replace("/admin/dashboard"); return; }
        if (a.mustChangePassword) { router.replace("/set-password"); return; }
        if (!a.isProfileComplete) { router.replace("/profile-setup"); return; }
        setAuth(a);
    }, [router]);

    const enrollments = useQuery(api.activities.getEnrollments, auth ? { userId: auth.id } : "skip") || [];
    const metrics = useQuery(api.healthMetrics.getHealthMetrics, auth ? { userId: auth.id } : "skip") || [];
    const notifications = useQuery(api.badges.getNotifications, auth ? { userId: auth.id } : "skip") || [];
    const liveUser = useQuery(api.users.getUserById, auth ? { userId: auth.id } : "skip");
    const leaderboard = useQuery(api.users.getLeaderboard, { type: "points" }) || [];
    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    // Live points & rank
    const totalPoints = liveUser?.totalPoints ?? auth?.totalPoints ?? 0;
    const rankIndex = leaderboard.findIndex((u: any) => u._id === auth?.id);
    const displayRank = rankIndex >= 0 ? rankIndex + 1 : null;

    if (!auth) return <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}><div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--color-primary-light)", borderTopColor: "var(--color-primary)", borderRadius: "50%" }} /></div>;

    const latestMetric = metrics[0];
    const prevMetric = metrics[1];
    // Find most recent entry that actually has a BMI recorded
    const latestWithBMI = metrics.find((m: any) => m.bmi != null);
    const latestWithBP = metrics.find((m: any) => m.bloodPressureSystolic != null);
    const weightDiff = latestMetric?.weight && prevMetric?.weight ? ((latestMetric.weight - prevMetric.weight) / prevMetric.weight * 100).toFixed(1) : null;

    // BMI scale: 15 → 40
    const bmiCategory = (bmi: number) => {
        const markerPct = Math.min(Math.max(((bmi - 15) / (40 - 15)) * 100, 0), 100);
        if (bmi < 18.5) return { label: "Underweight", color: "#3B82F6", markerPct };
        if (bmi < 25) return { label: "Healthy", color: "#16A34A", markerPct };
        if (bmi < 30) return { label: "Overweight", color: "#D97706", markerPct };
        return { label: "Obese", color: "#DC2626", markerPct };
    };
    // BMI zone gradient: underweight(blue) | healthy(green) | overweight(orange) | obese(red)
    // Breakpoints at 18.5, 25, 30 on a 15–40 scale = 14.3%, 40%, 60% of track
    const BMI_GRADIENT = "linear-gradient(to right, #3B82F6 0%, #3B82F6 14.3%, #16A34A 14.3%, #16A34A 40%, #D97706 40%, #D97706 60%, #DC2626 60%, #DC2626 100%)";

    // BP systolic scale: 80 → 180
    const bpCategory = (sys: number) => {
        const markerPct = Math.min(Math.max(((sys - 80) / (180 - 80)) * 100, 0), 100);
        if (sys < 120) return { label: "Normal", color: "#16A34A", markerPct };
        if (sys < 130) return { label: "Elevated", color: "#84CC16", markerPct };
        if (sys < 140) return { label: "High Stage 1", color: "#D97706", markerPct };
        return { label: "High Stage 2", color: "#DC2626", markerPct };
    };
    // BP zone gradient: normal(green) | elevated(lime) | stage1(orange) | stage2(red)
    // Breakpoints at 120, 130, 140 on an 80–180 scale = 40%, 50%, 60% of track
    const BP_GRADIENT = "linear-gradient(to right, #16A34A 0%, #16A34A 40%, #84CC16 40%, #84CC16 50%, #D97706 50%, #D97706 60%, #DC2626 60%, #DC2626 100%)";

    const statusColor: Record<string, string> = {
        in_progress: "var(--color-warning)",
        pending_verification: "var(--color-info)",
        verified: "var(--color-success)",
        rejected: "var(--color-error)",
    };
    const statusLabel: Record<string, string> = {
        in_progress: "IN PROGRESS",
        pending_verification: "PENDING VERIFICATION",
        verified: "VERIFIED",
        rejected: "REJECTED",
    };

    return (
        <div className="app-container">
            {/* Top bar */}
            <header className="top-bar">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-primary)" }}>{(auth.firstName || "U")[0]}</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Welcome back,</p>
                        <p style={{ fontSize: 16, fontWeight: 700 }}>{auth.firstName || auth.email}</p>
                    </div>
                </div>
                <button className="notification-btn" onClick={() => router.push("/notifications")} id="notifications-btn">
                    <Bell size={22} />
                    {unreadCount > 0 && <span className="notification-dot" />}
                </button>
            </header>

            <main className="page-content">
                {/* Points + Rank */}
                <div className="card-grid-2" style={{ marginBottom: "var(--spacing-md)" }}>
                    <div className="card" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)", border: "none", color: "white" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <Star size={16} color="rgba(255,255,255,0.8)" />
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Total Points</span>
                        </div>
                        <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{totalPoints}</p>
                        <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                            ↑ +150 this week
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <BarChart2 size={16} color="var(--color-text-secondary)" />
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Current Rank</span>
                        </div>
                        <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: "var(--color-primary)" }}>#{displayRank ?? "—"}</p>
                        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>View leaderboard</p>
                    </div>
                </div>

                {/* Health metrics quick view */}
                {latestMetric && (
                    <>
                        <div className="section-header">
                            <h2 className="section-title">Weekly Progress</h2>
                            <button className="section-link" onClick={() => router.push("/health")}>View History</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
                            {/* Weight */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <TrendingUp size={14} color="var(--color-text-secondary)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Weight</span>
                                </div>
                                <p style={{ fontSize: 22, fontWeight: 700 }}>{latestMetric.weight ?? "—"}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: 3 }}>{latestMetric.weightUnit ?? "kg"}</span></p>
                                {weightDiff && <span className={`kpi-trend ${parseFloat(weightDiff) < 0 ? "up" : "down"}`}>{parseFloat(weightDiff) < 0 ? "↓" : "↑"} {Math.abs(parseFloat(weightDiff))}%</span>}
                            </div>

                            {/* BMI with colour-graded bar */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Activity size={14} color="var(--color-text-secondary)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>BMI</span>
                                </div>
                                <p style={{ fontSize: 22, fontWeight: 700 }}>{latestWithBMI?.bmi ?? "—"}</p>
                                {latestWithBMI?.bmi ? (() => {
                                    const c = bmiCategory(latestWithBMI.bmi);
                                    return (
                                        <>
                                            {/* Gradient zone track with marker */}
                                            <div style={{ position: "relative", height: 8, borderRadius: 999, margin: "6px 0 3px", background: BMI_GRADIENT }}>
                                                {/* Marker line */}
                                                <div style={{
                                                    position: "absolute",
                                                    left: `${c.markerPct}%`,
                                                    top: -3,
                                                    transform: "translateX(-50%)",
                                                    width: 3,
                                                    height: 14,
                                                    background: "white",
                                                    borderRadius: 2,
                                                    boxShadow: `0 0 0 1.5px ${c.color}`,
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>{c.label}</span>
                                        </>
                                    );
                                })() : <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Log weight</span>}
                            </div>

                            {/* Blood Pressure with colour-graded bar */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Heart size={14} color="var(--color-error)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Blood Pressure</span>
                                </div>
                                <p style={{ fontSize: 18, fontWeight: 700 }}>{latestWithBP?.bloodPressureSystolic ?? "—"}<span style={{ fontSize: 13, fontWeight: 400 }}>/{latestWithBP?.bloodPressureDiastolic ?? "—"}</span></p>
                                {latestWithBP?.bloodPressureSystolic ? (() => {
                                    const c = bpCategory(latestWithBP.bloodPressureSystolic);
                                    return (
                                        <>
                                            {/* Gradient zone track with marker */}
                                            <div style={{ position: "relative", height: 8, borderRadius: 999, margin: "6px 0 3px", background: BP_GRADIENT }}>
                                                {/* Marker line */}
                                                <div style={{
                                                    position: "absolute",
                                                    left: `${c.markerPct}%`,
                                                    top: -3,
                                                    transform: "translateX(-50%)",
                                                    width: 3,
                                                    height: 14,
                                                    background: "white",
                                                    borderRadius: 2,
                                                    boxShadow: `0 0 0 1.5px ${c.color}`,
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>{c.label}</span>
                                        </>
                                    );
                                })() : <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>mmHg</span>}
                            </div>

                            {/* Steps */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Footprints size={14} color="var(--color-secondary)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Steps</span>
                                </div>
                                <p style={{ fontSize: 22, fontWeight: 700 }}>{latestMetric.steps?.toLocaleString() ?? "—"}</p>
                                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>today</span>
                            </div>
                        </div>
                    </>
                )}


                {/* Enrolled activities */}
                <div className="section-header">
                    <h2 className="section-title">My Enrolled Activities</h2>
                    <button className="section-link" onClick={() => router.push("/activities")}>See All</button>
                </div>

                {enrollments.length === 0 ? (
                    <div className="empty-state">
                        <Activity size={48} className="empty-state-icon" />
                        <p className="empty-state-title">No activities yet</p>
                        <p className="empty-state-body">Browse and enrol in activities to start earning points!</p>
                        <button className="btn btn-primary" onClick={() => router.push("/activities")}>Browse Activities</button>
                    </div>
                ) : (
                    enrollments.slice(0, 5).map((e: any) => (
                        <div key={e._id} className="list-item" onClick={() => router.push(`/activities/${e.activityId}/submit?enrollmentId=${e._id}`)} style={{ cursor: "pointer" }}>
                            <div className={`icon-wrap ${e.activity?.category || "primary"}`}>
                                <Activity size={20} />
                            </div>
                            <div className="list-item-content">
                                <p className="list-item-title">{e.activity?.name || "Activity"}</p>
                                <p className="list-item-subtitle">{e.activity?.description?.slice(0, 40)}…</p>
                                <div className="progress-bar" style={{ marginTop: 6 }}>
                                    <div className="progress-fill" style={{ width: e.status === "verified" ? "100%" : e.status === "pending_verification" ? "80%" : "40%", background: statusColor[e.status] }} />
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${statusColor[e.status]}22`, color: statusColor[e.status] }}>{statusLabel[e.status]}</span>
                                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{e.activity?.points} pts</span>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <button className="fab" onClick={() => router.push("/activities")} id="fab-enrol">
                <Plus size={28} />
            </button>

            <EmployeeBottomNav />
        </div>
    );
}
