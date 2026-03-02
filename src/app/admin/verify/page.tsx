"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

export default function AdminVerifyPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [selected, setSelected] = useState<any>(null);
    const [note, setNote] = useState("");
    const [processing, setProcessing] = useState(false);
    const verifyMutation = useMutation(api.activities.verifySubmission);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        const a = JSON.parse(stored);
        if (a.role === "employee") { router.replace("/dashboard"); return; }
        setAuth(a);
    }, [router]);

    const pending = useQuery(api.activities.getPendingVerifications) || [];

    const handleVerify = async (approve: boolean) => {
        if (!selected || !auth) return;
        setProcessing(true);
        try {
            await verifyMutation({
                enrollmentId: selected._id,
                approve,
                adminNote: note || undefined,
                verifiedBy: auth.id,
            });
            setSelected(null); setNote("");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Verify Submissions</h1>
                <span style={{ background: "var(--color-primary)", color: "white", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{pending.length}</span>
            </header>

            <main className="admin-content">
                {pending.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={56} color="var(--color-success)" />
                        <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>All caught up!</p>
                        <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>There are no submissions awaiting verification.</p>
                    </div>
                ) : (
                    pending.map((e: any) => (
                        <div key={e._id} className="list-item admin" style={{ cursor: "pointer" }} onClick={() => { setSelected(e); setNote(""); }} id={`verify-item-${e._id}`}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary)22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: 16 }}>{(e.user?.firstName || "?")[0]}</span>
                            </div>
                            <div className="list-item-content">
                                <p className="list-item-title admin">{e.activity?.name}</p>
                                <p className="list-item-subtitle admin">{e.user?.firstName} {e.user?.surname}</p>
                                <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                                    {format(new Date(e.completedAt || e.enrolledAt), "MMM d, yyyy")} · {e.activity?.points} pts
                                </p>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: "var(--color-warning)22", color: "var(--color-warning)", fontWeight: 700 }}>PENDING</span>
                                <ChevronRight size={16} color="var(--color-admin-text-muted)" />
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Verify detail modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin">Review Submission</h2>

                        <div className="card admin" style={{ marginBottom: "var(--spacing-md)" }}>
                            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--color-admin-text)", marginBottom: 4 }}>{selected.activity?.name}</p>
                            <p style={{ fontSize: 14, color: "var(--color-admin-text-muted)", marginBottom: 8 }}>{selected.activity?.description}</p>
                            <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
                                <div>
                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Employee</p>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-admin-text)" }}>{selected.user?.firstName} {selected.user?.surname}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Points</p>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>+{selected.activity?.points}</p>
                                </div>
                            </div>
                        </div>

                        {selected.proofUrl && (
                            <img src={selected.proofUrl} alt="Proof" style={{ width: "100%", borderRadius: "var(--radius-md)", marginBottom: "var(--spacing-md)", maxHeight: 200, objectFit: "cover" }} />
                        )}
                        {selected.proofNote && (
                            <div className="card admin" style={{ marginBottom: "var(--spacing-md)" }}>
                                <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", fontWeight: 600, marginBottom: 4 }}>Note from employee:</p>
                                <p style={{ fontSize: 14, color: "var(--color-admin-text)" }}>{selected.proofNote}</p>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label admin">Admin Note (optional)</label>
                            <textarea className="input admin" placeholder="Add a note for the employee..." value={note} onChange={(e) => setNote(e.target.value)} id="admin-note" />
                        </div>

                        <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleVerify(false)} disabled={processing} id="reject-btn">
                                <XCircle size={16} /> Reject
                            </button>
                            <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleVerify(true)} disabled={processing} id="approve-btn">
                                <CheckCircle size={16} /> Approve +{selected.activity?.points}pts
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
