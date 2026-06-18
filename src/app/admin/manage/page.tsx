"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, Edit2, ToggleLeft, ToggleRight, KeyRound, CheckCircle, XCircle, Clock } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";

const CATEGORIES = ["physical", "social", "financial", "emotional"] as const;
const CAT_ICONS: Record<string, string> = { physical: "🏃", social: "👥", financial: "💰", emotional: "🧘" };

function timeAgo(ms: number): string {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminManagePage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [section, setSection] = useState<"activities" | "resets">("activities");
    const [catFilter, setCatFilter] = useState("all");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: "", description: "", category: "physical" as typeof CATEGORIES[number], points: "", durationDays: "", icon: "" });
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState("");

    // Reset request state
    const [resetTarget, setResetTarget] = useState<any>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [tempPassword, setTempPassword] = useState("");
    const [resetSaving, setResetSaving] = useState(false);
    const [resetError, setResetError] = useState("");

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

    const activities = useQuery(api.activities.getAllActivitiesAdmin) || [];
    const createActivity = useMutation(api.activities.createActivity);
    const updateActivity = useMutation(api.activities.updateActivity);
    const toggleActivity = useMutation(api.activities.toggleActivity);

    const pendingResets = useQuery(api.users.getPendingPasswordResetRequests) || [];
    const adminResetPassword = useAction(api.auth.adminResetUserPassword);
    const fulfillRequest = useMutation(api.users.fulfillPasswordResetRequest);
    const dismissRequest = useMutation(api.users.dismissPasswordResetRequest);

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

    const openResetModal = (req: any) => {
        setResetTarget(req);
        setTempPassword("");
        setResetError("");
        setShowResetModal(true);
    };

    const handleResetPassword = async () => {
        if (!tempPassword || tempPassword.length < 6) { setResetError("Password must be at least 6 characters."); return; }
        if (!auth || !resetTarget) return;
        setResetSaving(true);
        setResetError("");
        try {
            await adminResetPassword({
                userId: resetTarget.userId,
                newPassword: tempPassword,
                mustChangePassword: true,
                adminToken: auth.token,
            });
            await fulfillRequest({
                requestId: resetTarget._id,
                adminUserId: auth.id,
                note: `Temp password set by admin. User must change on next login.`,
            });
            setShowResetModal(false);
            setResetTarget(null);
        } catch (e: any) {
            setResetError(e.message || "Failed to reset password.");
        } finally {
            setResetSaving(false);
        }
    };

    const handleDismiss = async (req: any) => {
        if (!auth) return;
        await dismissRequest({ requestId: req._id, adminUserId: auth.id });
    };

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Manage</h1>
                {section === "activities" && (
                    <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-activity-btn"><Plus size={16} /> Add Activity</button>
                )}
            </header>

            <main className="admin-content">
                {/* Section switch */}
                <div className="segmented" style={{ marginBottom: "var(--spacing-md)" }}>
                    <button
                        className={`seg-btn ${section === "activities" ? "active" : ""}`}
                        onClick={() => setSection("activities")}
                        style={{ color: section === "activities" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}
                    >
                        Activities
                    </button>
                    <button
                        className={`seg-btn ${section === "resets" ? "active" : ""}`}
                        onClick={() => setSection("resets")}
                        style={{ color: section === "resets" ? "var(--color-primary)" : "var(--color-admin-text-muted)", position: "relative" }}
                        id="reset-requests-tab"
                    >
                        Password Resets
                        {pendingResets.length > 0 && (
                            <span style={{ position: "absolute", top: 4, right: 4, background: "var(--color-primary)", color: "#fff", borderRadius: "999px", fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                                {pendingResets.length}
                            </span>
                        )}
                    </button>
                    <button
                        className="seg-btn"
                        onClick={() => router.push("/admin/config")}
                        style={{ color: "var(--color-admin-text-muted)" }}
                    >
                        Configuration
                    </button>
                </div>

                {/* ── ACTIVITIES SECTION ── */}
                {section === "activities" && (
                    <>
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
                    </>
                )}

                {/* ── PASSWORD RESET REQUESTS SECTION ── */}
                {section === "resets" && (
                    <>
                        {pendingResets.length === 0 ? (
                            <div className="empty-state">
                                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-success)22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                                    <CheckCircle size={28} color="var(--color-success)" />
                                </div>
                                <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>All Clear</p>
                                <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>No pending password reset requests.</p>
                            </div>
                        ) : (
                            <>
                                <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-md)" }}>
                                    {pendingResets.length} pending request{pendingResets.length !== 1 ? "s" : ""}. Set a temporary password and contact the user directly.
                                </p>
                                {pendingResets.map((req: any) => (
                                    <div key={req._id} className="list-item admin" id={`reset-req-${req._id}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: "var(--spacing-sm)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", width: "100%" }}>
                                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-warning)22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <KeyRound size={18} color="var(--color-warning)" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 700, color: "var(--color-admin-text)", fontSize: 14 }}>
                                                    {req.firstName && req.surname ? `${req.firstName} ${req.surname}` : req.email}
                                                </p>
                                                <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 1 }}>{req.email}</p>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                                <Clock size={12} color="var(--color-admin-text-muted)" />
                                                <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>{timeAgo(req.requestedAt)}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, width: "100%" }}>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                                onClick={() => openResetModal(req)}
                                                id={`reset-btn-${req._id}`}
                                            >
                                                <KeyRound size={14} /> Reset Password
                                            </button>
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: "var(--color-admin-surface)", color: "var(--color-admin-text-muted)", border: "1px solid var(--color-admin-border)", display: "flex", alignItems: "center", gap: 6 }}
                                                onClick={() => handleDismiss(req)}
                                                id={`dismiss-btn-${req._id}`}
                                            >
                                                <XCircle size={14} /> Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* ── ACTIVITY MODAL ── */}
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

            {/* ── RESET PASSWORD MODAL ── */}
            {showResetModal && resetTarget && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin">Set Temporary Password</h2>
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-md)", lineHeight: 1.6 }}>
                            Setting a temporary password for <strong style={{ color: "var(--color-admin-text)" }}>{resetTarget.firstName && resetTarget.surname ? `${resetTarget.firstName} ${resetTarget.surname}` : resetTarget.email}</strong>.
                            The user will be required to change it on next login.
                        </p>
                        <div style={{ background: "var(--color-warning)11", border: "1px solid var(--color-warning)44", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: "var(--spacing-md)" }}>
                            <p style={{ fontSize: 12, color: "var(--color-warning)", fontWeight: 600 }}>⚠️ Remember to contact the user</p>
                            <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 4 }}>After setting the password, share it with the user via phone, Teams, or email.</p>
                        </div>
                        <div className="input-group">
                            <label className="input-label admin">Temporary Password *</label>
                            <input
                                className="input admin"
                                type="text"
                                placeholder="e.g. Welcome123"
                                value={tempPassword}
                                onChange={(e) => setTempPassword(e.target.value)}
                                id="temp-password-input"
                                autoComplete="off"
                            />
                        </div>
                        {resetError && (
                            <div style={{ background: "#DC262622", border: "1px solid #DC2626", color: "#DC2626", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, marginTop: "var(--spacing-sm)" }}>
                                ⚠️ {resetError}
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: "var(--spacing-md)" }}>
                            <button
                                className="btn btn-primary btn-full btn-lg"
                                onClick={handleResetPassword}
                                disabled={resetSaving}
                                id="confirm-reset-btn"
                                style={{ flex: 1 }}
                            >
                                {resetSaving ? "Setting Password…" : "Confirm & Set Password"}
                            </button>
                            <button
                                className="btn btn-sm"
                                style={{ background: "var(--color-admin-surface)", color: "var(--color-admin-text-muted)", border: "1px solid var(--color-admin-border)" }}
                                onClick={() => setShowResetModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
