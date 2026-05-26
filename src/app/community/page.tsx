"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Bell, Heart, MessageSquare, Share2, Send, X } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

const GROUPS = ["trending", "myteam", "running", "yoga", "nutrition"];

export default function CommunityPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [group, setGroup] = useState("trending");
    const [content, setContent] = useState("");
    const [posting, setPosting] = useState(false);

    // Comments/Thread states
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [commentContent, setCommentContent] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const messages = useQuery(api.messages.getMessages, { group }) || [];
    const replies = useQuery(api.messages.getReplies, selectedPost ? { parentId: selectedPost._id } : "skip") || [];
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

    const handlePostComment = async () => {
        if (!auth || !selectedPost || !commentContent.trim() || postingComment) return;
        setPostingComment(true);
        try {
            await postMessage({
                userId: auth.id,
                content: commentContent.trim(),
                group: selectedPost.group,
                parentId: selectedPost._id,
            });
            setCommentContent("");
        } finally {
            setPostingComment(false);
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
                            <button 
                                onClick={() => setSelectedPost(m)}
                                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}
                                id={`reply-btn-${m._id}`}
                            >
                                <MessageSquare size={16} /> {m.replyCount ?? 0}
                            </button>
                            <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </main>

            {/* Thread/Comments Bottom Sheet Modal */}
            {selectedPost && (
                <div className="modal-overlay" onClick={() => { if (!postingComment) setSelectedPost(null); }}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}>
                        <div className="modal-handle" />
                        
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)", flexShrink: 0 }}>
                            <h2 className="modal-title" style={{ marginBottom: 0 }}>Discussion</h2>
                            <button 
                                onClick={() => { if (!postingComment) setSelectedPost(null); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Container */}
                        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, marginBottom: "var(--spacing-md)" }}>
                            {/* Original Post Card */}
                            <div className="card" style={{ marginBottom: "var(--spacing-lg)", border: "1.5px solid var(--color-primary-light)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: 14 }}>{(selectedPost.user?.firstName || "?")[0]}</div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, fontSize: 13 }}>{selectedPost.user?.firstName} {selectedPost.user?.surname}</p>
                                        <p style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{timeAgo(selectedPost.createdAt)}</p>
                                    </div>
                                </div>
                                <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{selectedPost.content}</p>
                                {selectedPost.mediaUrl && <img src={selectedPost.mediaUrl} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)", maxHeight: 150, objectFit: "cover", marginBottom: 8 }} />}
                                <div style={{ display: "flex", gap: "var(--spacing-md)", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                                    <button onClick={() => auth && toggleLike({ messageId: selectedPost._id, userId: auth.id })} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: selectedPost.likes?.includes(auth?.id) ? "var(--color-primary)" : "var(--color-text-secondary)", fontWeight: selectedPost.likes?.includes(auth?.id) ? 600 : 400 }}>
                                        <Heart size={14} fill={selectedPost.likes?.includes(auth?.id) ? "var(--color-primary)" : "none"} /> {selectedPost.likes?.length ?? 0}
                                    </button>
                                </div>
                            </div>

                            {/* Comments Header */}
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-sm)" }}>
                                Comments ({replies.length})
                            </h3>

                            {/* Comments List */}
                            {replies.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)" }}>
                                    <p style={{ fontSize: 13 }}>No comments yet. Start the conversation!</p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {replies.map((reply: any) => (
                                        <div key={reply._id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                            <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{(reply.user?.firstName || "?")[0]}</div>
                                            <div style={{ background: "var(--color-employee-bg)", padding: "10px 12px", borderRadius: "0 12px 12px 12px", fontSize: 13, color: "var(--color-text-primary)", flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 12 }}>{reply.user?.firstName} {reply.user?.surname}</span>
                                                    <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{timeAgo(reply.createdAt)}</span>
                                                </div>
                                                <p style={{ lineHeight: 1.4, wordBreak: "break-word" }}>{reply.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comment Input Composer */}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "var(--spacing-sm)", flexShrink: 0 }}>
                            <input 
                                className="input" 
                                style={{ flex: 1, padding: "10px var(--spacing-sm)", fontSize: 13, height: "auto" }}
                                placeholder="Write a comment..." 
                                value={commentContent} 
                                onChange={(e) => setCommentContent(e.target.value)} 
                                onKeyDown={(e) => { if (e.key === "Enter") handlePostComment(); }}
                                id="comment-input"
                                disabled={postingComment}
                            />
                            <button 
                                className="btn btn-primary" 
                                style={{ padding: "10px 14px", height: "auto" }}
                                onClick={handlePostComment}
                                disabled={!commentContent.trim() || postingComment}
                                id="send-comment-btn"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EmployeeBottomNav />
        </div>
    );
}
