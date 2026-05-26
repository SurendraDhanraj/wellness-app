"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckCircle, XCircle, Clock, ChevronRight, Upload, AlertCircle, X, Check, QrCode, Camera } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import jsQR from "jsqr";

export default function AdminVerifyPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [selected, setSelected] = useState<any>(null);
    const [note, setNote] = useState("");
    const [processing, setProcessing] = useState(false);

    // Tab state: "pending" | "scan" | "bulk"
    const [activeTab, setActiveTab] = useState<"pending" | "scan" | "bulk">("pending");

    // Camera / Scan state
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState("");
    const [scanSuccessModal, setScanSuccessModal] = useState<any>(null);

    // Manual Verification state
    const [manualIdentifier, setManualIdentifier] = useState("");
    const [manualProcessing, setManualProcessing] = useState(false);
    const [manualError, setManualError] = useState("");

    // Bulk verify state
    const [selectedActivityId, setSelectedActivityId] = useState("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<string[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkResults, setBulkResults] = useState<any[] | null>(null);
    const [bulkError, setBulkError] = useState("");

    // Convex Mutations and Queries
    const verifyMutation = useMutation(api.activities.verifySubmission);
    const bulkVerifyMutation = useMutation(api.activities.bulkVerifyEnrollments);
    
    // QR / Manual Mutations
    const verifyEnrollmentViaQR = useMutation(api.qrcode.verifyEnrollmentViaQR);
    const verifyUserEventViaQR = useMutation(api.qrcode.verifyUserEventViaQR);
    const verifyUserEventViaIdentifier = useMutation(api.qrcode.verifyUserEventViaIdentifier);

    const pending = useQuery(api.activities.getPendingVerifications) || [];
    const activities = useQuery(api.activities.getAllActivitiesAdmin) || [];

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

    // Handle standard manual photo verification
    const handleVerify = async (approve: boolean) => {
        if (!selected || !auth) return;
        setProcessing(true);
        try {
            await verifyMutation({
                enrollmentId: selected._id,
                approve,
                adminNote: note || undefined,
                verifiedBy: auth.id,
            });
            setSelected(null); setNote("");
        } finally {
            setProcessing(false);
        }
    };

    // Standard CSV parse helper
    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/);
        const rows: string[] = [];
        let startIdx = 0;
        if (lines.length > 0) {
            const firstLine = lines[0].toLowerCase();
            if (firstLine.includes("email") || firstLine.includes("surname") || firstLine.includes("firstname") || firstLine.includes("name")) {
                startIdx = 1;
            }
        }
        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            rows.push(line);
        }
        return rows;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);
        setBulkError("");
        setBulkResults(null);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const parsed = parseCSV(text);
                setParsedRows(parsed);
                if (parsed.length === 0) {
                    setBulkError("No valid rows found in the CSV file.");
                }
            } catch (err) {
                setBulkError("Failed to parse CSV file.");
            }
        };
        reader.readAsText(file);
    };

    // Submit bulk CSV completions
    const handleBulkVerifySubmit = async () => {
        if (!selectedActivityId) {
            setBulkError("Please select an activity first.");
            return;
        }
        if (parsedRows.length === 0 || bulkProcessing) return;
        setBulkProcessing(true);
        setBulkError("");
        try {
            const res: any = await bulkVerifyMutation({
                activityId: selectedActivityId as any,
                rows: parsedRows,
                adminId: auth.id,
            });
            if (res.success) {
                setBulkResults(res.results || []);
                setParsedRows([]);
                setCsvFile(null);
            } else {
                setBulkError(res.error || "Failed to process bulk verification.");
            }
        } catch (err: any) {
            setBulkError(err.message || "An unexpected error occurred during processing.");
        } finally {
            setBulkProcessing(false);
        }
    };

    // Synthesize double success chime (offline-safe) and buzz device haptics
    const playSuccessBeep = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);

            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = "sine";
                osc2.frequency.setValueAtTime(1109.73, ctx.currentTime);
                gain2.gain.setValueAtTime(0.08, ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start();
                osc2.stop(ctx.currentTime + 0.25);
            }, 80);

            if (navigator.vibrate) {
                navigator.vibrate([80, 50, 80]);
            }
        } catch (e) {
            console.log("Audio/Haptic feedback blocked or unsupported:", e);
        }
    };

    // Scanner operations
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    const startCamera = async () => {
        setScanError("");
        setIsScanning(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true");
                videoRef.current.play();
                requestAnimationFrame(tick);
            }
        } catch (err: any) {
            console.error("Camera access error:", err);
            setScanError("Unable to access the camera. Check camera permissions or input fallback below.");
            setIsScanning(false);
        }
    };

    const tick = () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !streamRef.current) {
            return;
        }

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code) {
                        handleDecodedQR(code.data);
                        return;
                    }
                }
            }
        }
        requestAnimationFrame(tick);
    };

    const handleDecodedQR = async (payload: string) => {
        stopCamera();
        
        try {
            let res = null;
            if (payload.startsWith("HERITAGE-WELLNESS-ENROLLMENT:")) {
                const enrollmentId = payload.replace("HERITAGE-WELLNESS-ENROLLMENT:", "");
                res = await verifyEnrollmentViaQR({
                    enrollmentId: enrollmentId as any,
                    adminId: auth.id,
                });
            } else if (payload.startsWith("HERITAGE-WELLNESS-USER:")) {
                const userId = payload.replace("HERITAGE-WELLNESS-USER:", "");
                if (!selectedActivityId) {
                    setScanError("Please select the active activity above BEFORE scanning a universal profile pass.");
                    startCamera();
                    return;
                }
                res = await verifyUserEventViaQR({
                    userId: userId as any,
                    activityId: selectedActivityId as any,
                    adminId: auth.id,
                });
            } else {
                setScanError("Unrecognized QR payload format.");
                startCamera();
                return;
            }

            if (res && res.success) {
                playSuccessBeep();
                setScanSuccessModal(res);
            }
        } catch (err: any) {
            setScanError(err.message || "Failed to process scanned QR code.");
            startCamera();
        }
    };

    // Manual input verification fallback
    const handleManualVerify = async () => {
        const id = manualIdentifier.trim();
        if (!id) return;
        if (!selectedActivityId) {
            setManualError("Please select the active activity first.");
            return;
        }

        setManualProcessing(true);
        setManualError("");
        try {
            const res = await verifyUserEventViaIdentifier({
                identifier: id,
                activityId: selectedActivityId as any,
                adminId: auth.id,
            });

            if (res && res.success) {
                playSuccessBeep();
                setScanSuccessModal(res);
                setManualIdentifier("");
            }
        } catch (err: any) {
            setManualError(err.message || "Manual verification failed.");
        } finally {
            setManualProcessing(false);
        }
    };

    // Manage camera session on tab switch
    useEffect(() => {
        if (activeTab === "scan" && auth) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [activeTab, auth]);

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Verify Completions</h1>
                {pending.length > 0 && activeTab === "pending" && (
                    <span style={{ background: "var(--color-primary)", color: "white", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{pending.length}</span>
                )}
            </header>

            <main className="admin-content">
                {/* 3-Tab Segmented Controls */}
                <div className="segmented" style={{ marginBottom: "var(--spacing-md)" }}>
                    <button className={`seg-btn ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")} style={{ color: activeTab === "pending" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>
                        Pending ({pending.length})
                    </button>
                    <button className={`seg-btn ${activeTab === "scan" ? "active" : ""}`} onClick={() => setActiveTab("scan")} style={{ color: activeTab === "scan" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>
                        Scan QR
                    </button>
                    <button className={`seg-btn ${activeTab === "bulk" ? "active" : ""}`} onClick={() => setActiveTab("bulk")} style={{ color: activeTab === "bulk" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>
                        Bulk CSV
                    </button>
                </div>

                {/* 1. Pending Submissions Tab */}
                {activeTab === "pending" && (
                    pending.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle size={56} color="var(--color-success)" />
                            <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>All caught up!</p>
                            <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>There are no submissions awaiting verification.</p>
                        </div>
                    ) : (
                        pending.map((e: any) => (
                            <div key={e._id} className="list-item admin" style={{ cursor: "pointer" }} onClick={() => { setSelected(e); setNote(""); }} id={`verify-item-${e._id}`}>
                                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary)22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <span style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: 16 }}>{(e.user?.firstName || "?")[0]}</span>
                                </div>
                                <div className="list-item-content">
                                    <p className="list-item-title admin">{e.activity?.name}</p>
                                    <p className="list-item-subtitle admin">{e.user?.firstName} {e.user?.surname}</p>
                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                                        {format(new Date(e.completedAt || e.enrolledAt), "MMM d, yyyy")} · {e.activity?.points} pts
                                    </p>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: "var(--color-warning)22", color: "var(--color-warning)", fontWeight: 700 }}>PENDING</span>
                                    <ChevronRight size={16} color="var(--color-admin-text-muted)" />
                                </div>
                            </div>
                        ))
                    )
                )}

                {/* 2. QR Code Scanner Tab */}
                {activeTab === "scan" && (
                    <div>
                        <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-md)", lineHeight: 1.5 }}>
                            Scan an employee's wellness pass QR code. Supports direct activity-specific passes or universal profile cards (select activity first below).
                        </p>

                        <div className="input-group" style={{ marginBottom: "var(--spacing-md)" }}>
                            <label className="input-label admin">Active Event / Activity *</label>
                            <select 
                                className="input admin select" 
                                value={selectedActivityId} 
                                onChange={(e) => setSelectedActivityId(e.target.value)}
                                id="scan-activity-select"
                            >
                                <option value="">-- Select Active Event --</option>
                                {activities.filter((a: any) => a.isActive).map((a: any) => (
                                    <option key={a._id} value={a._id}>{a.name} (+{a.points} pts)</option>
                                ))}
                            </select>
                        </div>

                        {/* Interactive scanning viewport */}
                        <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#0c1520", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--color-admin-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isScanning ? (
                                <>
                                    <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <canvas ref={canvasRef} style={{ display: "none" }} />
                                    
                                    {/* Stylized Scan Box Cutout Overlay */}
                                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                                        <div style={{ width: 180, height: 180, border: "3px solid var(--color-primary)", borderRadius: 16, boxShadow: "0 0 0 9999px rgba(12, 21, 32, 0.6)", position: "relative" }}>
                                            {/* Laser scanning bar */}
                                            <div style={{ position: "absolute", left: 0, width: "100%", height: 3, background: "rgba(192, 36, 76, 0.8)", boxShadow: "0 0 8px var(--color-primary)", top: "10%", animation: "scanLaser 2s linear infinite" }} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "var(--spacing-md)", textAlign: "center" }}>
                                    <Camera size={36} color="var(--color-admin-text-muted)" />
                                    <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)" }}>Camera stream is offline.</p>
                                    <button 
                                        onClick={startCamera} 
                                        className="btn btn-secondary btn-sm"
                                        style={{ background: "var(--color-admin-card)", border: "1px solid var(--color-admin-border)", color: "var(--color-admin-text)" }}
                                    >
                                        Restart Camera
                                    </button>
                                </div>
                            )}
                        </div>

                        {scanError && (
                            <div style={{ display: "flex", gap: 8, background: "#DC262622", border: "1px solid #DC262644", color: "#DC2626", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 12, marginTop: "var(--spacing-md)" }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{scanError}</span>
                            </div>
                        )}

                        {/* Manual entry fallback */}
                        <div style={{ marginTop: "var(--spacing-lg)", borderTop: "1px solid var(--color-admin-border)", paddingTop: "var(--spacing-lg)" }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)", marginBottom: 12 }}>
                                Manual Check-in Fallback
                            </h3>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input 
                                    className="input admin" 
                                    style={{ flex: 1, margin: 0 }}
                                    placeholder="Enter Email, ID, Pass Code, or Name"
                                    value={manualIdentifier}
                                    onChange={(e) => setManualIdentifier(e.target.value)}
                                    id="manual-identifier-input"
                                />
                                <button 
                                    className="btn btn-primary"
                                    style={{ padding: "0 18px", fontWeight: 700 }}
                                    onClick={handleManualVerify}
                                    disabled={manualProcessing || !manualIdentifier.trim() || !selectedActivityId}
                                >
                                    {manualProcessing ? "Checking…" : "Verify"}
                                </button>
                            </div>
                            
                            {manualError && (
                                <div style={{ display: "flex", gap: 8, background: "#DC262622", border: "1px solid #DC262644", color: "#DC2626", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: 12, marginTop: 8 }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                    <span>{manualError}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Bulk CSV Upload Tab */}
                {activeTab === "bulk" && (
                    <div>
                        {!bulkResults ? (
                            <div>
                                <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-md)", lineHeight: 1.5 }}>
                                    Bulk-verify activity completions by selecting the activity and uploading a CSV containing employee emails or full names.
                                </p>

                                <div className="input-group">
                                    <label className="input-label admin">1. Select Activity *</label>
                                    <select 
                                        className="input admin select" 
                                        value={selectedActivityId} 
                                        onChange={(e) => setSelectedActivityId(e.target.value)}
                                        id="bulk-verify-activity-select"
                                    >
                                        <option value="">-- Choose Activity --</option>
                                        {activities.filter((a: any) => a.isActive).map((a: any) => (
                                            <option key={a._id} value={a._id}>{a.name} (+{a.points} pts)</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group" style={{ marginTop: "var(--spacing-md)" }}>
                                    <label className="input-label admin">2. Upload CSV File *</label>
                                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", margin: "-4px 0 10px 0" }}>
                                        CSV format: One email or full name (Firstname Surname) per row.
                                    </div>
                                    <label className="upload-zone" style={{ borderStyle: "dashed", borderColor: "var(--color-admin-border)", background: "var(--color-admin-surface)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "var(--spacing-xl) var(--spacing-md)", cursor: "pointer", borderRadius: "var(--radius-md)" }}>
                                        <Upload size={32} color="var(--color-primary)" />
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-admin-text)" }}>
                                            {csvFile ? csvFile.name : "Select CSV File"}
                                        </span>
                                        <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>
                                            {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : "Click to browse files"}
                                        </span>
                                        <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
                                    </label>
                                </div>

                                {bulkError && (
                                    <div style={{ display: "flex", gap: 8, background: "#DC262622", border: "1px solid #DC262644", color: "#DC2626", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, marginBottom: "var(--spacing-md)", marginTop: "var(--spacing-md)" }}>
                                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                        <span>{bulkError}</span>
                                    </div>
                                )}

                                {parsedRows.length > 0 && (
                                    <div style={{ marginTop: "var(--spacing-md)" }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)", marginBottom: "var(--spacing-xs)" }}>
                                            Preview ({parsedRows.length} entries parsed)
                                        </h3>
                                        <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", background: "var(--color-admin-bg)" }}>
                                            {parsedRows.map((row, i) => (
                                                <div key={i} style={{ padding: "8px 12px", borderBottom: i < parsedRows.length - 1 ? "1px solid var(--color-admin-border)" : "none", fontSize: 12, color: "var(--color-admin-text)" }}>
                                                    {row}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-lg)" }}>
                                    <button 
                                        onClick={() => { setCsvFile(null); setParsedRows([]); setBulkError(""); }} 
                                        disabled={bulkProcessing || parsedRows.length === 0}
                                        style={{ flex: 1, background: "var(--color-admin-surface)", color: "var(--color-admin-text-muted)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer", opacity: parsedRows.length === 0 ? 0.5 : 1 }}
                                    >
                                        Clear
                                    </button>
                                    <button 
                                        onClick={handleBulkVerifySubmit} 
                                        disabled={bulkProcessing || parsedRows.length === 0 || !selectedActivityId}
                                        style={{ flex: 2, background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (parsedRows.length === 0 || !selectedActivityId) ? 0.5 : 1 }}
                                    >
                                        {bulkProcessing ? "Processing…" : `Verify ${parsedRows.length} Completions`}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                                <div style={{ textAlign: "center", padding: "var(--spacing-md) 0" }}>
                                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--color-success)22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-sm)" }}>
                                        <Check size={24} color="var(--color-success)" />
                                    </div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-admin-text)" }}>Bulk Verification Complete</h3>
                                    <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
                                        Successfully processed {bulkResults.length} entries.
                                    </p>
                                </div>

                                <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", background: "var(--color-admin-bg)", marginBottom: "var(--spacing-md)" }}>
                                    {bulkResults.map((r, i) => (
                                        <div key={i} style={{ padding: "10px 12px", borderBottom: i < bulkResults.length - 1 ? "1px solid var(--color-admin-border)" : "none", fontSize: 12 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <div>
                                                    <p style={{ fontWeight: 600, color: r.success ? "var(--color-admin-text)" : "#DC2626" }}>
                                                        {r.success ? r.name : r.identifier}
                                                    </p>
                                                    {r.success && (
                                                        <p style={{ color: "var(--color-admin-text-muted)", fontSize: 11, marginTop: 2 }}>{r.identifier}</p>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: r.success ? "var(--color-success)22" : "#DC262622", color: r.success ? "var(--color-success)" : "#DC2626", fontWeight: 600 }}>
                                                    {r.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => { setBulkResults(null); setSelectedActivityId(""); }} 
                                    style={{ background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer", width: "100%" }}
                                >
                                    Verify More
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Standard Verification review detail modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin">Review Submission</h2>

                        <div className="card admin" style={{ marginBottom: "var(--spacing-md)" }}>
                            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--color-admin-text)", marginBottom: 4 }}>{selected.activity?.name}</p>
                            <p style={{ fontSize: 14, color: "var(--color-admin-text-muted)", marginBottom: 8 }}>{selected.activity?.description}</p>
                            <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
                                <div>
                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Employee</p>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-admin-text)" }}>{selected.user?.firstName} {selected.user?.surname}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Points</p>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>+{selected.activity?.points}</p>
                                </div>
                            </div>
                        </div>

                        {selected.proofUrl && (
                            <img src={selected.proofUrl} alt="Proof" style={{ width: "100%", borderRadius: "var(--radius-md)", marginBottom: "var(--spacing-md)", maxHeight: 200, objectFit: "cover" }} />
                        )}
                        {selected.proofNote && (
                            <div className="card admin" style={{ marginBottom: "var(--spacing-md)" }}>
                                <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", fontWeight: 600, marginBottom: 4 }}>Note from employee:</p>
                                <p style={{ fontSize: 14, color: "var(--color-admin-text)" }}>{selected.proofNote}</p>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label admin">Admin Note (optional)</label>
                            <textarea className="input admin" placeholder="Add a note for the employee..." value={note} onChange={(e) => setNote(e.target.value)} id="admin-note" />
                        </div>

                        <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleVerify(false)} disabled={processing} id="reject-btn">
                                <XCircle size={16} /> Reject
                            </button>
                            <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleVerify(true)} disabled={processing} id="approve-btn">
                                <CheckCircle size={16} /> Approve +{selected.activity?.points}pts
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scan Success Fullscreen Overlay Modal */}
            {scanSuccessModal && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal-sheet admin" style={{ textAlign: "center", background: "var(--color-admin-surface)" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-success)22", display: "flex", alignItems: "center", justifyContent: "center", margin: "var(--spacing-md) auto" }}>
                            <Check size={32} color="var(--color-success)" />
                        </div>
                        <h2 className="modal-title admin" style={{ color: "var(--color-admin-text)" }}>
                            {scanSuccessModal.alreadyVerified ? "Already Verified!" : "Verified Successfully!"}
                        </h2>
                        <p style={{ fontSize: 14, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)" }}>
                            Event check-in credited.
                        </p>

                        <div className="card admin" style={{ border: "1px solid var(--color-admin-border)", marginBottom: "var(--spacing-lg)" }}>
                            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--color-admin-text)", marginBottom: 4 }}>{scanSuccessModal.userName}</p>
                            <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)" }}>{scanSuccessModal.activityName}</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)", marginTop: 12 }}>+{scanSuccessModal.points} PTS Awarded</p>
                        </div>

                        <button 
                            className="btn btn-success btn-full btn-lg" 
                            style={{ background: "var(--color-success)", color: "white", fontWeight: 700 }}
                            onClick={() => {
                                setScanSuccessModal(null);
                                if (activeTab === "scan") {
                                    startCamera();
                                }
                            }}
                            id="scan-next-btn"
                        >
                            Scan Next Pass
                        </button>
                    </div>
                </div>
            )}

            {/* Embedded styles for laser scanning animation */}
            <style jsx global>{`
                @keyframes scanLaser {
                    0% { top: 10%; }
                    50% { top: 90%; }
                    100% { top: 10%; }
                }
            `}</style>

            <AdminBottomNav />
        </div>
    );
}
