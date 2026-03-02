"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check } from "lucide-react";

export default function SetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const checks = [
        { label: "At least 8 characters", pass: password.length >= 8 },
        { label: "Contains uppercase letter", pass: /[A-Z]/.test(password) },
        { label: "Contains a number", pass: /\d/.test(password) },
    ];
    const valid = checks.every((c) => c.pass) && password === confirm;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        setLoading(true);
        setError("");
        try {
            const stored = localStorage.getItem("heritage_auth");
            if (!stored) { router.push("/login"); return; }
            const auth = JSON.parse(stored);
            const res = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: auth.token, newPassword: password }),
            });
            const data = await res.json();
            if (data.success) {
                auth.mustChangePassword = false;
                localStorage.setItem("heritage_auth", JSON.stringify(auth));
                if (!auth.isProfileComplete) router.push("/profile-setup");
                else router.push("/dashboard");
            } else setError(data.error || "Failed to set password.");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ background: "var(--color-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--spacing-xl) var(--spacing-lg)", minHeight: "100dvh" }}>
            <img src="/logo.png" alt="Heritage" style={{ height: 60, objectFit: "contain", marginBottom: "var(--spacing-xl)" }} />
            <div style={{ width: "100%" }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Create Password</h1>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xl)" }}>Set your permanent account password</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">New Password</label>
                        <div style={{ position: "relative" }}>
                            <input className="input" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" style={{ paddingRight: 48 }} id="new-password" />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Password checks */}
                    <div style={{ marginBottom: "var(--spacing-md)", display: "flex", flexDirection: "column", gap: 6 }}>
                        {checks.map((c) => (
                            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: c.pass ? "var(--color-success)" : "var(--color-text-muted)" }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.pass ? "var(--color-success-light)" : "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {c.pass && <Check size={11} color="var(--color-success)" strokeWidth={3} />}
                                </div>
                                {c.label}
                            </div>
                        ))}
                    </div>

                    <div className="input-group">
                        <label className="input-label">Confirm Password</label>
                        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" id="confirm-password"
                            style={{ borderColor: confirm && confirm !== password ? "var(--color-error)" : undefined }} />
                        {confirm && confirm !== password && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4 }}>Passwords do not match</p>}
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={!valid || loading} id="set-password-submit" style={{ marginTop: "var(--spacing-sm)" }}>
                        {loading ? "Saving..." : "Set Password & Continue →"}
                    </button>
                </form>
            </div>
        </div>
    );
}
