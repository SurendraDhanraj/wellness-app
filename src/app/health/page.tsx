"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TrendingUp, Activity, Heart, Footprints, Scale, Plus } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

function calcBMI(weight: number, wUnit: "kg" | "lbs", height: number, hUnit: "cm" | "ft"): number {
    const weightKg = wUnit === "lbs" ? weight * 0.453592 : weight;
    const heightM = hUnit === "ft" ? height * 0.3048 : height / 100;
    if (!heightM) return 0;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

// --- Dual-line sparkline for blood pressure ---
function DualSparkline({
    seriesA, seriesB, colorA, colorB, labelA, labelB, height = 80, fixedMin, fixedMax, dates = [],
}: {
    seriesA: number[]; seriesB: number[];
    colorA: string; colorB: string;
    labelA: string; labelB: string;
    height?: number;
    fixedMin?: number;
    fixedMax?: number;
    dates?: string[];
}) {
    const n = Math.min(seriesA.length, seriesB.length);
    if (n < 2) {
        return (
            <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Not enough data</span>
            </div>
        );
    }
    const W = 300;
    const xAxisH = 14;
    const H = height - xAxisH;
    const pad = 10;
    const allVals = [...seriesA.slice(-n), ...seriesB.slice(-n)];
    const min = fixedMin ?? Math.min(...allVals);
    const max = fixedMax ?? Math.max(...allVals);
    const range = max - min || 1;
    const norm = (v: number, i: number) => ([
        pad + (i / (n - 1)) * (W - 2 * pad),
        pad + ((max - v) / range) * (H - 2 * pad),
    ] as [number, number]);
    const ptsA = seriesA.slice(-n).map((v, i) => norm(v, i));
    const ptsB = seriesB.slice(-n).map((v, i) => norm(v, i));
    const polyA = ptsA.map(p => p.join(",")).join(" ");
    const polyB = ptsB.map(p => p.join(",")).join(" ");
    return (
        <>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
                style={{ width: "100%", height, display: "block", overflow: "visible" }}>
                {/* Systolic line */}
                <polyline points={polyA} fill="none" stroke={colorA} strokeWidth="2"
                    strokeLinejoin="round" strokeLinecap="round" />
                {ptsA.map(([x, y], i) => {
                    const isLast = i === n - 1;
                    return (
                        <g key={`a${i}`}>
                            <circle cx={x} cy={y} r={isLast ? 4 : 2} fill={colorA} />
                        </g>
                    );
                })}
                {/* Diastolic line */}
                <polyline points={polyB} fill="none" stroke={colorB} strokeWidth="2"
                    strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />
                {ptsB.map(([x, y], i) => {
                    const isLast = i === n - 1;
                    const dateLabel = dates[i] ? format(new Date(dates[i]), "MMM d") : "";
                    return (
                        <g key={`b${i}`}>
                            <circle cx={x} cy={y} r={isLast ? 4 : 2} fill={colorB} />
                            {dateLabel && (
                                <text x={x} y={H + 11} textAnchor="middle"
                                    fontSize="8" fill={isLast ? "#555" : "#aaa"} fontWeight={isLast ? "600" : "400"}>
                                    {dateLabel}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginTop: 6, justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 16, height: 2.5, background: colorA, borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: colorA, fontWeight: 600 }}>{labelA}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke={colorB} strokeWidth="2" strokeDasharray="4 2" /></svg>
                    <span style={{ fontSize: 11, color: colorB, fontWeight: 600 }}>{labelB}</span>
                </div>
            </div>
        </>
    );
}

// --- Bar chart for steps ---
function BarGraph({ values, color, height = 80, dates = [] }: { values: number[]; color: string; height?: number; dates?: string[] }) {
    if (values.length === 0) {
        return (
            <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>No steps data yet</span>
            </div>
        );
    }
    const W = 300; const H = height; const pad = 4;
    const xAxisH = 14; // room for date labels
    const chartH = H - xAxisH;
    const max = Math.max(...values) || 1;
    const n = values.length;
    const gapRatio = 0.25;
    const totalW = W - 2 * pad;
    const barW = (totalW / n) * (1 - gapRatio);
    const gap = (totalW / n) * gapRatio;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block", overflow: "visible" }}>
            {values.map((v, i) => {
                const barH = ((v / max) * (chartH - pad - 18));
                const x = pad + i * (barW + gap);
                const y = chartH - pad - barH;
                const isLast = i === n - 1;
                const dateLabel = dates[i] ? format(new Date(dates[i]), "MMM d") : "";
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={barW} height={barH}
                            rx={2} fill={isLast ? color : `${color}88`} />
                        <text x={x + barW / 2} y={y - 3} textAnchor="middle"
                            fontSize="8" fontWeight={isLast ? "700" : "500"}
                            fill={isLast ? color : `${color}bb`}>
                            {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                        </text>
                        {dateLabel && (
                            <text x={x + barW / 2} y={H - 2} textAnchor="middle"
                                fontSize="8" fill={isLast ? "#555" : "#aaa"} fontWeight={isLast ? "600" : "400"}>
                                {dateLabel}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// --- Sparkline SVG ---
function Sparkline({
    values,
    color,
    height = 56,
    width = "100%",
    fixedMin,
    fixedMax,
    dates = [],
}: {
    values: number[];
    color: string;
    height?: number;
    width?: string | number;
    fixedMin?: number;
    fixedMax?: number;
    dates?: string[];
}) {
    if (values.length < 2) {
        return (
            <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Not enough data</span>
            </div>
        );
    }
    const W = 300;
    const xAxisH = 14;
    const H = height - xAxisH;
    const pad = 6;
    const min = fixedMin ?? Math.min(...values);
    const max = fixedMax ?? Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (W - 2 * pad);
        const y = pad + ((max - v) / range) * (H - 2 * pad);
        return [x, y] as [number, number];
    });
    const polyline = pts.map((p) => p.join(",")).join(" ");
    const areaPoints = [
        `${pts[0][0]},${H}`,
        ...pts.map((p) => p.join(",")),
        `${pts[pts.length - 1][0]},${H}`,
    ].join(" ");

    const last = pts[pts.length - 1];

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ width, height, display: "block", overflow: "visible" }}
        >
            <defs>
                <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Area fill */}
            <polygon points={areaPoints} fill={`url(#grad-${color.replace("#", "")})`} />
            {/* Line */}
            <polyline points={polyline} fill="none" stroke={color} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
            {/* Dots + value labels for every point, with date on X-axis */}
            {pts.map(([x, y], i) => {
                const isLast = i === pts.length - 1;
                const labelY = i % 2 === 0 ? y - 9 : y + 17;
                const dateLabel = dates[i] ? format(new Date(dates[i]), "MMM d") : "";
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r={isLast ? 4 : 2.5} fill={color} />
                        <text x={x} y={labelY} textAnchor="middle"
                            fontSize={isLast ? "11" : "9"} fontWeight={isLast ? "700" : "500"}
                            fill={color} fillOpacity={isLast ? 1 : 0.75}>
                            {values[i]}
                        </text>
                        {dateLabel && (
                            <text x={x} y={H + 11} textAnchor="middle"
                                fontSize="8" fill={isLast ? "#555" : "#aaa"} fontWeight={isLast ? "600" : "400"}>
                                {dateLabel}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// Gradient zone bars (same as dashboard)
const BMI_GRADIENT =
    "linear-gradient(to right, #3B82F6 0%, #3B82F6 14.3%, #16A34A 14.3%, #16A34A 40%, #D97706 40%, #D97706 60%, #DC2626 60%, #DC2626 100%)";
const BP_GRADIENT =
    "linear-gradient(to right, #16A34A 0%, #16A34A 40%, #84CC16 40%, #84CC16 50%, #D97706 50%, #D97706 60%, #DC2626 60%, #DC2626 100%)";

function bmiCategory(bmi: number) {
    const markerPct = Math.min(Math.max(((bmi - 15) / (40 - 15)) * 100, 0), 100);
    if (bmi < 18.5) return { label: "Underweight", color: "#3B82F6", markerPct };
    if (bmi < 25) return { label: "Healthy", color: "#16A34A", markerPct };
    if (bmi < 30) return { label: "Overweight", color: "#D97706", markerPct };
    return { label: "Obese", color: "#DC2626", markerPct };
}
function bpCategory(sys: number) {
    const markerPct = Math.min(Math.max(((sys - 80) / (180 - 80)) * 100, 0), 100);
    if (sys < 120) return { label: "Normal", color: "#16A34A", markerPct };
    if (sys < 130) return { label: "Elevated", color: "#84CC16", markerPct };
    if (sys < 140) return { label: "High Stage 1", color: "#D97706", markerPct };
    return { label: "High Stage 2", color: "#DC2626", markerPct };
}

function GradientBar({ gradient, markerPct, color }: { gradient: string; markerPct: number; color: string }) {
    return (
        <div style={{ position: "relative", height: 8, borderRadius: 999, margin: "6px 0 3px", background: gradient }}>
            <div style={{
                position: "absolute",
                left: `${markerPct}%`,
                top: -3,
                transform: "translateX(-50%)",
                width: 3,
                height: 14,
                background: "white",
                borderRadius: 2,
                boxShadow: `0 0 0 1.5px ${color}`,
            }} />
        </div>
    );
}

export default function HealthPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [showLog, setShowLog] = useState(false);
    const [logDate, setLogDate] = useState(today());
    const [form, setForm] = useState({ weight: "", weightUnit: "kg" as "kg" | "lbs", systolic: "", diastolic: "", steps: "" });
    const [saving, setSaving] = useState(false);
    const [activeGraph, setActiveGraph] = useState<"weight" | "bmi" | "bp" | "steps">("weight");
    const log = useMutation(api.healthMetrics.logHealthMetric);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const userProfile = useQuery(api.users.getUserById, auth ? { userId: auth.id } : "skip");
    const metrics = useQuery(api.healthMetrics.getHealthMetrics, auth ? { userId: auth.id } : "skip") || [];
    const latest = metrics[0];
    const latestWithBMI = metrics.find((m: any) => m.bmi != null);
    const latestWithBP = metrics.find((m: any) => m.bloodPressureSystolic != null);

    const autoCalculatedBMI: number | null = (() => {
        if (!form.weight || !userProfile?.height) return null;
        return calcBMI(parseFloat(form.weight), form.weightUnit, userProfile.height, userProfile.heightUnit ?? "cm");
    })();

    // Build graph series (chronological order: oldest first)
    const chronological = [...metrics].reverse();
    const weightEntries = chronological.filter((m: any) => m.weight != null);
    const bmiEntries = chronological.filter((m: any) => m.bmi != null);
    const bpEntries = chronological.filter((m: any) => m.bloodPressureSystolic != null);
    const stepsEntries = chronological.filter((m: any) => m.steps != null);

    const weightSeries = weightEntries.map((m: any) => m.weight);
    const bmiSeries = bmiEntries.map((m: any) => m.bmi);
    const bpSeries = bpEntries.map((m: any) => m.bloodPressureSystolic);
    const bpDiaSeries = bpEntries.map((m: any) => m.bloodPressureDiastolic);
    const stepsSeries = stepsEntries.map((m: any) => m.steps);

    const weightDates = weightEntries.map((m: any) => m.date as string);
    const bmiDates = bmiEntries.map((m: any) => m.date as string);
    const bpDates = bpEntries.map((m: any) => m.date as string);
    const stepsDates = stepsEntries.map((m: any) => m.date as string);

    const graphTabs: { id: "weight" | "bmi" | "bp" | "steps"; label: string; color: string; series: number[]; dates: string[] }[] = [
        { id: "weight", label: "Weight", color: "#C0244C", series: weightSeries, dates: weightDates },
        { id: "bmi", label: "BMI", color: "#16A34A", series: bmiSeries, dates: bmiDates },
        { id: "bp", label: "BP", color: "#DC2626", series: bpSeries, dates: bpDates },
        { id: "steps", label: "Steps", color: "#3D5068", series: stepsSeries, dates: stepsDates },
    ];
    const activeTab = graphTabs.find((t) => t.id === activeGraph)!;

    const openLog = () => {
        setLogDate(today());
        setForm({ weight: "", weightUnit: "kg", systolic: "", diastolic: "", steps: "" });
        setShowLog(true);
    };

    const handleSave = async () => {
        if (!auth) return;
        setSaving(true);
        try {
            await log({
                userId: auth.id,
                date: logDate,
                weight: form.weight ? parseFloat(form.weight) : undefined,
                weightUnit: form.weight ? form.weightUnit : undefined,
                bmi: autoCalculatedBMI ?? undefined,
                bloodPressureSystolic: form.systolic ? parseInt(form.systolic) : undefined,
                bloodPressureDiastolic: form.diastolic ? parseInt(form.diastolic) : undefined,
                steps: form.steps ? parseInt(form.steps) : undefined,
            });
            setShowLog(false);
            setLogDate(today());
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="app-container">
            <header className="top-bar">
                <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>←</button>
                <h1 className="top-bar-title">Health Tracker</h1>
                <button className="btn btn-primary btn-sm" onClick={openLog} id="log-health-btn"><Plus size={16} /> Log</button>
            </header>

            <main className="page-content">

                {/* ── Most Recent – same 4-card layout as dashboard ── */}
                {latest && (
                    <>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "var(--spacing-sm)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Most Recent — {format(new Date(latest.date), "MMM d, yyyy")}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-lg)" }}>
                            {/* Weight */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Scale size={14} color="var(--color-text-secondary)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Weight</span>
                                </div>
                                <p style={{ fontSize: 22, fontWeight: 700 }}>{latest.weight ?? "—"}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>{latest.weightUnit}</span></p>
                            </div>

                            {/* BMI with gradient bar */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <TrendingUp size={14} color="var(--color-text-secondary)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>BMI</span>
                                </div>
                                <p style={{ fontSize: 22, fontWeight: 700 }}>{latestWithBMI?.bmi ?? "—"}</p>
                                {latestWithBMI?.bmi ? (() => {
                                    const c = bmiCategory(latestWithBMI.bmi);
                                    return <>
                                        <GradientBar gradient={BMI_GRADIENT} markerPct={c.markerPct} color={c.color} />
                                        <span style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>{c.label}</span>
                                    </>;
                                })() : <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Log weight</span>}
                            </div>

                            {/* Blood Pressure with gradient bar */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Heart size={14} color="var(--color-error)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Blood Pressure</span>
                                </div>
                                <p style={{ fontSize: 18, fontWeight: 700 }}>
                                    {latestWithBP?.bloodPressureSystolic ?? "—"}<span style={{ fontSize: 13, fontWeight: 400 }}>/{latestWithBP?.bloodPressureDiastolic ?? "—"}</span>
                                </p>
                                {latestWithBP?.bloodPressureSystolic ? (() => {
                                    const c = bpCategory(latestWithBP.bloodPressureSystolic);
                                    return <>
                                        <GradientBar gradient={BP_GRADIENT} markerPct={c.markerPct} color={c.color} />
                                        <span style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>{c.label}</span>
                                    </>;
                                })() : <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>mmHg</span>}
                            </div>

                            {/* Steps */}
                            <div className="card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Footprints size={14} color="var(--color-secondary)" />
                                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Steps</span>
                                </div>
                                <p style={{ fontSize: 22, fontWeight: 700 }}>{latest.steps?.toLocaleString() ?? "—"}</p>
                                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>today</span>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Trend Graphs ── */}
                {metrics.length >= 1 && (
                    <>
                        <div className="section-header" style={{ marginTop: 0 }}>
                            <h2 className="section-title">Trends</h2>
                        </div>

                        {/* Tab selector */}
                        <div style={{ display: "flex", gap: 6, marginBottom: "var(--spacing-md)", overflowX: "auto", paddingBottom: 4 }}>
                            {graphTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveGraph(tab.id)}
                                    style={{
                                        padding: "6px 14px",
                                        borderRadius: 999,
                                        border: "1.5px solid",
                                        borderColor: activeGraph === tab.id ? tab.color : "var(--color-border)",
                                        background: activeGraph === tab.id ? `${tab.color}15` : "transparent",
                                        color: activeGraph === tab.id ? tab.color : "var(--color-text-secondary)",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    {tab.label}
                                    {tab.series.length > 0 && (
                                        <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>({tab.series.length})</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Graph card */}
                        <div className="card" style={{ marginBottom: "var(--spacing-lg)", padding: "var(--spacing-md)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{activeTab.label} over time</span>
                                {activeTab.id === "weight" && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>kg / lbs</span>}
                                {activeTab.id === "bp" && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>mmHg</span>}
                            </div>
                            {activeTab.id === "bp" ? (
                                <DualSparkline
                                    seriesA={bpSeries} seriesB={bpDiaSeries}
                                    colorA="#DC2626" colorB="#3B82F6"
                                    labelA="Systolic" labelB="Diastolic"
                                    height={96}
                                    dates={bpDates}
                                />
                            ) : activeTab.id === "steps" ? (
                                <BarGraph values={stepsSeries} color={activeTab.color} height={96} dates={stepsDates} />
                            ) : (
                                <>
                                    <Sparkline values={activeTab.series} color={activeTab.color} height={96} width="100%" dates={activeTab.dates} />
                                    {activeTab.series.length === 0 && (
                                        <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", paddingBottom: 8 }}>
                                            No {activeTab.label.toLowerCase()} data logged yet
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ── History List ── */}
                <h2 className="section-title" style={{ marginBottom: "var(--spacing-md)" }}>History</h2>
                {metrics.length === 0 ? (
                    <div className="empty-state">
                        <Activity size={48} className="empty-state-icon" />
                        <p className="empty-state-title">No entries yet</p>
                        <p className="empty-state-body">Start logging your health metrics daily to track progress.</p>
                        <button className="btn btn-primary" onClick={openLog}>Log First Entry</button>
                    </div>
                ) : (
                    metrics.map((m: any) => (
                        <div key={m._id} className="list-item" style={{ gap: "var(--spacing-sm)" }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 600, fontSize: 14 }}>{format(new Date(m.date), "MMM d, yyyy")}</p>
                                <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: 4, flexWrap: "wrap" }}>
                                    {m.weight && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>⚖️ {m.weight} {m.weightUnit}</span>}
                                    {m.bmi && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>📊 BMI {m.bmi}</span>}
                                    {m.bloodPressureSystolic && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>❤️ {m.bloodPressureSystolic}/{m.bloodPressureDiastolic} mmHg</span>}
                                    {m.steps && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>👟 {m.steps?.toLocaleString()} steps</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Log modal */}
            {showLog && (
                <div className="modal-overlay" onClick={() => setShowLog(false)}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h2 className="modal-title">Log Health Metrics</h2>

                        <div className="input-group">
                            <label className="input-label">Date</label>
                            <input className="input" type="date" value={logDate} max={today()} onChange={(e) => setLogDate(e.target.value)} id="health-date" />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Weight</label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input className="input" type="number" placeholder="e.g. 72" value={form.weight}
                                    onChange={(e) => setForm(p => ({ ...p, weight: e.target.value }))}
                                    style={{ flex: 1 }} id="health-weight" />
                                <div className="segmented" style={{ width: 90, flexShrink: 0 }}>
                                    {(["kg", "lbs"] as const).map((u) => (
                                        <button key={u} type="button" className={`seg-btn ${form.weightUnit === u ? "active" : ""}`}
                                            onClick={() => setForm(p => ({ ...p, weightUnit: u }))}>{u}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {form.weight && (
                            <div style={{ borderRadius: "var(--radius-md)", padding: "10px 14px", marginTop: -4, marginBottom: "var(--spacing-md)", background: autoCalculatedBMI ? "var(--color-primary-light)" : "#FEF3C7", border: `1px solid ${autoCalculatedBMI ? "var(--color-primary)" : "#F59E0B"}22` }}>
                                {autoCalculatedBMI ? (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Calculated BMI</span>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>{autoCalculatedBMI}</span>
                                            <span style={{ fontSize: 12, color: bmiCategory(autoCalculatedBMI).color, fontWeight: 600, marginLeft: 6 }}>
                                                {bmiCategory(autoCalculatedBMI).label}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ fontSize: 12, color: "#92400E" }}>⚠️ Add your height in your profile to auto-calculate BMI.</p>
                                )}
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">Blood Pressure (Systolic / Diastolic)</label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input className="input" type="number" placeholder="120" value={form.systolic}
                                    onChange={(e) => setForm(p => ({ ...p, systolic: e.target.value }))} id="health-systolic" />
                                <input className="input" type="number" placeholder="80" value={form.diastolic}
                                    onChange={(e) => setForm(p => ({ ...p, diastolic: e.target.value }))} id="health-diastolic" />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Steps Today</label>
                            <input className="input" type="number" placeholder="e.g. 8500" value={form.steps}
                                onChange={(e) => setForm(p => ({ ...p, steps: e.target.value }))} id="health-steps" />
                        </div>

                        <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={saving} id="save-health-btn">
                            {saving ? "Saving…" : "Save Entry"}
                        </button>
                    </div>
                </div>
            )}

            <EmployeeBottomNav />
        </div>
    );
}
