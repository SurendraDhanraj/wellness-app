"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, Users, ClipboardCheck, BarChart2, Trophy, Scale, Footprints } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";
import { Bar, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend } from "chart.js";
import { format } from "date-fns";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend);

export default function AdminDashboardPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        const a = JSON.parse(stored);
        if (a.role === "employee") { router.replace("/dashboard"); return; }
        setAuth(a);
    }, [router]);

    const employees = useQuery(api.users.getAllEmployees) || [];
    const pending = useQuery(api.activities.getPendingVerifications) || [];
    const departments = useQuery(api.config.getDepartments) || [];
    const businessUnits = useQuery(api.config.getBusinessUnits) || [];
    const locations = useQuery(api.config.getLocations) || [];
    const leaderboard = useQuery(api.users.getLeaderboard, { type: "points" }) || [];
    const healthStats = useQuery((api.healthMetrics as any).getAdminHealthStats) || null;
    const allSubmissions = useQuery((api.healthMetrics as any).getAllSubmissions) || [];

    const totalEnrolled = employees.length;
    const totalPoints = employees.reduce((sum: number, e: any) => sum + e.totalPoints, 0);
    const avgCompletion = employees.length > 0 ? Math.round((employees.filter((e: any) => e.isProfileComplete).length / employees.length) * 100) : 0;

    const deptData = departments.slice(0, 8).map((d: any) => employees.filter((e: any) => e.departmentId === d._id).length);
    const buData = businessUnits.slice(0, 8).map((b: any) => employees.filter((e: any) => e.businessUnitId === b._id).length);
    const locationData = locations.slice(0, 8).map((l: any) => employees.filter((e: any) => e.locationId === l._id).length);

    const makeBarData = (labels: string[], data: number[], color: string) => ({
        labels,
        datasets: [{ data, backgroundColor: `${color}55`, hoverBackgroundColor: color, borderRadius: 8, borderSkipped: false }]
    });
    const barData = makeBarData(departments.slice(0, 8).map((d: any) => d.name.slice(0, 7)), deptData, "#C0244C");
    const buBarData = makeBarData(businessUnits.slice(0, 8).map((b: any) => b.name.slice(0, 7)), buData, "#7C3AED");
    const locationBarData = makeBarData(locations.slice(0, 8).map((l: any) => l.name.slice(0, 7)), locationData, "#0891B2");

    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#243447", titleColor: "#E8EDF2", bodyColor: "#7A96AE" } },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#7A96AE", font: { size: 11 } }, border: { display: false } },
            y: { grid: { color: "#2E415922" }, ticks: { color: "#7A96AE", font: { size: 11 }, precision: 0, stepSize: 1 }, border: { display: false } }
        }
    };

    // Build last-7-days submission counts from real data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });
    const dayLabels = last7Days.map(d => format(d, "EEE d"));
    const submissionCounts = last7Days.map(day => {
        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
        return (allSubmissions as any[]).filter((s: any) => {
            const t = s.completedAt;
            return t >= dayStart.getTime() && t <= dayEnd.getTime();
        }).length;
    });

    const lineData = {
        labels: dayLabels,
        datasets: [{
            data: submissionCounts,
            borderColor: "#C0244C",
            backgroundColor: "#C0244C22",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#C0244C",
            pointRadius: 4,
        }]
    };
    const lineOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#243447", titleColor: "#E8EDF2", bodyColor: "#7A96AE" } },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#7A96AE", font: { size: 11 } }, border: { display: false } },
            y: { grid: { color: "#2E415922" }, ticks: { color: "#7A96AE", font: { size: 11 }, precision: 0, stepSize: 1 }, border: { display: false } }
        }
    };

    const statusColor: Record<string, string> = { pending_verification: "#D97706", verified: "#16A34A", rejected: "#DC2626" };

    if (!auth) return <div className="admin-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}><div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid #2E4159", borderTopColor: "#C0244C", borderRadius: "50%" }} /></div>;

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 14, fontWeight: 800 }}>H</span>
                    </div>
                    <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Admin Overview</h1>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button className="notification-btn" style={{ color: "var(--color-admin-text-muted)" }}><Bell size={20} /></button>
                    <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: 13, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", cursor: "pointer" }} onClick={() => router.push("/admin/settings")}>
                        {(auth.firstName || "A")[0]}
                    </div>
                </div>
            </header>

            <main className="admin-content">
                {/* KPI row */}
                <div className="card admin" style={{ marginBottom: "var(--spacing-sm)" }}>
                    <p className="kpi-label admin">Total Employees Enrolled</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
                        <p className="kpi-value admin" style={{ fontSize: 40 }}>{totalEnrolled.toLocaleString()}</p>
                        <Users size={28} color="var(--color-primary)" />
                    </div>
                    <span className="kpi-trend up">↑ Live</span>
                </div>
                <div className="card-grid-2" style={{ marginBottom: "var(--spacing-sm)" }}>
                    <div className="card admin" style={{ cursor: "pointer" }} onClick={() => router.push("/admin/verify")}>
                        <p className="kpi-label admin">Pending</p>
                        <p className="kpi-value admin" style={{ fontSize: 32 }}>{pending.length}</p>
                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Verifications</p>
                        <ClipboardCheck size={22} color="var(--color-warning)" style={{ marginTop: 4 }} />
                    </div>
                    <div className="card admin">
                        <p className="kpi-label admin">Avg Completion</p>
                        <p className="kpi-value admin" style={{ fontSize: 32 }}>{avgCompletion}%</p>
                        <span className="kpi-trend up" style={{ fontSize: 11 }}>Profiles complete</span>
                    </div>
                </div>

                {/* Dept chart */}
                <div className="card admin" style={{ marginBottom: "var(--spacing-sm)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--spacing-md)" }}>
                        <p style={{ fontWeight: 700, color: "var(--color-admin-text)" }}>Participation by Department</p>
                    </div>
                    <div style={{ height: 160 }}>
                        <Bar data={barData} options={barOptions} />
                    </div>
                </div>

                {/* Business Unit chart */}
                <div className="card admin" style={{ marginBottom: "var(--spacing-sm)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--spacing-md)" }}>
                        <p style={{ fontWeight: 700, color: "var(--color-admin-text)" }}>Participation by Business Unit</p>
                    </div>
                    <div style={{ height: 160 }}>
                        <Bar data={buBarData} options={barOptions} />
                    </div>
                </div>

                {/* Location chart */}
                <div className="card admin" style={{ marginBottom: "var(--spacing-sm)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--spacing-md)" }}>
                        <p style={{ fontWeight: 700, color: "var(--color-admin-text)" }}>Participation by Location</p>
                    </div>
                    <div style={{ height: 160 }}>
                        <Bar data={locationBarData} options={barOptions} />
                    </div>
                </div>

                {/* Activity submissions chart */}
                <div className="card admin" style={{ marginBottom: "var(--spacing-md)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--spacing-md)" }}>
                        <p style={{ fontWeight: 700, color: "var(--color-admin-text)" }}>Activity Submissions</p>
                        <span style={{ fontSize: 11, background: "var(--color-admin-surface)", color: "var(--color-admin-text)", padding: "4px 10px", borderRadius: "var(--radius-full)", fontWeight: 600 }}>Weekly</span>
                    </div>
                    <div style={{ height: 160 }}>
                        <Line data={lineData} options={lineOptions} />
                    </div>
                </div>

                {/* Recent verifications */}
                <h2 className="section-title admin" style={{ marginBottom: "var(--spacing-md)" }}>Recent Verifications</h2>
                {pending.slice(0, 5).length === 0 ? (
                    <p style={{ color: "var(--color-admin-text-muted)", fontSize: 14 }}>No pending verifications.</p>
                ) : (
                    pending.slice(0, 5).map((e: any) => (
                        <div key={e._id} className="list-item admin" style={{ cursor: "pointer" }} onClick={() => router.push("/admin/verify")}>
                            <div className="icon-wrap admin"><BarChart2 size={20} /></div>
                            <div className="list-item-content">
                                <p className="list-item-title admin">{e.activity?.name || "Activity"}</p>
                                <p className="list-item-subtitle admin">{e.user?.firstName} {e.user?.surname}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: `${statusColor[e.status]}22`, color: statusColor[e.status], fontWeight: 700 }}>Pending</span>
                                <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 4 }}>{format(new Date(e.completedAt || e.enrolledAt), "h:mm a")}</p>
                            </div>
                        </div>
                    ))
                )}

                {/* ── Leaderboard Summary ── */}
                <h2 className="section-title admin" style={{ marginBottom: "var(--spacing-sm)", marginTop: "var(--spacing-lg)" }}>
                    <Trophy size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />Points Leaderboard
                </h2>
                <div className="card admin" style={{ padding: 0, overflow: "hidden", marginBottom: "var(--spacing-sm)" }}>
                    {leaderboard.slice(0, 5).map((u: any, i: number) => {
                        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                        return (
                            <div key={u._id} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 16px",
                                borderBottom: i < 4 ? "1px solid var(--color-admin-border)" : "none",
                            }}>
                                <div style={{ width: 26, textAlign: "center", flexShrink: 0, fontSize: medal ? 18 : 12, fontWeight: 700, color: "var(--color-admin-text-muted)" }}>
                                    {medal ?? (i + 1)}
                                </div>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-admin-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {u.avatarUrl
                                        ? <img src={u.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                                        : <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-admin-text)" }}>{(u.firstName?.[0] ?? "?")}{(u.surname?.[0] ?? "")}</span>
                                    }
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {`${u.firstName ?? ""} ${u.surname ?? ""}`.trim() || u.email}
                                    </p>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>{(u.totalPoints ?? 0).toLocaleString()}</p>
                                    <p style={{ fontSize: 10, color: "var(--color-admin-text-muted)" }}>pts</p>
                                </div>
                            </div>
                        );
                    })}
                    {leaderboard.length === 0 && (
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", textAlign: "center", padding: "var(--spacing-md)" }}>No data yet.</p>
                    )}
                </div>

                {/* ── Top Weight Loss ── */}
                <h2 className="section-title admin" style={{ marginBottom: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
                    <Scale size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />Top Weight Loss
                </h2>
                <div className="card admin" style={{ padding: 0, overflow: "hidden", marginBottom: "var(--spacing-sm)" }}>
                    {(healthStats?.topWeightLoss ?? []).slice(0, 5).map((e: any, i: number) => {
                        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                        return (
                            <div key={e.userId} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 16px",
                                borderBottom: i < (healthStats?.topWeightLoss?.length ?? 1) - 1 ? "1px solid var(--color-admin-border)" : "none",
                            }}>
                                <div style={{ width: 26, textAlign: "center", flexShrink: 0, fontSize: medal ? 18 : 12, fontWeight: 700, color: "var(--color-admin-text-muted)" }}>
                                    {medal ?? (i + 1)}
                                </div>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-admin-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-admin-text)" }}>{(e.user?.firstName?.[0] ?? "?")}{(e.user?.surname?.[0] ?? "")}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {`${e.user?.firstName ?? ""} ${e.user?.surname ?? ""}`.trim() || "Unknown"}
                                    </p>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>−{e.loss.toFixed(1)} kg</p>
                                    <p style={{ fontSize: 10, color: "var(--color-admin-text-muted)" }}>now {e.latestWeight?.toFixed(1)} kg</p>
                                </div>
                            </div>
                        );
                    })}
                    {(healthStats?.topWeightLoss ?? []).length === 0 && (
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", textAlign: "center", padding: "var(--spacing-md)" }}>No weight loss data yet.</p>
                    )}
                </div>

                {/* ── Top Steps ── */}
                <h2 className="section-title admin" style={{ marginBottom: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
                    <Footprints size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />Top Steps (Total)
                </h2>
                <div className="card admin" style={{ padding: 0, overflow: "hidden", marginBottom: "var(--spacing-xl)" }}>
                    {(healthStats?.topSteps ?? []).slice(0, 5).map((e: any, i: number) => {
                        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                        return (
                            <div key={e.userId} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 16px",
                                borderBottom: i < (healthStats?.topSteps?.length ?? 1) - 1 ? "1px solid var(--color-admin-border)" : "none",
                            }}>
                                <div style={{ width: 26, textAlign: "center", flexShrink: 0, fontSize: medal ? 18 : 12, fontWeight: 700, color: "var(--color-admin-text-muted)" }}>
                                    {medal ?? (i + 1)}
                                </div>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-admin-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-admin-text)" }}>{(e.user?.firstName?.[0] ?? "?")}{(e.user?.surname?.[0] ?? "")}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {`${e.user?.firstName ?? ""} ${e.user?.surname ?? ""}`.trim() || "Unknown"}
                                    </p>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-secondary)" }}>{e.steps.toLocaleString()}</p>
                                    <p style={{ fontSize: 10, color: "var(--color-admin-text-muted)" }}>steps</p>
                                </div>
                            </div>
                        );
                    })}
                    {(healthStats?.topSteps ?? []).length === 0 && (
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", textAlign: "center", padding: "var(--spacing-md)" }}>No steps data yet.</p>
                    )}
                </div>
            </main>

            <AdminBottomNav />
        </div>
    );
}
