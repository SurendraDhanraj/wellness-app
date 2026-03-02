"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { LogOut, User, Shield, Mail, Phone, Calendar, Building2, ChevronRight } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";

export default function ProfilePage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("heritage_auth");
        router.replace("/login");
    };

    // Live data from Convex
    const liveUser = useQuery(api.users.getUserById, auth ? { userId: auth.id } : "skip");
    const leaderboard = useQuery(api.users.getLeaderboard, { type: "points" }) || [];

    // Compute rank (1-based position in leaderboard)
    const rank = leaderboard.findIndex((u: any) => u._id === auth?.id);
    const displayRank = rank >= 0 ? rank + 1 : null;
    const totalPoints = liveUser?.totalPoints ?? auth?.totalPoints ?? 0;

    if (!auth) return null;

    const initials = `${(auth.firstName || "?")[0]}${(auth.surname || "?")[0]}`.toUpperCase();

    return (
        <div className="app-container">
            <header className="top-bar">
                <div style={{ width: 24 }} />
                <h1 className="top-bar-title">My Profile</h1>
                <div style={{ width: 24 }} />
            </header>

            <main className="page-content">
                {/* Avatar card */}
                <div className="card" style={{ textAlign: "center", padding: "var(--spacing-xl)", marginBottom: "var(--spacing-md)" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)", fontSize: 28, fontWeight: 700, color: "white" }}>
                        {initials}
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {auth.firstName} {auth.surname}
                    </h2>
                    <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>{auth.email}</p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "var(--spacing-sm)", background: "var(--color-primary-light)", color: "var(--color-primary)", borderRadius: "var(--radius-full)", padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                        <Shield size={12} /> Employee
                    </div>
                </div>

                {/* Points summary — live from Convex */}
                <div className="card-grid-2" style={{ marginBottom: "var(--spacing-md)" }}>
                    <div className="card" style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 28, fontWeight: 800, color: "var(--color-primary)" }}>{totalPoints}</p>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Total Points</p>
                    </div>
                    <div className="card" style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 28, fontWeight: 800, color: "var(--color-secondary)" }}>#{displayRank ?? "—"}</p>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Leaderboard Rank</p>
                    </div>
                </div>

                {/* Quick links */}
                <h2 className="section-title" style={{ marginBottom: "var(--spacing-sm)" }}>Account</h2>
                {[
                    { label: "Edit Profile", icon: User, href: "/profile-setup" },
                    { label: "Notifications", icon: Mail, href: "/notifications" },
                    { label: "Health Tracker", icon: Phone, href: "/health" },
                    { label: "Help & Support", icon: Calendar, href: "/support" },
                    { label: "Rewards", icon: Building2, href: "/rewards" },
                ].map(({ label, icon: Icon, href }) => (
                    <div key={href} className="list-item" style={{ cursor: "pointer" }} onClick={() => router.push(href)}>
                        <div className="icon-wrap"><Icon size={18} /></div>
                        <div className="list-item-content"><p className="list-item-title">{label}</p></div>
                        <ChevronRight size={16} color="var(--color-text-muted)" />
                    </div>
                ))}

                {/* Log out */}
                <div style={{ marginTop: "var(--spacing-xl)" }}>
                    <button
                        className="btn btn-full"
                        onClick={() => setShowLogoutConfirm(true)}
                        id="logout-btn"
                        style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA", fontWeight: 700, borderRadius: "var(--radius-lg)", padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", cursor: "pointer", fontSize: 15 }}
                    >
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </main>

            {/* Logout confirm modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                            <LogOut size={24} color="#DC2626" />
                        </div>
                        <h2 className="modal-title">Sign Out?</h2>
                        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xl)" }}>
                            You will be returned to the login screen.
                        </p>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLogoutConfirm(false)} id="cancel-logout-btn">Cancel</button>
                            <button
                                className="btn"
                                style={{ flex: 1, background: "#DC2626", color: "white", fontWeight: 700 }}
                                onClick={handleLogout}
                                id="confirm-logout-btn"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EmployeeBottomNav />
        </div>
    );
}
