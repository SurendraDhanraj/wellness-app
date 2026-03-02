"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Bell, Heart, MessageSquare, Share2, Send } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

const GROUPS = ["trending", "myteam", "running", "yoga", "nutrition"];

export default function CommunityPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [group, setGroup] = useState("trending");
    const [content, setContent] = useState("");
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const messages = useQuery(api.messages.getMessages, { group }) || [];
    const postMessage = useMutation(api.messages.postMessage);
    const toggleLike = useMutation(api.messages.toggleLike);

    const handlePost = async () => {
        if (!auth || !content.trim() || posting) return;
        setPosting(true);
        try {
            await postMessage({ userId: auth.id, content: content.trim(), group });
            setContent("");
        } finally {
            setPosting(false);
        }
    };

    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 60000) return "just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return format(new Date(ts), "MMM d");
    };

    return (
        <div className="app-container">
            <header className="top-bar">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>H</span>
                    </div>
                    <h1 className="top-bar-title">Community</h1>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button className="notification-btn" onClick={() => router.push("/notifications")}><Bell size={20} /></button>
                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 13, cursor: "pointer" }} onClick={() => router.push("/profile")}>
                        {(auth?.firstName || "U")[0]}
                    </div>
                </div>
            </header>

            <main className="page-content">
                {/* Post composer */}
                <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                        <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 16, flexShrink: 0 }}>{(auth?.firstName || "U")[0]}</div>
                        <textarea className="input" style={{ flex: 1, minHeight: 72, resize: "none", border: "none", padding: 0, fontSize: 14, background: "transparent" }}
                            placeholder="Share your wellness achievement..." value={content} onChange={(e) => setContent(e.target.value)} id="community-post-input" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 8, borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={handlePost} disabled={!content.trim() || posting} id="community-post-btn">
                            <Send size={14} /> {posting ? "Posting…" : "Post"}
                        </button>
                    </div>
                </div>

                {/* Group filter */}
                <div className="chip-row" style={{ marginBottom: "var(--spacing-md)" }}>
                    {GROUPS.map((g) => (
                        <button key={g} className={`category-chip ${group === g ? "active" : ""}`} onClick={() => setGroup(g)} id={`group-${g}`} style={{ textTransform: "capitalize" }}>{g === "myteam" ? "My Team" : g}</button>
                    ))}
                </div>

                {/* Feed */}
                {messages.length === 0 && (
                    <div className="empty-state">
                        <MessageSquare size={48} className="empty-state-icon" />
                        <p className="empty-state-title">No posts yet</p>
                        <p className="empty-state-body">Be the first to share your wellness journey!</p>
                    </div>
                )}

                {messages.map((m: any) => (
                    <div key={m._id} className="card" style={{ marginBottom: "var(--spacing-sm)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 16 }}>{(m.user?.firstName || "?")[0]}</div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 600, fontSize: 14 }}>{m.user?.firstName} {m.user?.surname}</p>
                                <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{timeAgo(m.createdAt)}</p>
                            </div>
                        </div>
                        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 10 }}>{m.content}</p>
                        {m.mediaUrl && <img src={m.mediaUrl} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)", marginBottom: 10, maxHeight: 200, objectFit: "cover" }} />}

                        <div style={{ display: "flex", gap: "var(--spacing-md)", borderTop: "1px solid var(--color-border)", paddingTop: 10 }}>
                            <button onClick={() => auth && toggleLike({ messageId: m._id, userId: auth.id })} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: m.likes?.includes(auth?.id) ? "var(--color-primary)" : "var(--color-text-secondary)", fontWeight: m.likes?.includes(auth?.id) ? 600 : 400 }}>
                                <Heart size={16} fill={m.likes?.includes(auth?.id) ? "var(--color-primary)" : "none"} /> {m.likes?.length ?? 0}
                            </button>
                            <button style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>
                                <MessageSquare size={16} /> {m.replyCount ?? 0}
                            </button>
                            <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </main>

            <EmployeeBottomNav />
        </div>
    );
}
