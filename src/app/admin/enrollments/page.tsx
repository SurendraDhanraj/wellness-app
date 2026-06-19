"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    ClipboardList, Search, X, CheckCircle, Clock, XCircle, AlertCircle,
    ChevronDown, Filter, Trash2, CheckSquare, Square, AlertTriangle,
} from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses", color: "var(--color-admin-text-muted)" },
    { value: "in_progress", label: "In Progress", color: "#3B82F6" },
    { value: "pending_verification", label: "Pending", color: "#F59E0B" },
    { value: "verified", label: "Verified", color: "#10B981" },
    { value: "rejected", label: "Rejected", color: "#EF4444" },
];

const CATEGORY_COLORS: Record<string, string> = {
    physical: "#10B981",
    social: "#8B5CF6",
    financial: "#F59E0B",
    emotional: "#EC4899",
};

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

export default function AdminEnrollmentsPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Selection state
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Confirm modal state
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
        } catch {
            localStorage.removeItem("heritage_auth");
            router.replace("/login");
        }
    }, [router]);

    const enrollments = useQuery(api.activities.getAllEnrollmentsAdmin, {
        status: statusFilter !== "all" ? statusFilter : undefined,
    }) || [];

    const deleteOne = useMutation(api.activities.deleteEnrollment);
    const deleteMany = useMutation(api.activities.deleteEnrollments);

    const filtered = enrollments.filter((e: any) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const nameMatch = `${e.user?.firstName || ""} ${e.user?.surname || ""}`.toLowerCase().includes(q);
        const emailMatch = (e.user?.email || "").toLowerCase().includes(q);
        const actMatch = (e.activity?.name || "").toLowerCase().includes(q);
        return nameMatch || emailMatch || actMatch;
    });

    const allFilteredIds = filtered.map((e: any) => e._id as string);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
    const someSelected = selected.size > 0;

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected(prev => {
                const next = new Set(prev);
                allFilteredIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setSelected(prev => new Set([...prev, ...allFilteredIds]));
        }
    };

    const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            if (confirmDelete === "single" && singleTarget) {
                await deleteOne({ enrollmentId: singleTarget._id });
            } else if (confirmDelete === "selected") {
                await deleteMany({ enrollmentIds: Array.from(selected) as any[] });
                exitSelectMode();
            } else if (confirmDelete === "all") {
                await deleteMany({ enrollmentIds: allFilteredIds as any[] });
                exitSelectMode();
            }
        } finally {
            setDeleting(false);
            setConfirmDelete(null);
            setSingleTarget(null);
        }
    };

    // Stats
    const total = enrollments.length;
    const verified = enrollments.filter((e: any) => e.status === "verified").length;
    const pending = enrollments.filter((e: any) => e.status === "pending_verification").length;
    const inProgress = enrollments.filter((e: any) => e.status === "in_progress").length;

    if (!auth) return null;

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <div style={{ width: 24 }} />
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Enrollments</h1>
                <button
                    onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
                    style={{ background: selectMode ? "var(--color-primary)22" : "none", color: selectMode ? "var(--color-primary)" : "var(--color-admin-text-muted)", border: selectMode ? "1px solid var(--color-primary)44" : "none", borderRadius: "var(--radius-md)", padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    id="toggle-select-mode"
                >
                    {selectMode ? "Cancel" : "Select"}
                </button>
            </header>

            <main className="admin-content">
                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
                    {[
                        { label: "Total", value: total, color: "var(--color-admin-text)" },
                        { label: "Verified", value: verified, color: "#10B981" },
                        { label: "Pending", value: pending, color: "#F59E0B" },
                        { label: "Active", value: inProgress, color: "#3B82F6" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="card admin" style={{ textAlign: "center", padding: "var(--spacing-sm) 4px" }}>
                            <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
                            <p style={{ fontSize: 10, color: "var(--color-admin-text-muted)", marginTop: 2 }}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Bulk action bar (visible in select mode) */}
                {selectMode && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--spacing-md)", background: "var(--color-admin-card)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                        {/* Select all toggle */}
                        <button
                            onClick={toggleSelectAll}
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: allSelected ? "var(--color-primary)" : "var(--color-admin-text-muted)", fontWeight: 600, fontSize: 13 }}
                            id="select-all-btn"
                        >
                            {allSelected
                                ? <CheckSquare size={18} color="var(--color-primary)" />
                                : <Square size={18} />}
                            {allSelected ? "Deselect all" : `Select all (${allFilteredIds.length})`}
                        </button>

                        <div style={{ flex: 1 }} />

                        {someSelected && (
                            <span style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>
                                {selected.size} selected
                            </span>
                        )}

                        <button
                            onClick={() => { if (someSelected) setConfirmDelete("selected"); }}
                            disabled={!someSelected}
                            style={{ display: "flex", alignItems: "center", gap: 5, background: someSelected ? "#DC262622" : "var(--color-admin-surface)", color: someSelected ? "#DC2626" : "var(--color-admin-text-muted)", border: `1px solid ${someSelected ? "#DC262644" : "transparent"}`, borderRadius: "var(--radius-md)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: someSelected ? "pointer" : "default" }}
                            id="delete-selected-btn"
                        >
                            <Trash2 size={13} /> Delete selected
                        </button>

                        <button
                            onClick={() => setConfirmDelete("all")}
                            style={{ display: "flex", alignItems: "center", gap: 5, background: "#DC262622", color: "#DC2626", border: "1px solid #DC262644", borderRadius: "var(--radius-md)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                            id="delete-all-btn"
                        >
                            <Trash2 size={13} /> Delete all ({filtered.length})
                        </button>
                    </div>
                )}

                {/* Search + filter row */}
                <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                        <input
                            type="text"
                            className="input admin"
                            style={{ paddingLeft: 38, margin: 0 }}
                            placeholder="Search by name, email or activity..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            id="enroll-search"
                        />
                        <Search size={15} color="var(--color-admin-text-muted)" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", display: "flex" }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Status filter */}
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                            id="status-filter-btn"
                        >
                            <Filter size={14} />
                            {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label ?? "All"}
                            <ChevronDown size={13} />
                        </button>
                        {showFilterMenu && (
                            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--color-admin-card)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", overflow: "hidden", zIndex: 50, minWidth: 160, boxShadow: "var(--shadow-lg)" }}>
                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setStatusFilter(opt.value); setShowFilterMenu(false); }}
                                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: statusFilter === opt.value ? "var(--color-admin-surface)" : "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: statusFilter === opt.value ? 700 : 400, color: opt.color, textAlign: "left" }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Enrollment list */}
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardList size={44} className="empty-state-icon" />
                        <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No enrollments found</p>
                        <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>
                            {searchQuery ? `No results for "${searchQuery}"` : "No enrollments match the selected filter."}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                        {filtered.map((e: any) => {
                            const catColor = CATEGORY_COLORS[e.activity?.category] ?? "#6B7280";
                            const isSelected = selected.has(e._id);
                            return (
                                <div
                                    key={e._id}
                                    className="card admin"
                                    id={`enrollment-${e._id}`}
                                    style={{ borderLeft: `3px solid ${isSelected ? "var(--color-primary)" : catColor}`, background: isSelected ? "var(--color-primary)08" : undefined, cursor: selectMode ? "pointer" : "default", transition: "background 0.15s" }}
                                    onClick={() => selectMode && toggleSelect(e._id)}
                                >
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                        {/* Checkbox or Avatar */}
                                        {selectMode ? (
                                            <div style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                {isSelected
                                                    ? <CheckSquare size={22} color="var(--color-primary)" />
                                                    : <Square size={22} color="var(--color-admin-text-muted)" />}
                                            </div>
                                        ) : (
                                            <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${catColor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: catColor, flexShrink: 0 }}>
                                                {(e.user?.firstName || "?")[0].toUpperCase()}
                                            </div>
                                        )}

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* User name + status + delete */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                                                <div>
                                                    <p style={{ fontWeight: 700, fontSize: 13, color: "var(--color-admin-text)" }}>
                                                        {e.user?.firstName} {e.user?.surname}
                                                    </p>
                                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {e.user?.email}
                                                    </p>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                                    <StatusBadge status={e.status} />
                                                    {!selectMode && (
                                                        <button
                                                            onClick={(ev) => { ev.stopPropagation(); setSingleTarget(e); setConfirmDelete("single"); }}
                                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#DC262618", color: "#DC2626", border: "none", borderRadius: "var(--radius-sm)", padding: 6, cursor: "pointer" }}
                                                            id={`delete-${e._id}`}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Activity */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                                <span style={{ fontSize: 16 }}>{e.activity?.icon ?? "🏃"}</span>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)" }}>{e.activity?.name ?? "Unknown Activity"}</p>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: catColor, background: `${catColor}18`, padding: "1px 7px", borderRadius: 99, textTransform: "capitalize" }}>
                                                    {e.activity?.category}
                                                </span>
                                                <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginLeft: "auto" }}>
                                                    {e.activity?.points} pts
                                                </span>
                                            </div>

                                            {/* Timestamps */}
                                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--color-admin-text-muted)", flexWrap: "wrap" }}>
                                                <span>Enrolled: {format(new Date(e.enrolledAt), "MMM d, yyyy")}</span>
                                                {e.completedAt && <span>Submitted: {format(new Date(e.completedAt), "MMM d, yyyy")}</span>}
                                                {e.verifiedAt && <span>Verified: {format(new Date(e.verifiedAt), "MMM d, yyyy")}</span>}
                                            </div>

                                            {/* Proof note */}
                                            {e.proofNote && (
                                                <div style={{ marginTop: 6, background: "var(--color-admin-surface)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
                                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", fontStyle: "italic" }}>"{e.proofNote}"</p>
                                                </div>
                                            )}

                                            {/* Admin note */}
                                            {e.adminNote && (
                                                <div style={{ marginTop: 4, background: "#F59E0B11", borderRadius: "var(--radius-sm)", padding: "6px 10px", border: "1px solid #F59E0B22" }}>
                                                    <p style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>Admin note: {e.adminNote}</p>
                                                </div>
                                            )}

                                            {/* Proof image */}
                                            {e.proofUrl && e.proofType === "image" && (
                                                <img
                                                    src={e.proofUrl}
                                                    alt="Proof"
                                                    onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }}
                                                    style={{ marginTop: 8, width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: "var(--radius-md)" }}
                                                />
                                            )}

                                            {/* Pending shortcut */}
                                            {e.status === "pending_verification" && !selectMode && (
                                                <button
                                                    onClick={(ev) => { ev.stopPropagation(); router.push("/admin/verify"); }}
                                                    style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, background: "#F59E0B22", color: "#F59E0B", border: "1px solid #F59E0B44", borderRadius: "var(--radius-md)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                                >
                                                    <AlertCircle size={13} /> Review in Verify
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Close filter menu on outside click */}
            {showFilterMenu && (
                <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowFilterMenu(false)} />
            )}

            {/* Confirm delete modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DC262622", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                            <AlertTriangle size={26} color="#DC2626" />
                        </div>
                        <h2 className="modal-title admin">
                            {confirmDelete === "single" && "Delete Enrollment?"}
                            {confirmDelete === "selected" && `Delete ${selected.size} Enrollment${selected.size > 1 ? "s" : ""}?`}
                            {confirmDelete === "all" && `Delete All ${filtered.length} Enrollments?`}
                        </h2>
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>
                            {confirmDelete === "single" && (
                                <>Permanently delete the enrollment for <strong style={{ color: "var(--color-admin-text)" }}>{singleTarget?.user?.firstName} {singleTarget?.user?.surname}</strong> in <strong style={{ color: "var(--color-admin-text)" }}>{singleTarget?.activity?.name}</strong>? This cannot be undone.</>
                            )}
                            {confirmDelete === "selected" && <>Permanently delete the <strong style={{ color: "var(--color-admin-text)" }}>{selected.size} selected enrollment{selected.size > 1 ? "s" : ""}</strong>? This cannot be undone.</>}
                            {confirmDelete === "all" && <>Permanently delete <strong style={{ color: "var(--color-admin-text)" }}>all {filtered.length} enrollment{filtered.length > 1 ? "s" : ""}</strong> matching the current view? This cannot be undone.</>}
                        </p>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button
                                onClick={() => { setConfirmDelete(null); setSingleTarget(null); }}
                                disabled={deleting}
                                style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}
                                id="cancel-delete-btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                style={{ flex: 1, background: "#DC2626", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}
                                id="confirm-delete-btn"
                            >
                                {deleting ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
