"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Upload, FileText, ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function SubmitProofPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const [auth, setAuth] = useState<any>(null);
    const [note, setNote] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [previousFileInfo, setPreviousFileInfo] = useState<{ type: string; note: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [seeded, setSeeded] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const submitProof = useMutation(api.activities.submitProof);

    // Get enrollmentId from URL query param (?enrollmentId=xxx)
    const enrollmentId = searchParams.get("enrollmentId");

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    // Fetch existing enrollment data to pre-populate the form
    // Uses getEnrollments (already typed) and filters client-side
    const allEnrollments = useQuery(
        api.activities.getEnrollments,
        auth ? { userId: auth.id } : "skip"
    );
    const enrollment = allEnrollments?.find((e: any) => e._id === enrollmentId);

    // Pre-populate note and preview from previous submission once data is loaded
    useEffect(() => {
        if (!seeded && enrollment) {
            if (enrollment.proofNote) setNote(enrollment.proofNote);
            if (enrollment.proofUrl) {
                const url: string = enrollment.proofUrl;
                // Real hosted URL → show as image preview
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    setPreview(url);
                } else {
                    // Blob URL from a previous session — expired, show a placeholder card
                    const typeLabel = enrollment.proofType === "image" ? "Image"
                        : enrollment.proofType === "video" ? "Video"
                            : "Document";
                    setPreviousFileInfo({ type: typeLabel, note: enrollment.proofNote || "" });
                }
            }
            setSeeded(true);
        }
    }, [enrollment, seeded]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setError("");
        if (f.type.startsWith("image/")) {
            setPreview(URL.createObjectURL(f));
        } else {
            setPreview(null);
        }
    };

    const getProofType = (): "image" | "video" | "document" => {
        if (!file) return "document";
        if (file.type.startsWith("image/")) return "image";
        if (file.type.startsWith("video/")) return "video";
        return "document";
    };

    const handleSubmit = async () => {
        setError("");
        if (!enrollmentId) {
            setError("Enrollment not found. Please go back to Activities and tap 'Upload Proof' again.");
            return;
        }
        if (!file && !note.trim() && !preview) {
            setError("Please upload a file or add a note before submitting.");
            return;
        }
        setLoading(true);
        try {
            await submitProof({
                enrollmentId: enrollmentId as any,
                proofUrl: preview || undefined,
                proofType: file ? getProofType() : (preview ? "image" : undefined),
                proofNote: note || undefined,
            });
            setSuccess(true);
        } catch (e: any) {
            setError(e.message || "Submission failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) return (
        <div className="app-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--spacing-xl)", minHeight: "100dvh" }}>
            <div style={{ fontSize: 64, marginBottom: "var(--spacing-md)" }}>🎉</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>Submitted!</h1>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", textAlign: "center", marginBottom: "var(--spacing-xl)" }}>
                Your proof has been submitted for review. Points will be awarded once verified by an administrator.
            </p>
            <button className="btn btn-primary btn-full btn-lg" onClick={() => router.push("/activities")}>Back to Activities</button>
        </div>
    );

    const isPreviouslySubmitted = enrollment?.status === "pending_verification" || enrollment?.status === "verified";

    return (
        <div className="app-container">
            <header className="top-bar">
                <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                    <ChevronLeft size={20} /><span style={{ fontSize: 15 }}>Back</span>
                </button>
                <h1 className="top-bar-title">Submit Proof</h1>
                <div style={{ width: 60 }} />
            </header>

            <main className="page-content">
                {/* Activity name if available */}
                {enrollment?.activity?.name && (
                    <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{enrollment.activity.name}</p>
                )}
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-lg)" }}>
                    Upload a photo, video, or document as proof of completing this activity. An administrator will review your submission.
                </p>

                {/* Previously submitted banner */}
                {isPreviouslySubmitted && (
                    <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: "var(--radius-md)", padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", marginBottom: "var(--spacing-md)" }}>
                        <CheckCircle size={16} color="#059669" />
                        <p style={{ fontSize: 13, color: "#065F46" }}>
                            You previously submitted proof for this activity. Your earlier data is shown below — update and resubmit if needed.
                        </p>
                    </div>
                )}

                {/* Missing enrollment warning */}
                {!enrollmentId && (
                    <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: "var(--radius-md)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: "var(--spacing-md)" }}>
                        <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 13, color: "#92400E" }}>No enrollment found. Please go back to <strong>Activities</strong> and tap <strong>Upload Proof</strong> to start.</p>
                    </div>
                )}

                {/* Previously uploaded file placeholder (blob URL from old session) */}
                {previousFileInfo && !file && !preview && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: "var(--color-primary-light)", border: "1.5px solid var(--color-primary)",
                        borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "var(--spacing-sm)"
                    }}>
                        <FileText size={32} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-primary)" }}>
                                Previous {previousFileInfo.type} Submission
                            </p>
                            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                                File can't be previewed after reload. Upload a new file to replace it, or resubmit with just the note.
                            </p>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}
                            onClick={() => setPreviousFileInfo(null)}>
                            Clear
                        </button>
                    </div>
                )}

                {/* Upload zone */}
                <div
                    className={`upload-zone ${file || preview ? "drag-over" : ""}`}
                    onClick={() => fileRef.current?.click()}
                    id="upload-zone"
                    style={{ cursor: "pointer" }}
                >
                    <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx" style={{ display: "none" }} onChange={handleFileChange} />
                    {preview ? (
                        <img src={preview} alt="preview" style={{ width: "100%", borderRadius: "var(--radius-md)", maxHeight: 220, objectFit: "cover" }} />
                    ) : file ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                            <FileText size={44} color="var(--color-primary)" />
                            <p style={{ fontWeight: 600 }}>{file.name}</p>
                            <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    ) : (
                        <>
                            <Upload size={44} color="var(--color-primary)" />
                            <p style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>
                                {previousFileInfo ? "Tap to upload a new file" : "Tap to upload proof"}
                            </p>
                            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Images, videos, PDFs or documents</p>
                        </>
                    )}
                </div>

                {(file || preview) && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setFile(null); setPreview(null); }}>
                        Remove file
                    </button>
                )}

                <div className="input-group" style={{ marginTop: "var(--spacing-lg)" }}>
                    <label className="input-label">Notes (optional)</label>
                    <textarea
                        className="input"
                        placeholder="Add any details about your submission, e.g. date, location, duration..."
                        value={note}
                        onChange={(e) => { setNote(e.target.value); setError(""); }}
                        id="proof-note"
                        style={{ minHeight: 90 }}
                    />
                </div>

                {/* Error message */}
                {error && (
                    <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start", marginTop: "var(--spacing-sm)" }}>
                        <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>
                    </div>
                )}

                <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={handleSubmit}
                    disabled={loading || !enrollmentId}
                    id="submit-proof-btn"
                    style={{ marginTop: "var(--spacing-md)" }}
                >
                    {loading ? "Submitting…" : isPreviouslySubmitted ? "Resubmit for Review" : "Submit for Review"}
                </button>

                {/* Status indicator */}
                {enrollmentId && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: "var(--spacing-sm)" }}>
                        <CheckCircle size={14} color="var(--color-success)" />
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Enrollment verified — ready to submit</span>
                    </div>
                )}
            </main>
        </div>
    );
}
