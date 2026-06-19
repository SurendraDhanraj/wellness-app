"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Pin, HelpCircle, Heart, MessageSquare, Trash2, EyeOff, RotateCcw, Search, X, AlertTriangle, CheckCircle } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

export default function AdminBulletinPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"announcements" | "q&a">("announcements");
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "censor"; post: any } | null>(null);

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

    const messages = useQuery(api.messages.getAllMessagesAdmin, { group: activeTab }) || [];
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const restoreMessage = useMutation(api.messages.restoreMessage);
    const censorMessage = useMutation(api.messages.censorMessage);

    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 60000) return "just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return format(new Date(ts), "MMM d, yyyy");
    };

    const filteredMessages = messages.filter((m: any) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const contentMatch = (m.content || "").toLowerCase().includes(q);
        const nameMatch = `${m.user?.firstName || ""} ${m.user?.surname || ""}`.toLowerCase().includes(q);
        return contentMatch || nameMatch;
    });

    const handleDelete = async (post: any) => {
        await deleteMessage({ messageId: post._id });
        setConfirmAction(null);
    };

    const handleCensor = async (post: any) => {
        await censorMessage({ messageId: post._id });
        setConfirmAction(null);
    };

    const handleRestore = async (post: any) => {
        await restoreMessage({ messageId: post._id });
    };

    const deletedCount = messages.filter((m: any) => m.isDeleted).length;
    const censoredCount = messages.filter((m: any) => m.isCensored).length;

    if (!auth) return null;

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Bulletin Moderation</h1>
                <div style={{ width: 24 }} />
            </header>

            <main className="admin-content">
                {/* Stats row */}
                <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
                    <div className="card admin" style={{ flex: 1, textAlign: "center", padding: "var(--spacing-sm)" }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "var(--color-admin-text)" }}>{messages.filter((m: any) => !m.isDeleted && !m.isCensored).length}</p>
                        <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Active Posts</p>
                    </div>
                    <div className="card admin" style={{ flex: 1, textAlign: "center", padding: "var(--spacing-sm)" }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "var(--color-warning)" }}>{censoredCount}</p>
                        <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Censored</p>
                    </div>
                    <div className="card admin" style={{ flex: 1, textAlign: "center", padding: "var(--spacing-sm)" }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "var(--color-error)" }}>{deletedCount}</p>
                        <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Hidden</p>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="segmented" style={{ marginBottom: "var(--spacing-md)" }}>
                    <button
                        className={`seg-btn ${activeTab === "announcements" ? "active" : ""}`}
                        onClick={() => setActiveTab("announcements")}
                        style={{ color: activeTab === "announcements" ? "var(--color-primary)" : "var(--color-admin-text-muted)", display: "flex", alignItems: "center", gap: 6 }}
                    >
                        <Pin size={14} /> Info Board
                    </button>
                    <button
                        className={`seg-btn ${activeTab === "q&a" ? "active" : ""}`}
                        onClick={() => setActiveTab("q&a")}
                        style={{ color: activeTab === "q&a" ? "var(--color-primary)" : "var(--color-admin-text-muted)", display: "flex", alignItems: "center", gap: 6 }}
                    >
                        <HelpCircle size={14} /> Q&A Forum
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: "var(--spacing-md)" }}>
                    <input
                        type="text"
                        className="input admin"
                        style={{ paddingLeft: 40, margin: 0 }}
                        placeholder="Search posts by content or author..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        id="bulletin-admin-search"
                    />
                    <Search size={16} color="var(--color-admin-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", display: "flex" }}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Post list */}
                {filteredMessages.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No posts found</p>
                        <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>
                            {searchQuery ? `No results for "${searchQuery}"` : "No posts in this section yet."}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                        {filteredMessages.map((m: any) => {
                            const isDeleted = m.isDeleted === true;
                            const isCensored = m.isCensored === true;
                            const statusColor = isDeleted ? "var(--color-error)" : isCensored ? "var(--color-warning)" : "var(--color-success)";
                            const statusLabel = isDeleted ? "Hidden" : isCensored ? "Censored" : "Active";

                            return (
                                <div
                                    key={m._id}
                                    className="card admin"
                                    id={`bulletin-post-${m._id}`}
                                    style={{
                                        borderLeft: `3px solid ${statusColor}`,
                                        opacity: isDeleted ? 0.6 : 1,
                                    }}
                                >
                                    {/* Post header */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-admin-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "var(--color-admin-text)", flexShrink: 0 }}>
                                            {(m.user?.firstName || "?")[0].toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                <p style={{ fontWeight: 700, fontSize: 13, color: "var(--color-admin-text)" }}>
                                                    {m.user?.firstName} {m.user?.surname}
                                                </p>
                                                {m.user?.role !== "employee" && (
                                                    <span style={{ background: "var(--color-primary)22", color: "var(--color-primary)", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                                                        {m.user?.role === "super_admin" ? "Super Admin" : "Admin"}
                                                    </span>
                                                )}
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: `${statusColor}22`, color: statusColor, marginLeft: "auto" }}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>{timeAgo(m.createdAt)}</p>
                                        </div>
                                    </div>

                                    {/* Post content */}
                                    <p style={{ fontSize: 13, lineHeight: 1.6, color: isCensored ? "var(--color-admin-text-muted)" : "var(--color-admin-text)", fontStyle: isCensored ? "italic" : "normal", marginBottom: 8, whiteSpace: "pre-line" }}>
                                        {m.content}
                                    </p>

                                    {m.mediaUrl && !isCensored && (
                                        <img src={m.mediaUrl} alt="Attachment" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} style={{ width: "100%", borderRadius: "var(--radius-md)", maxHeight: 160, objectFit: "cover", marginBottom: 8 }} />
                                    )}

                                    {/* Stats row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, fontSize: 12, color: "var(--color-admin-text-muted)" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Heart size={13} /> {m.likes?.length ?? 0}</span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MessageSquare size={13} /> {m.replyCount ?? 0} replies</span>
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid var(--color-admin-border)" }}>
                                        {isDeleted ? (
                                            <button
                                                onClick={() => handleRestore(m)}
                                                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--color-success)22", color: "var(--color-success)", border: "1px solid var(--color-success)44", borderRadius: "var(--radius-md)", padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                                id={`restore-${m._id}`}
                                            >
                                                <RotateCcw size={14} /> Restore
                                            </button>
                                        ) : (
                                            <>
                                                {!isCensored && (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: "censor", post: m })}
                                                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--color-warning)22", color: "var(--color-warning)", border: "1px solid var(--color-warning)44", borderRadius: "var(--radius-md)", padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                                        id={`censor-${m._id}`}
                                                    >
                                                        <EyeOff size={14} /> Censor
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setConfirmAction({ type: "delete", post: m })}
                                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#DC262622", color: "#DC2626", border: "1px solid #DC262644", borderRadius: "var(--radius-md)", padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                                    id={`delete-${m._id}`}
                                                >
                                                    <Trash2 size={14} /> Hide
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Confirm Action Modal */}
            {confirmAction && (
                <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: confirmAction.type === "delete" ? "#DC262622" : "var(--color-warning)22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                            {confirmAction.type === "delete" ? <Trash2 size={24} color="#DC2626" /> : <AlertTriangle size={24} color="var(--color-warning)" />}
                        </div>
                        <h2 className="modal-title admin">
                            {confirmAction.type === "delete" ? "Hide Post?" : "Censor Post?"}
                        </h2>
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>
                            {confirmAction.type === "delete"
                                ? "This post will be hidden from all employees. You can restore it at any time."
                                : "The post content will be replaced with an admin removal notice. This cannot be undone."}
                        </p>
                        <div style={{ background: "var(--color-admin-surface)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: "var(--spacing-lg)", textAlign: "left" }}>
                            <p style={{ fontSize: 12, color: "var(--color-admin-text)", fontWeight: 600 }}>{confirmAction.post.user?.firstName} {confirmAction.post.user?.surname}</p>
                            <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 2, lineHeight: 1.4 }}>"{confirmAction.post.content.slice(0, 100)}{confirmAction.post.content.length > 100 ? "…" : ""}"</p>
                        </div>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button
                                onClick={() => setConfirmAction(null)}
                                style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}
                                id="cancel-action-btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmAction.type === "delete" ? handleDelete(confirmAction.post) : handleCensor(confirmAction.post)}
                                style={{ flex: 1, background: confirmAction.type === "delete" ? "#DC2626" : "var(--color-warning)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}
                                id="confirm-action-btn"
                            >
                                {confirmAction.type === "delete" ? "Hide Post" : "Censor Post"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
