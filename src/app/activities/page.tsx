"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Activity, Dumbbell, Users, DollarSign, Heart, Plus, QrCode } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";

const CATEGORIES = [
    { id: "all", label: "All" },
    { id: "physical", label: "Physical", icon: Dumbbell, color: "physical" },
    { id: "social", label: "Social", icon: Users, color: "social" },
    { id: "financial", label: "Financial", icon: DollarSign, color: "financial" },
    { id: "emotional", label: "Emotional", icon: Heart, color: "emotional" },
];

export default function ActivitiesPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [cat, setCat] = useState("all");
    const [showEnrol, setShowEnrol] = useState<any>(null);
    const [showQRActivity, setShowQRActivity] = useState<any>(null);
    const enrol = useMutation(api.activities.enrollInActivity);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const activities = useQuery(api.activities.getActivities, { category: cat === "all" ? undefined : cat }) || [];
    const myEnrollments = useQuery(api.activities.getEnrollments, auth ? { userId: auth.id } : "skip") || [];
    const enrolledIds = new Set(myEnrollments.map((e: any) => e.activityId));

    const catIcon = (cat: string) => {
        const c = CATEGORIES.find((x) => x.id === cat);
        if (c?.icon) return <c.icon size={20} />;
        return <Activity size={20} />;
    };

    const handleEnrol = async (activityId: string) => {
        if (!auth) return;
        await enrol({ userId: auth.id, activityId: activityId as any });
        setShowEnrol(null);
    };

    return (
        <div className="app-container">
            <header className="top-bar">
                <h1 className="top-bar-title">Activities</h1>
            </header>

            <main className="page-content">
                {/* Category filter */}
                <div className="chip-row" style={{ marginBottom: "var(--spacing-md)" }}>
                    {CATEGORIES.map((c) => (
                        <button key={c.id} className={`category-chip ${cat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)} id={`cat-${c.id}`}>
                            {c.label}
                        </button>
                    ))}
                </div>

                {activities.length === 0 && (
                    <div className="empty-state">
                        <Activity size={48} className="empty-state-icon" />
                        <p className="empty-state-title">No activities found</p>
                        <p className="empty-state-body">Check back soon for new wellness activities!</p>
                    </div>
                )}

                {activities.map((a: any) => {
                    const enrolled = enrolledIds.has(a._id);
                    const enrollment = myEnrollments.find((e: any) => e.activityId === a._id);
                    return (
                        <div key={a._id} className="list-item" style={{ alignItems: "flex-start" }}>
                            <div className={`icon-wrap ${a.category}`}>{catIcon(a.category)}</div>
                            <div className="list-item-content">
                                <p className="list-item-title">{a.name}</p>
                                <p className="list-item-subtitle">{a.description}</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>+{a.points} pts</span>
                                    {a.durationDays && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>· {a.durationDays} days</span>}
                                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: `var(--color-${a.category === "physical" ? "physical" : a.category === "social" ? "social" : a.category === "financial" ? "financial" : "emotional"})22`, color: `var(--color-${a.category})`, fontWeight: 600, textTransform: "uppercase" }}>{a.category}</span>
                                </div>
                                {enrolled && enrollment && (
                                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                        {enrollment.status === "in_progress" && (
                                            <>
                                                <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/activities/${a._id}/submit?enrollmentId=${enrollment._id}`)} id={`submit-${a._id}`}>Upload Proof</button>
                                                <button 
                                                    className="btn btn-secondary btn-sm" 
                                                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }} 
                                                    onClick={() => setShowQRActivity({ enrollmentId: enrollment._id, activityName: a.name, points: a.points })}
                                                    id={`qr-${a._id}`}
                                                >
                                                    <QrCode size={12} /> Show QR
                                                </button>
                                            </>
                                        )}
                                        {enrollment.status === "pending_verification" && <span className="badge badge-warning">Pending Review</span>}
                                        {enrollment.status === "verified" && <span className="badge badge-success">✓ Verified</span>}
                                        {enrollment.status === "rejected" && <span className="badge badge-error">Rejected — Resubmit</span>}
                                    </div>
                                )}
                            </div>
                            {!enrolled ? (
                                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => setShowEnrol(a)} id={`enrol-${a._id}`}>
                                    <Plus size={14} /> Enrol
                                </button>
                            ) : (
                                <span className="badge badge-success" style={{ flexShrink: 0 }}>Enrolled</span>
                            )}
                        </div>
                    );
                })}
            </main>

            {/* Enrol confirmation modal */}
            {showEnrol && (
                <div className="modal-overlay" onClick={() => setShowEnrol(null)}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h2 className="modal-title">Enrol in Activity</h2>
                        <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
                            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{showEnrol.name}</p>
                            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>{showEnrol.description}</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>+{showEnrol.points} points on completion</p>
                        </div>
                        <button className="btn btn-primary btn-full btn-lg" onClick={() => handleEnrol(showEnrol._id)} id="confirm-enrol">Confirm Enrolment</button>
                        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setShowEnrol(null)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Activity QR Modal */}
            {showQRActivity && (
                <div className="modal-overlay" onClick={() => setShowQRActivity(null)}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" />
                        <h2 className="modal-title">Activity QR Pass</h2>
                        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-md)" }}>
                            Present this code at the event check-in to instantly verify completion and claim points.
                        </p>
                        
                        <div style={{ 
                            background: "white", 
                            padding: "var(--spacing-md)", 
                            borderRadius: "var(--radius-lg)", 
                            display: "inline-block", 
                            boxShadow: "var(--shadow-md)",
                            marginBottom: "var(--spacing-md)",
                            border: "1px solid var(--color-border)"
                        }}>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`HERITAGE-WELLNESS-ENROLLMENT:${showQRActivity.enrollmentId}`)}`}
                                alt="Activity Pass QR Code"
                                style={{ width: 200, height: 200, display: "block" }}
                            />
                        </div>
                        
                        <div style={{ background: "var(--color-employee-bg)", padding: "10px 14px", borderRadius: "var(--radius-md)", display: "inline-block", fontFamily: "monospace", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600, letterSpacing: "1px" }}>
                            PASS: {showQRActivity.enrollmentId.substring(0, 8).toUpperCase()}
                        </div>
                        
                        <div className="card" style={{ marginTop: "var(--spacing-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                            <p style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: 15 }}>{showQRActivity.activityName}</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)", marginTop: 4 }}>+{showQRActivity.points} Points</p>
                        </div>
                        
                        <button className="btn btn-secondary btn-full" style={{ marginTop: "var(--spacing-lg)" }} onClick={() => setShowQRActivity(null)}>Close Pass</button>
                    </div>
                </div>
            )}

            <EmployeeBottomNav />
        </div>
    );
}
