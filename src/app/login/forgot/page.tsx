"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AlertCircle, CheckCircle, Mail, Key, Lock, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Processing & Error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    
    // Developer tool: display generated code in UI for zero-friction local testing!
    const [debugSentCode, setDebugSentCode] = useState("");

    // Recovery token received in Step 2, used in Step 3
    const [recoveryToken, setRecoveryToken] = useState("");
    const [userId, setUserId] = useState("");

    // Actions
    const requestRecovery = useAction(api.auth.requestPasswordRecovery);
    const verifyCode = useAction(api.auth.verifyRecoveryCode);
    const resetPassword = useAction(api.auth.resetPasswordViaRecovery);

    // Step 1: Request Code
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) {
            setError("Please enter your email address.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await requestRecovery({ email: cleanEmail });
            if (res.success) {
                setSuccessMessage(res.message);
                if (res.debugCode) {
                    setDebugSentCode(res.debugCode);
                }
                setStep(2);
            } else {
                setError("An error occurred. Please try again.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to request recovery code.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify Code
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = code.trim();
        if (!cleanCode || cleanCode.length !== 6) {
            setError("Please enter a valid 6-digit code.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await verifyCode({
                email: email.trim().toLowerCase(),
                code: cleanCode,
            });
            if (res.success && res.recoveryToken && res.userId) {
                setRecoveryToken(res.recoveryToken);
                setUserId(res.userId);
                setStep(3);
                setError("");
                setSuccessMessage("");
            } else {
                setError(res.error || "Invalid or expired code.");
            }
        } catch (err: any) {
            setError(err.message || "Verification failed.");
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Complete Password Reset
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            setError("Please fill out all fields.");
            return;
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await resetPassword({
                userId: userId as any,
                recoveryToken,
                newPassword: newPassword.trim(),
            });
            if (res.success) {
                setStep(3); // keep on 3 but set success flag to show dialog
                setSuccessMessage("Your password has been successfully reset!");
            } else {
                setError(res.error || "Password reset failed.");
            }
        } catch (err: any) {
            setError(err.message || "Reset request failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ background: "var(--color-surface)", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "var(--spacing-xl) var(--spacing-lg)" }}>
                
                {/* Back button (only shown if reset is not complete) */}
                {successMessage !== "Your password has been successfully reset!" && (
                    <button 
                        onClick={() => {
                            if (step === 1) router.push("/login");
                            else if (step === 2) { setStep(1); setDebugSentCode(""); }
                            else if (step === 3) setStep(2);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", alignSelf: "flex-start", marginBottom: "var(--spacing-lg)", padding: 0 }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                )}

                {/* Branded Header */}
                <div style={{ marginBottom: "var(--spacing-xl)", textAlign: "center" }}>
                    <img src="/logo.png" alt="Heritage Petroleum" style={{ height: 60, objectFit: "contain", marginBottom: "var(--spacing-md)", margin: "0 auto" }} />
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)", marginTop: 8 }}>Password Recovery</h1>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Wellness Tracker Security Portal</p>
                </div>

                {error && (
                    <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--spacing-md)" }}>
                        <AlertCircle size={16} />{error}
                    </div>
                )}

                {/* STEP 1: Enter Email */}
                {step === 1 && (
                    <form onSubmit={handleRequestCode} style={{ width: "100%" }}>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Forgot Password</h2>
                        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-lg)" }}>
                            Enter your email address to receive a secure 6-digit verification code.
                        </p>

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
                                />
                                <Mail size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={loading}
                            id="recovery-submit-step1"
                            style={{ marginTop: "var(--spacing-sm)" }}
                        >
                            {loading ? "Requesting Code…" : "Send Verification Code"}
                        </button>
                    </form>
                )}

                {/* STEP 2: Enter 6-digit Verification Code */}
                {step === 2 && (
                    <form onSubmit={handleVerifyCode} style={{ width: "100%" }}>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Enter Verification Code</h2>
                        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-lg)" }}>
                            A 6-digit code was sent to **{email}**. Enter it below to unlock password resetting.
                        </p>

                        {/* Developer Debug Banner Pop-up */}
                        {debugSentCode && (
                            <div style={{ background: "#EEF2F6", border: "1px solid var(--color-primary-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", marginBottom: "var(--spacing-md)" }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: 0.5 }}>🔧 Developer Testing Mode</p>
                                <p style={{ fontSize: 13, color: "var(--color-text-primary)", marginTop: 4 }}>
                                    Mock email generated. Your code is: <strong style={{ fontSize: 14, color: "var(--color-primary)", fontFamily: "monospace" }}>{debugSentCode}</strong>
                                </p>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">6-Digit Code</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    className="input"
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                    style={{ paddingLeft: 40, letterSpacing: 2, fontWeight: 700, fontSize: 16 }}
                                    id="recovery-code-input"
                                />
                                <Key size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={loading}
                            id="recovery-submit-step2"
                            style={{ marginTop: "var(--spacing-sm)" }}
                        >
                            {loading ? "Verifying…" : "Verify Code"}
                        </button>
                    </form>
                )}

                {/* STEP 3: Enter New Password OR Reset Successful Modal */}
                {step === 3 && (
                    successMessage === "Your password has been successfully reset!" ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-success)22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                                <CheckCircle size={36} color="var(--color-success)" />
                            </div>
                            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--color-text-primary)" }}>Reset Complete!</h2>
                            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xl)", lineHeight: 1.5 }}>
                                Your password has been successfully updated. You can now sign in with your new credentials.
                            </p>
                            
                            <button
                                onClick={() => router.push("/login")}
                                className="btn btn-primary btn-full btn-lg"
                                id="recovery-back-to-login"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleResetPassword} style={{ width: "100%" }}>
                            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Create New Password</h2>
                            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-lg)" }}>
                                Enter a new, secure password for your account.
                            </p>

                            <div className="input-group">
                                <label className="input-label">New Password</label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        className="input"
                                        type="password"
                                        placeholder="Min 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        style={{ paddingLeft: 40 }}
                                        id="recovery-new-pw-input"
                                    />
                                    <Lock size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Confirm New Password</label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        className="input"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        style={{ paddingLeft: 40 }}
                                        id="recovery-confirm-pw-input"
                                    />
                                    <Lock size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-full btn-lg"
                                disabled={loading}
                                id="recovery-submit-step3"
                                style={{ marginTop: "var(--spacing-sm)" }}
                            >
                                {loading ? "Updating Password…" : "Reset Password"}
                            </button>
                        </form>
                    )
                )}

            </div>
            
            <div style={{ padding: "var(--spacing-md)", textAlign: "center", borderTop: "1px solid var(--color-border)" }}>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>© 2025 Heritage Petroleum Company Limited</p>
            </div>
        </div>
    );
}
