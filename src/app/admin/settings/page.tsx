"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, ChevronRight, Users, Settings, ClipboardList, Database } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";

export default function AdminSettingsPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        const a = JSON.parse(stored);
        if (a.role === "employee") { router.replace("/dashboard"); return; }
        setAuth(a);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("heritage_auth");
        router.replace("/login");
    };

    if (!auth) return null;

    const initials = `${(auth.firstName || auth.email?.[0] || "A")[0]}`.toUpperCase();

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <div style={{ width: 24 }} />
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Settings</h1>
                <div style={{ width: 24 }} />
            </header>

            <main className="admin-content">
                {/* Admin avatar card */}
                <div className="card admin" style={{ textAlign: "center", padding: "var(--spacing-xl)", marginBottom: "var(--spacing-md)" }}>
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)", fontSize: 26, fontWeight: 700, color: "white" }}>
                        {initials}
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-admin-text)" }}>
                        {auth.firstName ? `${auth.firstName} ${auth.surname}` : auth.email}
                    </h2>
                    <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginTop: 4 }}>{auth.email}</p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "var(--spacing-sm)", background: "var(--color-primary)22", color: "var(--color-primary)", borderRadius: "var(--radius-full)", padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                        <Shield size={12} /> {auth.role === "super_admin" ? "Super Admin" : "Administrator"}
                    </div>
                </div>

                {/* Quick links */}
                <h2 className="section-title admin" style={{ marginBottom: "var(--spacing-sm)" }}>Administration</h2>
                {[
                    { label: "Verify Submissions", icon: ClipboardList, href: "/admin/verify" },
                    { label: "Manage Activities", icon: Settings, href: "/admin/manage" },
                    { label: "Configuration", icon: Database, href: "/admin/config" },
                    ...(auth.role === "super_admin" ? [{ label: "Manage Admins", icon: Users, href: "/admin/admins" }] : []),
                ].map(({ label, icon: Icon, href }) => (
                    <div key={href} className="list-item admin" style={{ cursor: "pointer" }} onClick={() => router.push(href)}>
                        <div className="icon-wrap admin"><Icon size={18} /></div>
                        <div className="list-item-content"><p className="list-item-title admin">{label}</p></div>
                        <ChevronRight size={16} color="var(--color-admin-text-muted)" />
                    </div>
                ))}

                {/* Sign out */}
                <div style={{ marginTop: "var(--spacing-xl)" }}>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        id="admin-logout-btn"
                        style={{ width: "100%", background: "#DC262611", color: "#DC2626", border: "1px solid #DC262633", fontWeight: 700, borderRadius: "var(--radius-lg)", padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontSize: 15 }}
                    >
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </main>

            {/* Confirm modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DC262622", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                            <LogOut size={24} color="#DC2626" />
                        </div>
                        <h2 className="modal-title admin">Sign Out?</h2>
                        <p style={{ fontSize: 14, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-xl)" }}>
                            You will be returned to the login screen.
                        </p>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button onClick={() => setShowLogoutConfirm(false)} id="cancel-admin-logout-btn"
                                style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}>
                                Cancel
                            </button>
                            <button onClick={handleLogout} id="confirm-admin-logout-btn"
                                style={{ flex: 1, background: "#DC2626", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
