"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, Edit2, ToggleLeft, ToggleRight } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";

const CATEGORIES = ["physical", "social", "financial", "emotional"] as const;
const CAT_ICONS: Record<string, string> = { physical: "🏃", social: "👥", financial: "💰", emotional: "🧘" };

export default function AdminManagePage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [section, setSection] = useState<"activities" | "config">("activities");
    const [catFilter, setCatFilter] = useState("all");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: "", description: "", category: "physical" as typeof CATEGORIES[number], points: "", durationDays: "", icon: "" });
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState("");

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        const a = JSON.parse(stored);
        if (a.role === "employee") { router.replace("/dashboard"); return; }
        setAuth(a);
    }, [router]);

    const activities = useQuery(api.activities.getAllActivitiesAdmin) || [];
    const createActivity = useMutation(api.activities.createActivity);
    const updateActivity = useMutation(api.activities.updateActivity);
    const toggleActivity = useMutation(api.activities.toggleActivity);

    const filtered = catFilter === "all" ? activities : activities.filter((a: any) => a.category === catFilter);

    const openCreate = () => { setEditing(null); setForm({ name: "", description: "", category: "physical", points: "", durationDays: "", icon: "" }); setShowModal(true); };
    const openEdit = (a: any) => { setEditing(a); setForm({ name: a.name, description: a.description, category: a.category, points: String(a.points), durationDays: String(a.durationDays || ""), icon: a.icon || "" }); setShowModal(true); };

    const handleSave = async () => {
        setValidationError("");
        if (!form.name.trim()) { setValidationError("Activity name is required."); return; }
        if (!form.description.trim()) { setValidationError("Description is required."); return; }
        if (!form.points) { setValidationError("Points value is required."); return; }
        if (!auth) return;
        setSaving(true);
        try {
            if (editing) {
                await updateActivity({ id: editing._id, name: form.name, description: form.description, category: form.category, points: parseInt(form.points), durationDays: form.durationDays ? parseInt(form.durationDays) : undefined, icon: form.icon || undefined });
            } else {
                await createActivity({ name: form.name, description: form.description, category: form.category, points: parseInt(form.points), durationDays: form.durationDays ? parseInt(form.durationDays) : undefined, icon: form.icon || undefined, createdBy: auth.id });
            }
            setShowModal(false);
        } catch (e: any) {
            setValidationError(e.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Manage</h1>
                <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-activity-btn"><Plus size={16} /> Add Activity</button>
            </header>

            <main className="admin-content">
                {/* Section switch */}
                <div className="segmented" style={{ marginBottom: "var(--spacing-md)" }}>
                    <button className={`seg-btn ${section === "activities" ? "active" : ""}`} onClick={() => setSection("activities")} style={{ color: section === "activities" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Activities</button>
                    <button className={`seg-btn ${section === "config" ? "active" : ""}`} onClick={() => { router.push("/admin/config"); }} style={{ color: "var(--color-admin-text-muted)" }}>Configuration</button>
                </div>

                {/* Category filter */}
                <div className="chip-row" style={{ marginBottom: "var(--spacing-md)" }}>
                    {["all", ...CATEGORIES].map((c) => (
                        <button key={c} className={`category-chip ${catFilter === c ? "active" : ""}`} style={{ color: catFilter === c ? "var(--color-primary)" : "var(--color-admin-text-muted)", borderColor: catFilter === c ? "var(--color-primary)" : "var(--color-admin-border)", background: catFilter === c ? "var(--color-primary-light)" : "transparent" }} onClick={() => setCatFilter(c)} id={`cat-filter-${c}`}>
                            {c === "all" ? "All" : `${CAT_ICONS[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}`}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="empty-state">
                        <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No activities yet</p>
                        <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>Click "Add Activity" to create the first wellness activity.</p>
                    </div>
                )}

                {filtered.map((a: any) => (
                    <div key={a._id} className="list-item admin" id={`activity-${a._id}`}>
                        <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--color-admin-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                            {CAT_ICONS[a.category]}
                        </div>
                        <div className="list-item-content">
                            <p className="list-item-title admin">{a.name}</p>
                            <p className="list-item-subtitle admin">{a.description.slice(0, 50)}…</p>
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>+{a.points} pts</span>
                                {a.durationDays && <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>{a.durationDays}d</span>}
                                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: `var(--color-${a.category})22`, color: `var(--color-${a.category})` }}>{a.category}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            <button onClick={() => openEdit(a)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", padding: 6 }} id={`edit-${a._id}`}><Edit2 size={16} /></button>
                            <button onClick={() => toggleActivity({ id: a._id, isActive: !a.isActive })} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }} id={`toggle-${a._id}`}>
                                {a.isActive ? <ToggleRight size={22} color="var(--color-success)" /> : <ToggleLeft size={22} color="var(--color-admin-text-muted)" />}
                            </button>
                        </div>
                    </div>
                ))}
            </main>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin">{editing ? "Edit Activity" : "New Activity"}</h2>
                        <div className="input-group">
                            <label className="input-label admin">Activity Name *</label>
                            <input className="input admin" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Morning Jog" id="act-name" />
                        </div>
                        <div className="input-group">
                            <label className="input-label admin">Description *</label>
                            <textarea className="input admin" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this activity involve?" id="act-desc" />
                        </div>
                        <div className="input-group">
                            <label className="input-label admin">Category *</label>
                            <div className="segmented">
                                {CATEGORIES.map((c) => <button key={c} type="button" className={`seg-btn ${form.category === c ? "active" : ""}`} onClick={() => setForm(p => ({ ...p, category: c }))} style={{ fontSize: 11 }}>{CAT_ICONS[c]} {c}</button>)}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="input-label admin">Points *</label>
                                <input className="input admin" type="number" value={form.points} onChange={(e) => setForm(p => ({ ...p, points: e.target.value }))} placeholder="100" id="act-points" />
                            </div>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="input-label admin">Duration (days)</label>
                                <input className="input admin" type="number" value={form.durationDays} onChange={(e) => setForm(p => ({ ...p, durationDays: e.target.value }))} placeholder="30" id="act-duration" />
                            </div>
                        </div>
                        <div className="input-group" style={{ marginTop: "var(--spacing-md)" }}>
                            <label className="input-label admin">Icon (emoji)</label>
                            <input className="input admin" value={form.icon} onChange={(e) => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="🏃" id="act-icon" />
                        </div>
                        {validationError && (
                            <div style={{ background: "#DC262622", border: "1px solid #DC2626", color: "#DC2626", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, marginTop: "var(--spacing-md)" }}>
                                ⚠️ {validationError}
                            </div>
                        )}
                        <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={saving} id="save-activity-btn" style={{ marginTop: "var(--spacing-md)" }}>{saving ? "Saving…" : editing ? "Update Activity" : "Create Activity"}</button>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
