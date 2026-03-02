"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (stored) {
            const auth = JSON.parse(stored);
            if (auth.role === "employee") router.replace("/dashboard");
            else router.replace("/admin/dashboard");
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { setError("Please enter your email and password."); return; }
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.success) {
                const authUser = { ...data.user, token: data.token };
                localStorage.setItem("heritage_auth", JSON.stringify(authUser));
                if (data.user.mustChangePassword) { router.push("/set-password"); return; }
                if (data.user.role === "employee") {
                    if (!data.user.isProfileComplete) { router.push("/profile-setup"); return; }
                    router.push("/dashboard");
                } else {
                    router.push("/admin/dashboard");
                }
            } else {
                setError(data.error || "Login failed. Please try again.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ background: "var(--color-surface)", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--spacing-xl) var(--spacing-lg)" }}>
                {/* Logo */}
                <div style={{ marginBottom: "var(--spacing-2xl)", textAlign: "center" }}>
                    <img src="/logo.png" alt="Heritage Petroleum" style={{ height: 80, objectFit: "contain", marginBottom: "var(--spacing-md)" }} />
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-primary)" }}>Wellness Tracker</h1>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Heritage Petroleum Company Limited</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ width: "100%" }}>
                    <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Welcome back</h2>
                    <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-lg)" }}>Sign in to your account</p>

                    {error && (
                        <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <AlertCircle size={16} />{error}
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <input
                            className="input"
                            type="email"
                            placeholder="you@heritage.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            id="login-email"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: "relative" }}>
                            <input
                                className="input"
                                type={showPw ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingRight: 48 }}
                                autoComplete="current-password"
                                id="login-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}
                            >
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        disabled={loading}
                        id="login-submit"
                        style={{ marginTop: "var(--spacing-sm)" }}
                    >
                        {loading ? <span className="animate-spin" style={{ display: "inline-block", width: 20, height: 20, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%" }} /> : "Sign In"}
                    </button>
                </form>
            </div>

            <div style={{ padding: "var(--spacing-md)", textAlign: "center", borderTop: "1px solid var(--color-border)" }}>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>© 2025 Heritage Petroleum Company Limited</p>
            </div>
        </div>
    );
}
