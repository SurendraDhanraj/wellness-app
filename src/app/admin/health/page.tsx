"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Activity, Search, X, ChevronRight, ChevronLeft, Trash2, Pencil,
    Scale, Heart, Footprints, Check,
} from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

type Entry = {
    _id: string;
    date: string;
    weight?: number;
    weightUnit?: "kg" | "lbs";
    bmi?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    steps?: number;
    createdAt: number;
};

export default function AdminHealthPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editEntry, setEditEntry] = useState<Entry | null>(null);
    const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
    const [editForm, setEditForm] = useState<Partial<Entry>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        try {
            const a = JSON.parse(stored);
            if (!a || a.role === "employee") { router.replace("/dashboard"); return; }
            setAuth(a);
        } catch {
            localStorage.removeItem("heritage_auth");
            router.replace("/login");
        }
    }, [router]);

    const allUsers = useQuery(api.users.getAllUsers) || [];
    const entries = useQuery(
        api.healthMetrics.getHealthMetricsForUser,
        selectedUser ? { userId: selectedUser._id } : "skip"
    ) || [];

    const updateMetric = useMutation(api.healthMetrics.updateHealthMetric);
    const deleteMetric = useMutation(api.healthMetrics.deleteHealthMetric);

    const usersWithData = allUsers.filter((u: any) =>
        u.isActive && (u.role === "employee" || u.role === "admin")
    );

    const filteredUsers = usersWithData.filter((u: any) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return `${u.firstName || ""} ${u.surname || ""} ${u.email || ""}`.toLowerCase().includes(q);
    });

    const handleEditSave = async () => {
        if (!editEntry) return;
        setSaving(true);
        try {
            await updateMetric({
                metricId: editEntry._id as any,
                weight: editForm.weight !== undefined ? Number(editForm.weight) : undefined,
                weightUnit: editForm.weightUnit,
                bmi: editForm.bmi !== undefined ? Number(editForm.bmi) : undefined,
                bloodPressureSystolic: editForm.bloodPressureSystolic !== undefined ? Number(editForm.bloodPressureSystolic) : undefined,
                bloodPressureDiastolic: editForm.bloodPressureDiastolic !== undefined ? Number(editForm.bloodPressureDiastolic) : undefined,
                steps: editForm.steps !== undefined ? Number(editForm.steps) : undefined,
            });
            setEditEntry(null);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteEntry) return;
        await deleteMetric({ metricId: deleteEntry._id as any });
        setDeleteEntry(null);
    };

    const openEdit = (entry: Entry) => {
        setEditEntry(entry);
        setEditForm({
            weight: entry.weight,
            weightUnit: entry.weightUnit ?? "kg",
            bmi: entry.bmi,
            bloodPressureSystolic: entry.bloodPressureSystolic,
            bloodPressureDiastolic: entry.bloodPressureDiastolic,
            steps: entry.steps,
        });
    };

    if (!auth) return null;

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                {selectedUser ? (
                    <button
                        onClick={() => setSelectedUser(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text)", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}
                    >
                        <ChevronLeft size={20} /> Users
                    </button>
                ) : (
                    <div style={{ width: 60 }} />
                )}
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>
                    {selectedUser ? `${selectedUser.firstName} ${selectedUser.surname}` : "Health Tracker"}
                </h1>
                <div style={{ width: 60 }} />
            </header>

            <main className="admin-content">
                {/* USER LIST VIEW */}
                {!selectedUser && (
                    <>
                        <div style={{ marginBottom: "var(--spacing-md)" }}>
                            <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-sm)" }}>
                                Select a user to view or manage their health tracker entries.
                            </p>
                            {/* Search */}
                            <div style={{ position: "relative" }}>
                                <input
                                    type="text"
                                    className="input admin"
                                    style={{ paddingLeft: 40, margin: 0 }}
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    id="health-user-search"
                                />
                                <Search size={16} color="var(--color-admin-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", display: "flex" }}>
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {filteredUsers.length === 0 ? (
                            <div className="empty-state">
                                <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No users found</p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                                {filteredUsers.map((u: any) => (
                                    <div
                                        key={u._id}
                                        className="list-item admin"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setSelectedUser(u)}
                                        id={`health-user-${u._id}`}
                                    >
                                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-primary)22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "var(--color-primary)", flexShrink: 0 }}>
                                            {(u.firstName || "?")[0].toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-admin-text)" }}>{u.firstName} {u.surname}</p>
                                            <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                                        </div>
                                        <ChevronRight size={18} color="var(--color-admin-text-muted)" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ENTRY LIST VIEW */}
                {selectedUser && (
                    <>
                        <div className="card admin" style={{ marginBottom: "var(--spacing-md)", display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary)22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "var(--color-primary)", flexShrink: 0 }}>
                                {(selectedUser.firstName || "?")[0].toUpperCase()}
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--color-admin-text)" }}>{selectedUser.firstName} {selectedUser.surname}</p>
                                <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>{selectedUser.email} · {entries.length} entries</p>
                            </div>
                        </div>

                        {entries.length === 0 ? (
                            <div className="empty-state">
                                <Activity size={40} className="empty-state-icon" />
                                <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No health entries yet</p>
                                <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>This user hasn't logged any health data.</p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                                {entries.map((entry: Entry) => (
                                    <div key={entry._id} className="card admin" id={`entry-${entry._id}`}>
                                        {/* Date header */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-admin-text)" }}>
                                                {format(new Date(entry.date), "EEE, MMM d yyyy")}
                                            </p>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    onClick={() => openEdit(entry)}
                                                    style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--color-primary)22", color: "var(--color-primary)", border: "none", borderRadius: "var(--radius-md)", padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                                    id={`edit-${entry._id}`}
                                                >
                                                    <Pencil size={13} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteEntry(entry)}
                                                    style={{ display: "flex", alignItems: "center", gap: 4, background: "#DC262622", color: "#DC2626", border: "none", borderRadius: "var(--radius-md)", padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                                    id={`delete-${entry._id}`}
                                                >
                                                    <Trash2 size={13} /> Delete
                                                </button>
                                            </div>
                                        </div>

                                        {/* Metrics grid */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            {entry.weight != null && (
                                                <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                                                    <Scale size={16} color="var(--color-primary)" />
                                                    <div>
                                                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Weight</p>
                                                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.weight} {entry.weightUnit ?? "kg"}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {entry.bmi != null && (
                                                <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                                                    <Activity size={16} color="var(--color-secondary)" />
                                                    <div>
                                                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>BMI</p>
                                                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.bmi}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {entry.bloodPressureSystolic != null && (
                                                <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                                                    <Heart size={16} color="#EF4444" />
                                                    <div>
                                                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Blood Pressure</p>
                                                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.bloodPressureSystolic}/{entry.bloodPressureDiastolic}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {entry.steps != null && (
                                                <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                                                    <Footprints size={16} color="#10B981" />
                                                    <div>
                                                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Steps</p>
                                                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.steps?.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* EDIT MODAL */}
            {editEntry && (
                <div className="modal-overlay" onClick={() => !saving && setEditEntry(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin" style={{ marginBottom: 4 }}>Edit Entry</h2>
                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)" }}>
                            {format(new Date(editEntry.date), "EEEE, MMMM d yyyy")}
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "var(--spacing-md)" }}>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>Weight</label>
                                <input className="input admin" type="number" step="0.1" placeholder="e.g. 75" value={editForm.weight ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value ? parseFloat(e.target.value) : undefined }))} />
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>Unit</label>
                                <div className="segmented" style={{ height: 42 }}>
                                    {(["kg", "lbs"] as const).map((u) => (
                                        <button key={u} type="button" className={`seg-btn ${editForm.weightUnit === u ? "active" : ""}`} onClick={() => setEditForm((f) => ({ ...f, weightUnit: u }))}>{u}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>BMI</label>
                                <input className="input admin" type="number" step="0.1" placeholder="e.g. 22.5" value={editForm.bmi ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bmi: e.target.value ? parseFloat(e.target.value) : undefined }))} />
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>Steps</label>
                                <input className="input admin" type="number" placeholder="e.g. 8000" value={editForm.steps ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, steps: e.target.value ? parseInt(e.target.value) : undefined }))} />
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>BP Systolic</label>
                                <input className="input admin" type="number" placeholder="e.g. 120" value={editForm.bloodPressureSystolic ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bloodPressureSystolic: e.target.value ? parseInt(e.target.value) : undefined }))} />
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>BP Diastolic</label>
                                <input className="input admin" type="number" placeholder="e.g. 80" value={editForm.bloodPressureDiastolic ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bloodPressureDiastolic: e.target.value ? parseInt(e.target.value) : undefined }))} />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button onClick={() => setEditEntry(null)} disabled={saving} style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }} id="cancel-edit-btn">Cancel</button>
                            <button onClick={handleEditSave} disabled={saving} style={{ flex: 1, background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} id="save-edit-btn">
                                <Check size={16} /> {saving ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM MODAL */}
            {deleteEntry && (
                <div className="modal-overlay" onClick={() => setDeleteEntry(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DC262622", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                            <Trash2 size={24} color="#DC2626" />
                        </div>
                        <h2 className="modal-title admin">Delete Entry?</h2>
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>
                            This will permanently delete the health entry for{" "}
                            <strong style={{ color: "var(--color-admin-text)" }}>{format(new Date(deleteEntry.date), "MMMM d, yyyy")}</strong>.
                            This cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button onClick={() => setDeleteEntry(null)} style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }} id="cancel-delete-btn">Cancel</button>
                            <button onClick={handleDelete} style={{ flex: 1, background: "#DC2626", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }} id="confirm-delete-btn">Delete Entry</button>
                        </div>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
