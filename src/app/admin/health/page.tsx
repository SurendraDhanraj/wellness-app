"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Activity, Search, X, ChevronRight, ChevronLeft, Trash2, Pencil,
    Scale, Heart, Footprints, Check, ClipboardList, AlertTriangle,
    CheckCircle, Clock, XCircle, AlertCircle, Filter, ChevronDown,
    CheckSquare, Square,
} from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

/* ─── Types ─────────────────────────────────────────────────────── */
type Entry = {
    _id: string; date: string; weight?: number; weightUnit?: "kg" | "lbs";
    bmi?: number; bloodPressureSystolic?: number; bloodPressureDiastolic?: number;
    steps?: number; createdAt: number;
};

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses", color: "var(--color-admin-text-muted)" },
    { value: "in_progress", label: "In Progress", color: "#3B82F6" },
    { value: "pending_verification", label: "Pending", color: "#F59E0B" },
    { value: "verified", label: "Verified", color: "#10B981" },
    { value: "rejected", label: "Rejected", color: "#EF4444" },
];
const CAT_COLORS: Record<string, string> = { physical: "#10B981", social: "#8B5CF6", financial: "#F59E0B", emotional: "#EC4899" };

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { icon: any; label: string; color: string; bg: string }> = {
        in_progress: { icon: Clock, label: "In Progress", color: "#3B82F6", bg: "#3B82F611" },
        pending_verification: { icon: AlertCircle, label: "Pending", color: "#F59E0B", bg: "#F59E0B11" },
        verified: { icon: CheckCircle, label: "Verified", color: "#10B981", bg: "#10B98111" },
        rejected: { icon: XCircle, label: "Rejected", color: "#EF4444", bg: "#EF444411" },
    };
    const s = map[status] ?? { icon: Clock, label: status, color: "gray", bg: "#80808011" };
    const Icon = s.icon;
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.color, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            <Icon size={11} /> {s.label}
        </span>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function AdminHealthPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [tab, setTab] = useState<"health" | "enrollments">("health");

    /* Health state */
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editEntry, setEditEntry] = useState<Entry | null>(null);
    const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
    const [editForm, setEditForm] = useState<Partial<Entry>>({});
    const [saving, setSaving] = useState(false);

    /* Enrollment state */
    const [enrollSearch, setEnrollSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<"single" | "selected" | "all" | null>(null);
    const [singleTarget, setSingleTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        try {
            const a = JSON.parse(stored);
            if (!a || a.role === "employee") { router.replace("/dashboard"); return; }
            setAuth(a);
        } catch { localStorage.removeItem("heritage_auth"); router.replace("/login"); }
    }, [router]);

    /* Health queries */
    const allUsers = useQuery(api.users.getAllUsers) || [];
    const entries = useQuery(api.healthMetrics.getHealthMetricsForUser, selectedUser ? { userId: selectedUser._id } : "skip") || [];
    const updateMetric = useMutation(api.healthMetrics.updateHealthMetric);
    const deleteMetric = useMutation(api.healthMetrics.deleteHealthMetric);

    /* Enrollment queries */
    const enrollments = useQuery(api.activities.getAllEnrollmentsAdmin, {
        status: statusFilter !== "all" ? statusFilter : undefined,
    }) || [];
    const deleteOne = useMutation(api.activities.deleteEnrollment);
    const deleteMany = useMutation(api.activities.deleteEnrollments);

    /* Health computed */
    const usersWithData = allUsers.filter((u: any) => u.isActive && (u.role === "employee" || u.role === "admin"));
    const filteredUsers = usersWithData.filter((u: any) => {
        if (!searchQuery.trim()) return true;
        return `${u.firstName || ""} ${u.surname || ""} ${u.email || ""}`.toLowerCase().includes(searchQuery.toLowerCase());
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
        } finally { setSaving(false); }
    };
    const handleDeleteMetric = async () => { if (!deleteEntry) return; await deleteMetric({ metricId: deleteEntry._id as any }); setDeleteEntry(null); };
    const openEdit = (entry: Entry) => { setEditEntry(entry); setEditForm({ weight: entry.weight, weightUnit: entry.weightUnit ?? "kg", bmi: entry.bmi, bloodPressureSystolic: entry.bloodPressureSystolic, bloodPressureDiastolic: entry.bloodPressureDiastolic, steps: entry.steps }); };

    /* Enrollment computed */
    const filteredEnrollments = enrollments.filter((e: any) => {
        if (!enrollSearch.trim()) return true;
        const q = enrollSearch.toLowerCase();
        return `${e.user?.firstName || ""} ${e.user?.surname || ""} ${e.user?.email || ""} ${e.activity?.name || ""}`.toLowerCase().includes(q);
    });
    const allFilteredIds = filteredEnrollments.map((e: any) => e._id as string);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
    const someSelected = selected.size > 0;
    const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleSelectAll = () => allSelected ? setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n; }) : setSelected(prev => new Set([...prev, ...allFilteredIds]));
    const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

    const handleConfirmDeleteEnrollment = async () => {
        setDeleting(true);
        try {
            if (confirmDelete === "single" && singleTarget) await deleteOne({ enrollmentId: singleTarget._id });
            else if (confirmDelete === "selected") { await deleteMany({ enrollmentIds: Array.from(selected) as any[] }); exitSelectMode(); }
            else if (confirmDelete === "all") { await deleteMany({ enrollmentIds: allFilteredIds as any[] }); exitSelectMode(); }
        } finally { setDeleting(false); setConfirmDelete(null); setSingleTarget(null); }
    };

    const enrollTotal = enrollments.length;
    const enrollVerified = enrollments.filter((e: any) => e.status === "verified").length;
    const enrollPending = enrollments.filter((e: any) => e.status === "pending_verification").length;
    const enrollActive = enrollments.filter((e: any) => e.status === "in_progress").length;

    if (!auth) return null;

    const isHealthUserView = tab === "health" && selectedUser;

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                {isHealthUserView ? (
                    <button onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text)", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
                        <ChevronLeft size={20} /> Users
                    </button>
                ) : tab === "enrollments" && selectMode ? (
                    <button onClick={exitSelectMode} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: 13, fontWeight: 700 }}>Cancel</button>
                ) : (
                    <div style={{ width: 60 }} />
                )}
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>
                    {isHealthUserView ? `${selectedUser.firstName} ${selectedUser.surname}` : tab === "health" ? "Health Tracker" : "Enrollments"}
                </h1>
                {tab === "enrollments" && !selectMode ? (
                    <button onClick={() => { setSelectMode(true); setSelected(new Set()); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", fontSize: 13, fontWeight: 700 }}>Select</button>
                ) : (
                    <div style={{ width: 60 }} />
                )}
            </header>

            {/* Tab bar */}
            {!isHealthUserView && (
                <div style={{ display: "flex", borderBottom: "1px solid var(--color-admin-border)", background: "var(--color-admin-card)", marginBottom: 0 }}>
                    {(["health", "enrollments"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{ flex: 1, padding: "12px 0", fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? "var(--color-primary)" : "var(--color-admin-text-muted)", background: "none", border: "none", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", cursor: "pointer", textTransform: "capitalize" }}
                            id={`tab-${t}`}
                        >
                            {t === "health" ? "Health" : "Enrolled"}
                        </button>
                    ))}
                </div>
            )}

            <main className="admin-content">
                {/* ══════ HEALTH TAB ══════ */}
                {tab === "health" && (
                    <>
                        {/* User list */}
                        {!selectedUser && (
                            <>
                                <div style={{ marginBottom: "var(--spacing-md)" }}>
                                    <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-sm)" }}>Select a user to view or manage their health tracker entries.</p>
                                    <div style={{ position: "relative" }}>
                                        <input type="text" className="input admin" style={{ paddingLeft: 40, margin: 0 }} placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} id="health-user-search" />
                                        <Search size={16} color="var(--color-admin-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                                        {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", display: "flex" }}><X size={16} /></button>}
                                    </div>
                                </div>
                                {filteredUsers.length === 0 ? (
                                    <div className="empty-state"><p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No users found</p></div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                                        {filteredUsers.map((u: any) => (
                                            <div key={u._id} className="list-item admin" style={{ cursor: "pointer" }} onClick={() => setSelectedUser(u)} id={`health-user-${u._id}`}>
                                                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-primary)22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "var(--color-primary)", flexShrink: 0 }}>{(u.firstName || "?")[0].toUpperCase()}</div>
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

                        {/* Entry list */}
                        {selectedUser && (
                            <>
                                <div className="card admin" style={{ marginBottom: "var(--spacing-md)", display: "flex", gap: 12, alignItems: "center" }}>
                                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary)22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "var(--color-primary)", flexShrink: 0 }}>{(selectedUser.firstName || "?")[0].toUpperCase()}</div>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: 15, color: "var(--color-admin-text)" }}>{selectedUser.firstName} {selectedUser.surname}</p>
                                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>{selectedUser.email} · {entries.length} entries</p>
                                    </div>
                                </div>
                                {entries.length === 0 ? (
                                    <div className="empty-state"><Activity size={40} className="empty-state-icon" /><p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No health entries yet</p><p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>This user hasn't logged any health data.</p></div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                                        {entries.map((entry: Entry) => (
                                            <div key={entry._id} className="card admin" id={`entry-${entry._id}`}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                                    <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-admin-text)" }}>{format(new Date(entry.date), "EEE, MMM d yyyy")}</p>
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <button onClick={() => openEdit(entry)} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--color-primary)22", color: "var(--color-primary)", border: "none", borderRadius: "var(--radius-md)", padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }} id={`edit-${entry._id}`}><Pencil size={13} /> Edit</button>
                                                        <button onClick={() => setDeleteEntry(entry)} style={{ display: "flex", alignItems: "center", gap: 4, background: "#DC262622", color: "#DC2626", border: "none", borderRadius: "var(--radius-md)", padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }} id={`delete-${entry._id}`}><Trash2 size={13} /> Delete</button>
                                                    </div>
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                                    {entry.weight != null && <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}><Scale size={16} color="var(--color-primary)" /><div><p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Weight</p><p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.weight} {entry.weightUnit ?? "kg"}</p></div></div>}
                                                    {entry.bmi != null && <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}><Activity size={16} color="var(--color-secondary)" /><div><p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>BMI</p><p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.bmi}</p></div></div>}
                                                    {entry.bloodPressureSystolic != null && <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}><Heart size={16} color="#EF4444" /><div><p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Blood Pressure</p><p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.bloodPressureSystolic}/{entry.bloodPressureDiastolic}</p></div></div>}
                                                    {entry.steps != null && <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}><Footprints size={16} color="#10B981" /><div><p style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Steps</p><p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)" }}>{entry.steps?.toLocaleString()}</p></div></div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ══════ ENROLLMENTS TAB ══════ */}
                {tab === "enrollments" && (
                    <>
                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
                            {[{ label: "Total", value: enrollTotal, color: "var(--color-admin-text)" }, { label: "Verified", value: enrollVerified, color: "#10B981" }, { label: "Pending", value: enrollPending, color: "#F59E0B" }, { label: "Active", value: enrollActive, color: "#3B82F6" }].map(({ label, value, color }) => (
                                <div key={label} className="card admin" style={{ textAlign: "center", padding: "var(--spacing-sm) 4px" }}>
                                    <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
                                    <p style={{ fontSize: 10, color: "var(--color-admin-text-muted)", marginTop: 2 }}>{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Bulk bar */}
                        {selectMode && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--spacing-md)", background: "var(--color-admin-card)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                                <button onClick={toggleSelectAll} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: allSelected ? "var(--color-primary)" : "var(--color-admin-text-muted)", fontWeight: 600, fontSize: 13 }}>
                                    {allSelected ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                                    {allSelected ? "Deselect all" : `Select all (${allFilteredIds.length})`}
                                </button>
                                <div style={{ flex: 1 }} />
                                {someSelected && <span style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>{selected.size} selected</span>}
                                <button onClick={() => { if (someSelected) setConfirmDelete("selected"); }} disabled={!someSelected} style={{ display: "flex", alignItems: "center", gap: 5, background: someSelected ? "#DC262622" : "var(--color-admin-surface)", color: someSelected ? "#DC2626" : "var(--color-admin-text-muted)", border: `1px solid ${someSelected ? "#DC262644" : "transparent"}`, borderRadius: "var(--radius-md)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: someSelected ? "pointer" : "default" }}><Trash2 size={13} /> Delete selected</button>
                                <button onClick={() => setConfirmDelete("all")} style={{ display: "flex", alignItems: "center", gap: 5, background: "#DC262622", color: "#DC2626", border: "1px solid #DC262644", borderRadius: "var(--radius-md)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Trash2 size={13} /> Delete all ({filteredEnrollments.length})</button>
                            </div>
                        )}

                        {/* Search + filter */}
                        <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
                            <div style={{ position: "relative", flex: 1 }}>
                                <input type="text" className="input admin" style={{ paddingLeft: 38, margin: 0 }} placeholder="Search name, email or activity..." value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)} id="enroll-search" />
                                <Search size={15} color="var(--color-admin-text-muted)" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                                {enrollSearch && <button onClick={() => setEnrollSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", display: "flex" }}><X size={14} /></button>}
                            </div>
                            <div style={{ position: "relative" }}>
                                <button onClick={() => setShowFilterMenu(!showFilterMenu)} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                                    <Filter size={14} />{STATUS_OPTIONS.find(s => s.value === statusFilter)?.label ?? "All"}<ChevronDown size={13} />
                                </button>
                                {showFilterMenu && (
                                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--color-admin-card)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", overflow: "hidden", zIndex: 50, minWidth: 160, boxShadow: "var(--shadow-lg)" }}>
                                        {STATUS_OPTIONS.map((opt) => (
                                            <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setShowFilterMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: statusFilter === opt.value ? "var(--color-admin-surface)" : "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: statusFilter === opt.value ? 700 : 400, color: opt.color, textAlign: "left" }}>{opt.label}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Enrollment cards */}
                        {filteredEnrollments.length === 0 ? (
                            <div className="empty-state"><ClipboardList size={44} className="empty-state-icon" /><p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No enrollments found</p><p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>{enrollSearch ? `No results for "${enrollSearch}"` : "No enrollments match the selected filter."}</p></div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                                {filteredEnrollments.map((e: any) => {
                                    const catColor = CAT_COLORS[e.activity?.category] ?? "#6B7280";
                                    const isSelected = selected.has(e._id);
                                    return (
                                        <div key={e._id} className="card admin" id={`enrollment-${e._id}`} style={{ borderLeft: `3px solid ${isSelected ? "var(--color-primary)" : catColor}`, background: isSelected ? "var(--color-primary)08" : undefined, cursor: selectMode ? "pointer" : "default" }} onClick={() => selectMode && toggleSelect(e._id)}>
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                                {selectMode ? (
                                                    <div style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                        {isSelected ? <CheckSquare size={22} color="var(--color-primary)" /> : <Square size={22} color="var(--color-admin-text-muted)" />}
                                                    </div>
                                                ) : (
                                                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${catColor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: catColor, flexShrink: 0 }}>{(e.user?.firstName || "?")[0].toUpperCase()}</div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                                                        <div>
                                                            <p style={{ fontWeight: 700, fontSize: 13, color: "var(--color-admin-text)" }}>{e.user?.firstName} {e.user?.surname}</p>
                                                            <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user?.email}</p>
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                                            <StatusBadge status={e.status} />
                                                            {!selectMode && <button onClick={(ev) => { ev.stopPropagation(); setSingleTarget(e); setConfirmDelete("single"); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#DC262618", color: "#DC2626", border: "none", borderRadius: "var(--radius-sm)", padding: 6, cursor: "pointer" }} id={`delete-enroll-${e._id}`}><Trash2 size={13} /></button>}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                                        <span style={{ fontSize: 15 }}>{e.activity?.icon ?? "🏃"}</span>
                                                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)" }}>{e.activity?.name ?? "Unknown Activity"}</p>
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: catColor, background: `${catColor}18`, padding: "1px 7px", borderRadius: 99, textTransform: "capitalize" }}>{e.activity?.category}</span>
                                                        <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginLeft: "auto" }}>{e.activity?.points} pts</span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--color-admin-text-muted)", flexWrap: "wrap" }}>
                                                        <span>Enrolled: {format(new Date(e.enrolledAt), "MMM d, yyyy")}</span>
                                                        {e.completedAt && <span>Submitted: {format(new Date(e.completedAt), "MMM d, yyyy")}</span>}
                                                        {e.verifiedAt && <span>Verified: {format(new Date(e.verifiedAt), "MMM d, yyyy")}</span>}
                                                    </div>
                                                    {e.proofNote && <div style={{ marginTop: 6, background: "var(--color-admin-surface)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}><p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", fontStyle: "italic" }}>"{e.proofNote}"</p></div>}
                                                    {e.proofUrl && e.proofType === "image" && <img src={e.proofUrl} alt="Proof" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} style={{ marginTop: 8, width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: "var(--radius-md)" }} />}
                                                    {e.status === "pending_verification" && !selectMode && <button onClick={(ev) => { ev.stopPropagation(); router.push("/admin/verify"); }} style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, background: "#F59E0B22", color: "#F59E0B", border: "1px solid #F59E0B44", borderRadius: "var(--radius-md)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><AlertCircle size={13} /> Review in Verify</button>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Filter overlay */}
            {showFilterMenu && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowFilterMenu(false)} />}

            {/* Health Edit Modal */}
            {editEntry && (
                <div className="modal-overlay" onClick={() => !saving && setEditEntry(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin" style={{ marginBottom: 4 }}>Edit Entry</h2>
                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)" }}>{format(new Date(editEntry.date), "EEEE, MMMM d yyyy")}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "var(--spacing-md)" }}>
                            <div className="input-group" style={{ margin: 0 }}><label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>Weight</label><input className="input admin" type="number" step="0.1" placeholder="e.g. 75" value={editForm.weight ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value ? parseFloat(e.target.value) : undefined }))} /></div>
                            <div className="input-group" style={{ margin: 0 }}><label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>Unit</label><div className="segmented" style={{ height: 42 }}>{(["kg", "lbs"] as const).map((u) => (<button key={u} type="button" className={`seg-btn ${editForm.weightUnit === u ? "active" : ""}`} onClick={() => setEditForm((f) => ({ ...f, weightUnit: u }))}>{u}</button>))}</div></div>
                            <div className="input-group" style={{ margin: 0 }}><label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>BMI</label><input className="input admin" type="number" step="0.1" placeholder="e.g. 22.5" value={editForm.bmi ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bmi: e.target.value ? parseFloat(e.target.value) : undefined }))} /></div>
                            <div className="input-group" style={{ margin: 0 }}><label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>Steps</label><input className="input admin" type="number" placeholder="e.g. 8000" value={editForm.steps ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, steps: e.target.value ? parseInt(e.target.value) : undefined }))} /></div>
                            <div className="input-group" style={{ margin: 0 }}><label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>BP Systolic</label><input className="input admin" type="number" placeholder="e.g. 120" value={editForm.bloodPressureSystolic ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bloodPressureSystolic: e.target.value ? parseInt(e.target.value) : undefined }))} /></div>
                            <div className="input-group" style={{ margin: 0 }}><label className="input-label" style={{ color: "var(--color-admin-text-muted)" }}>BP Diastolic</label><input className="input admin" type="number" placeholder="e.g. 80" value={editForm.bloodPressureDiastolic ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bloodPressureDiastolic: e.target.value ? parseInt(e.target.value) : undefined }))} /></div>
                        </div>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button onClick={() => setEditEntry(null)} disabled={saving} style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleEditSave} disabled={saving} style={{ flex: 1, background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={16} /> {saving ? "Saving…" : "Save Changes"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Health Delete Modal */}
            {deleteEntry && (
                <div className="modal-overlay" onClick={() => setDeleteEntry(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DC262622", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}><Trash2 size={24} color="#DC2626" /></div>
                        <h2 className="modal-title admin">Delete Entry?</h2>
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>This will permanently delete the health entry for <strong style={{ color: "var(--color-admin-text)" }}>{format(new Date(deleteEntry.date), "MMMM d, yyyy")}</strong>. This cannot be undone.</p>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button onClick={() => setDeleteEntry(null)} style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleDeleteMetric} style={{ flex: 1, background: "#DC2626", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}>Delete Entry</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enrollment Delete Confirm Modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DC262622", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}><AlertTriangle size={26} color="#DC2626" /></div>
                        <h2 className="modal-title admin">
                            {confirmDelete === "single" && "Delete Enrollment?"}
                            {confirmDelete === "selected" && `Delete ${selected.size} Enrollment${selected.size > 1 ? "s" : ""}?`}
                            {confirmDelete === "all" && `Delete All ${filteredEnrollments.length} Enrollments?`}
                        </h2>
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>
                            {confirmDelete === "single" && <><strong style={{ color: "var(--color-admin-text)" }}>{singleTarget?.user?.firstName} {singleTarget?.user?.surname}</strong> in <strong style={{ color: "var(--color-admin-text)" }}>{singleTarget?.activity?.name}</strong> — this cannot be undone.</>}
                            {confirmDelete === "selected" && <>Permanently delete <strong style={{ color: "var(--color-admin-text)" }}>{selected.size} selected enrollment{selected.size > 1 ? "s" : ""}</strong>? This cannot be undone.</>}
                            {confirmDelete === "all" && <>Permanently delete <strong style={{ color: "var(--color-admin-text)" }}>all {filteredEnrollments.length}</strong> enrollments in the current view? This cannot be undone.</>}
                        </p>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button onClick={() => { setConfirmDelete(null); setSingleTarget(null); }} disabled={deleting} style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleConfirmDeleteEnrollment} disabled={deleting} style={{ flex: 1, background: "#DC2626", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}>{deleting ? "Deleting…" : "Delete"}</button>
                        </div>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
