"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Bell, Heart, MessageSquare, Share2, Send, X, Pin, HelpCircle, Image as ImageIcon, Search, ImageOff, FileText, Paperclip, Play } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

type MediaType = "image" | "video" | "pdf";

// Detects media type from a MIME type string
function getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "application/pdf") return "pdf";
    return "image";
}

// Unified media renderer for image, video and PDF attachments
function PostMedia({ src, mediaType, style }: { src: string; mediaType?: MediaType; style?: React.CSSProperties }) {
    const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading");
    useEffect(() => { setImgStatus("loading"); }, [src]);

    const type = mediaType ?? "image";

    if (type === "video") {
        return (
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", background: "#000", ...style }}>
                <video
                    src={src}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", maxHeight: 240, display: "block", borderRadius: "inherit" }}
                />
            </div>
        );
    }

    if (type === "pdf") {
        return (
            <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    color: "var(--color-text-primary)",
                    marginBottom: 10,
                    ...style,
                }}
            >
                <div style={{ width: 36, height: 36, background: "#e53e3e", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={18} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>PDF Document</p>
                    <p style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Tap to open</p>
                </div>
                <Paperclip size={14} color="var(--color-text-muted)" />
            </a>
        );
    }

    // Default: image
    return (
        <div style={{ position: "relative", ...style }}>
            {imgStatus === "loading" && (
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, var(--color-border) 25%, var(--color-surface) 50%, var(--color-border) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.4s infinite",
                    borderRadius: "inherit",
                }} />
            )}
            {imgStatus === "error" && (
                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, padding: "20px 16px",
                    background: "var(--color-surface)",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "inherit",
                    color: "var(--color-text-muted)",
                    minHeight: 80,
                }}>
                    <ImageOff size={22} />
                    <span style={{ fontSize: 11 }}>Image couldn't load</span>
                </div>
            )}
            <img
                src={src}
                alt="Post attachment"
                loading="lazy"
                onLoad={() => setImgStatus("loaded")}
                onError={() => setImgStatus("error")}
                style={{
                    display: imgStatus === "error" ? "none" : "block",
                    opacity: imgStatus === "loaded" ? 1 : 0,
                    transition: "opacity 0.3s ease",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "inherit",
                }}
            />
        </div>
    );
}

// Splits plain text content into segments and renders URLs as clickable links
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
function renderContent(text: string) {
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) =>
        URL_REGEX.test(part) ? (
            <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: "var(--color-primary)",
                    textDecoration: "underline",
                    wordBreak: "break-all",
                    fontWeight: 500,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {part}
            </a>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}



export default function BulletinBoardPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);

    // Tab state: "announcements" (Information Repository) | "q&a" (Discussions & Help)
    const [activeTab, setActiveTab] = useState<"announcements" | "q&a">("announcements");

    // Post composer states
    const [content, setContent] = useState("");
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachedMediaType, setAttachedMediaType] = useState<MediaType>("image");
    const [attachedPreviewUrl, setAttachedPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Thread/Comment States
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [commentContent, setCommentContent] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    // Bind messages collection using the tab group identifier
    const messages = useQuery(api.messages.getMessages, { group: activeTab }) || [];
    const replies = useQuery(api.messages.getReplies, selectedPost ? { parentId: selectedPost._id } : "skip") || [];
    
    const postMessage = useMutation(api.messages.postMessage);
    const toggleLike = useMutation(api.messages.toggleLike);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

    // Filter messages based on search query (searching content, first name, or surname)
    const filteredMessages = messages.filter((m: any) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const contentMatch = (m.content || "").toLowerCase().includes(q);
        const nameMatch = `${m.user?.firstName || ""} ${m.user?.surname || ""}`.toLowerCase().includes(q);
        return contentMatch || nameMatch;
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);

        // File size limits
        const mb = file.size / (1024 * 1024);
        const type = getMediaType(file.type);
        if (type === "image" && mb > 10) { setUploadError("Images must be under 10 MB."); e.target.value = ""; return; }
        if (type === "video" && mb > 80) { setUploadError("Videos must be under 80 MB."); e.target.value = ""; return; }
        if (type === "pdf"  && mb > 20) { setUploadError("PDFs must be under 20 MB.");   e.target.value = ""; return; }

        setAttachedFile(file);
        setAttachedMediaType(type);
        if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
        setAttachedPreviewUrl(URL.createObjectURL(file));
        e.target.value = "";
    };

    const handleRemoveAttachment = () => {
        if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
        setAttachedFile(null);
        setAttachedPreviewUrl(null);
        setUploadError(null);
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !content.trim() || posting) return;
        setPosting(true);
        let mediaUrl: string | undefined;
        let mediaType: MediaType | undefined;
        try {
            if (attachedFile) {
                setUploading(true);
                const uploadUrl = await generateUploadUrl({});
                const res = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": attachedFile.type },
                    body: attachedFile,
                });
                const { storageId } = await res.json();
                const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(".cloud", ".site") ?? "";
                mediaUrl = `${convexSiteUrl}/api/storage/${storageId}`;
                mediaType = attachedMediaType;
                setUploading(false);
            }

            await postMessage({
                userId: auth.id,
                content: content.trim(),
                group: activeTab,
                mediaUrl,
                mediaType,
            });

            setContent("");
            handleRemoveAttachment();
        } catch (err) {
            console.error("Failed to post:", err);
            setUploading(false);
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
        <div className="app-container" style={{ background: "var(--color-employee-bg)", minHeight: "100dvh" }}>
            <header className="top-bar">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Pin size={16} color="white" />
                    </div>
                    <h1 className="top-bar-title">Bulletin Board</h1>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button className="notification-btn" onClick={() => router.push("/notifications")}><Bell size={20} /></button>
                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 13, cursor: "pointer" }} onClick={() => router.push("/profile")}>
                        {(auth?.firstName || "U")[0]}
                    </div>
                </div>
            </header>

            <main className="page-content">
                {/* 2-Tab Segmented Controls */}
                <div className="segmented" style={{ marginBottom: "var(--spacing-md)", background: "var(--color-surface)" }}>
                    <button 
                        className={`seg-btn ${activeTab === "announcements" ? "active" : ""}`} 
                        onClick={() => setActiveTab("announcements")} 
                        style={{ color: activeTab === "announcements" ? "var(--color-primary)" : "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                        <Pin size={14} /> Info Board
                    </button>
                    <button 
                        className={`seg-btn ${activeTab === "q&a" ? "active" : ""}`} 
                        onClick={() => setActiveTab("q&a")} 
                        style={{ color: activeTab === "q&a" ? "var(--color-primary)" : "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                        <HelpCircle size={14} /> Q&A Forum
                    </button>
                </div>

                {/* 1. Bulletin Post Composer */}
                <div className="card" style={{ marginBottom: "var(--spacing-md)", border: activeTab === "announcements" ? "1.5px solid var(--color-primary-light)" : "1.5px solid var(--color-border)" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                        <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 16, flexShrink: 0 }}>{(auth?.firstName || "U")[0]}</div>
                        <textarea 
                            className="input" 
                            style={{ flex: 1, minHeight: 80, resize: "none", border: "none", padding: 0, fontSize: 14, background: "transparent" }}
                            placeholder={activeTab === "announcements" ? "Post official updates, health notices, or board media..." : "Ask a wellness question or search for tips..."} 
                            value={content} 
                            onChange={(e) => setContent(e.target.value)} 
                            id="bulletin-post-input" 
                        />
                    </div>

                    {/* Attached File Preview */}
                    {attachedPreviewUrl && (
                        <div style={{ position: "relative", marginTop: 8, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                            {attachedMediaType === "video" ? (
                                <video src={attachedPreviewUrl} style={{ width: "100%", maxHeight: 160, display: "block" }} muted />
                            ) : attachedMediaType === "pdf" ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", background: "var(--color-surface)" }}>
                                    <div style={{ width: 36, height: 36, background: "#e53e3e", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <FileText size={18} color="white" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachedFile?.name}</p>
                                        <p style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{((attachedFile?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB</p>
                                    </div>
                                </div>
                            ) : (
                                <img src={attachedPreviewUrl} alt="Attachment Preview" style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} />
                            )}
                            {uploading && (
                                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                                    <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                    <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Uploading…</span>
                                </div>
                            )}
                            {!uploading && (
                                <button
                                    onClick={handleRemoveAttachment}
                                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "white", padding: 4, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    )}
                    {uploadError && (
                        <p style={{ fontSize: 11, color: "#e53e3e", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>⚠ {uploadError}</p>
                    )}

                    {/* Action buttons */}
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf"
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                                id="bulletin-file-input"
                            />
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip size={14} />
                                {attachedFile ? attachedFile.name.length > 20 ? attachedFile.name.slice(0, 18) + "…" : attachedFile.name : "Add Media"}
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleCreatePost}
                                disabled={!content.trim() || posting}
                                id="bulletin-post-btn"
                            >
                                <Send size={14} /> {posting ? (uploading ? "Uploading…" : "Posting…") : "Post"}
                            </button>
                        </div>
                        <p style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 6 }}>Images (JPEG/PNG/GIF/WebP) up to 10 MB · Videos (MP4/MOV/WebM) up to 80 MB · PDF up to 20 MB</p>
                    </div>
                </div>

                {/* Real-time Bulletin Search Bar */}
                <div style={{ position: "relative", marginBottom: "var(--spacing-md)" }}>
                    <input 
                        type="text"
                        className="input" 
                        style={{ paddingLeft: 40, background: "var(--color-surface)", border: "1px solid var(--color-border)", margin: 0, height: 42 }}
                        placeholder={activeTab === "announcements" ? "Search announcements by keywords or admin name..." : "Search questions by name or key terms..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        id="bulletin-search-input"
                    />
                    <Search size={18} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                            id="clear-bulletin-search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* 2. Bulletin Feed */}
                {filteredMessages.length === 0 ? (
                    <div className="empty-state">
                        <HelpCircle size={48} className="empty-state-icon" />
                        <p className="empty-state-title">
                            {searchQuery.trim() ? "No search results" : "No posts here yet"}
                        </p>
                        <p className="empty-state-body">
                            {searchQuery.trim() 
                                ? `We couldn't find any posts matching "${searchQuery}". Try a different keyword.`
                                : activeTab === "announcements" 
                                    ? "Be the first to publish important health notices or guidelines." 
                                    : "Got a wellness question? Go ahead and ask the community!"}
                        </p>
                    </div>
                ) : (
                    filteredMessages.map((m: any) => {
                        const hasLiked = m.likes?.includes(auth?.id);
                        const isCensored = m.isCensored === true;
                        return (
                            <div key={m._id} className="card" style={{ marginBottom: "var(--spacing-sm)", borderTop: activeTab === "announcements" ? "3px solid var(--color-primary)" : "none", opacity: isCensored ? 0.6 : 1 }}>
                                {/* Header with post category indicator */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div className="avatar-placeholder" style={{ width: 38, height: 38, fontSize: 14 }}>{(m.user?.firstName || "?")[0]}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>{m.user?.firstName} {m.user?.surname}</p>
                                            {m.user?.role !== "employee" && (
                                                <span style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>{m.user?.role === "super_admin" ? "Super Admin" : "Admin"}</span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{timeAgo(m.createdAt)}</p>
                                    </div>
                                    {activeTab === "announcements" ? (
                                        <Pin size={16} color="var(--color-primary)" style={{ transform: "rotate(45deg)" }} />
                                    ) : (
                                        <HelpCircle size={16} color="var(--color-secondary)" />
                                    )}
                                </div>

                                {/* Content */}
                                <p style={{ fontSize: 14, lineHeight: 1.6, color: isCensored ? "var(--color-text-muted)" : "var(--color-text-primary)", marginBottom: 10, whiteSpace: "pre-wrap", fontStyle: isCensored ? "italic" : "normal" }}>{isCensored ? m.content : renderContent(m.content)}</p>
                                
                                {m.mediaUrl && !isCensored && (
                                    <PostMedia
                                        src={m.mediaUrl}
                                        mediaType={m.mediaType}
                                        style={{ borderRadius: "var(--radius-md)", marginBottom: 10, maxHeight: 220, overflow: "hidden" }}
                                    />
                                )}

                                {/* Card Actions */}
                                <div style={{ display: "flex", gap: "var(--spacing-md)", borderTop: "1px solid var(--color-border)", paddingTop: 10 }}>
                                    <button 
                                        onClick={() => auth && !isCensored && toggleLike({ messageId: m._id, userId: auth.id })} 
                                        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: isCensored ? "default" : "pointer", fontSize: 13, color: hasLiked ? "var(--color-primary)" : "var(--color-text-secondary)", fontWeight: hasLiked ? 600 : 400 }}
                                    >
                                        <Heart size={16} fill={hasLiked ? "var(--color-primary)" : "none"} /> {m.likes?.length ?? 0}
                                    </button>
                                    <button 
                                        onClick={() => !isCensored && setSelectedPost(m)}
                                        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: isCensored ? "default" : "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}
                                        id={`reply-btn-${m._id}`}
                                    >
                                        <MessageSquare size={16} /> {m.replyCount ?? 0} {activeTab === "q&a" ? "Answers" : "Comments"}
                                    </button>
                                    <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
                                        <Share2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Thread / Discussion Bottom Sheet Drawer Modal */}
            {selectedPost && (
                <div className="modal-overlay" onClick={() => { if (!postingComment) setSelectedPost(null); }}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}>
                        <div className="modal-handle" />
                        
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)", flexShrink: 0 }}>
                            <h2 className="modal-title" style={{ marginBottom: 0 }}>{selectedPost.group === "q&a" ? "Question Thread" : "Announcement Discussion"}</h2>
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
                                <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8, whiteSpace: "pre-wrap" }}>{renderContent(selectedPost.content)}</p>
                                {selectedPost.mediaUrl && (
                                    <PostMedia
                                        src={selectedPost.mediaUrl}
                                        mediaType={selectedPost.mediaType}
                                        style={{ borderRadius: "var(--radius-md)", maxHeight: 150, overflow: "hidden", marginBottom: 8 }}
                                    />
                                )}
                                <div style={{ display: "flex", gap: "var(--spacing-md)", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                                    <button onClick={() => auth && toggleLike({ messageId: selectedPost._id, userId: auth.id })} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: selectedPost.likes?.includes(auth?.id) ? "var(--color-primary)" : "var(--color-text-secondary)", fontWeight: selectedPost.likes?.includes(auth?.id) ? 600 : 400 }}>
                                        <Heart size={14} fill={selectedPost.likes?.includes(auth?.id) ? "var(--color-primary)" : "none"} /> {selectedPost.likes?.length ?? 0}
                                    </button>
                                </div>
                            </div>

                            {/* Replies Header */}
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-sm)" }}>
                                {selectedPost.group === "q&a" ? "Answers" : "Comments"} ({replies.length})
                            </h3>

                            {/* Replies List */}
                            {replies.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)" }}>
                                    <p style={{ fontSize: 13 }}>{selectedPost.group === "q&a" ? "No answers yet. Share your knowledge!" : "No comments yet. Start the conversation!"}</p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {replies.map((reply: any) => (
                                        <div key={reply._id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                            <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{(reply.user?.firstName || "?")[0]}</div>
                                            <div style={{ background: "var(--color-employee-bg)", padding: "10px 12px", borderRadius: "0 12px 12px 12px", fontSize: 13, color: "var(--color-text-primary)", flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{reply.user?.firstName} {reply.user?.surname}</span>
                                                        {reply.user?.role !== "employee" && (
                                                            <span style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", fontSize: 8, fontWeight: 700, padding: "0px 4px", borderRadius: 3, textTransform: "uppercase" }}>{reply.user?.role === "super_admin" ? "S-Admin" : "Admin"}</span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{timeAgo(reply.createdAt)}</span>
                                                </div>
                                                <p style={{ lineHeight: 1.4, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{renderContent(reply.content)}</p>
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
                                placeholder={selectedPost.group === "q&a" ? "Write an answer..." : "Write a comment..."} 
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
