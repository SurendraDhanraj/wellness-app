"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AlertCircle, CheckCircle, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const requestRecovery = useAction(api.auth.requestPasswordRecovery);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) {
            setError("Please enter your email address.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await requestRecovery({ email: cleanEmail });
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ background: "var(--color-surface)", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "var(--spacing-xl) var(--spacing-lg)" }}>

                {/* Back button */}
                {!submitted && (
                    <button
                        onClick={() => router.push("/login")}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", alignSelf: "flex-start", marginBottom: "var(--spacing-lg)", padding: 0 }}
                    >
                        <ArrowLeft size={16} /> Back to Login
                    </button>
                )}

                {/* Branded Header */}
                <div style={{ marginBottom: "var(--spacing-xl)", textAlign: "center" }}>
                    <img src="/logo.png" alt="Heritage Petroleum" style={{ height: 60, objectFit: "contain", marginBottom: "var(--spacing-md)", margin: "0 auto" }} />
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)", marginTop: 8 }}>Password Reset Request</h1>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Wellness Tracker Security Portal</p>
                </div>

                {/* Success Screen */}
                {submitted ? (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-success)22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-lg)" }}>
                            <CheckCircle size={40} color="var(--color-success)" />
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "var(--color-text-primary)" }}>Request Submitted!</h2>
                        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "var(--spacing-xl)" }}>
                            Your password reset request has been sent to the admin team. An administrator will reset your password and contact you directly with your new temporary credentials.
                        </p>
                        <div style={{ background: "var(--color-primary)11", border: "1px solid var(--color-primary)33", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: "var(--spacing-xl)", textAlign: "left" }}>
                            <p style={{ fontSize: 13, color: "var(--color-primary)", fontWeight: 600, marginBottom: 4 }}>What happens next?</p>
                            <ol style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                                <li>The admin team reviews your request</li>
                                <li>They set a temporary password for your account</li>
                                <li>They will contact you directly (phone, Teams, or email) with the temp password</li>
                                <li>Log in with the temp password and you'll be prompted to set a new one</li>
                            </ol>
                        </div>
                        <button
                            onClick={() => router.push("/login")}
                            className="btn btn-primary btn-full btn-lg"
                            id="back-to-login-btn"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    /* Request Form */
                    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Forgot Password?</h2>
                        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>
                            Enter your registered email address. Your request will be sent to the admin team who will set a temporary password and contact you directly.
                        </p>

                        {error && (
                            <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--spacing-md)" }}>
                                <AlertCircle size={16} />{error}
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">Email Address</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    className="input"
                                    type="email"
                                    placeholder="you@heritage.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ paddingLeft: 40 }}
                                    id="recovery-email-input"
                                    autoComplete="email"
                                />
                                <Mail size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={loading}
                            id="recovery-submit-btn"
                            style={{ marginTop: "var(--spacing-sm)" }}
                        >
                            {loading ? "Submitting Request…" : "Submit Reset Request"}
                        </button>
                    </form>
                )}
            </div>

            <div style={{ padding: "var(--spacing-md)", textAlign: "center", borderTop: "1px solid var(--color-border)" }}>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>© 2025 Heritage Petroleum Company Limited</p>
            </div>
        </div>
    );
}
