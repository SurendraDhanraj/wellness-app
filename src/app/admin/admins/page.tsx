"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, UserCheck, UserX, Shield, User } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";

export default function AdminAdminsPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState<any>(null);
    const updateRole = useMutation(api.users.updateUserRole);
    const toggleActive = useMutation(api.users.toggleUserActive);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        const a = JSON.parse(stored);
        if (a.role !== "super_admin") { router.replace("/admin/dashboard"); return; }
        setAuth(a);
    }, [router]);

    const admins = useQuery(api.users.getAllAdmins) || [];

    const handleInvite = async () => {
        if (!auth || !inviteEmail.trim()) return;
        setInviting(true);
        try {
            const res = await fetch("/api/auth/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail.trim(), adminToken: auth.token }),
            });
            const data = await res.json();
            setInviteResult(data);
            if (data.success) setInviteEmail("");
        } finally { setInviting(false); }
    };

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Administrators</h1>
                <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)} id="invite-admin-btn"><Plus size={16} /> Invite</button>
            </header>

            <main className="admin-content">
                <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-md)" }}>Manage administrator accounts. Only Super Admins can access this section.</p>

                {admins.map((a: any) => (
                    <div key={a._id} className="list-item admin" id={`admin-${a._id}`}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: a.role === "super_admin" ? "var(--color-primary)22" : "var(--color-admin-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {a.role === "super_admin" ? <Shield size={20} color="var(--color-primary)" /> : <User size={20} color="var(--color-admin-text-muted)" />}
                        </div>
                        <div className="list-item-content">
                            <p className="list-item-title admin">{a.firstName ? `${a.firstName} ${a.surname}` : a.email}</p>
                            <p className="list-item-subtitle admin">{a.email}</p>
                            <span className={`badge ${a.role === "super_admin" ? "badge-primary" : "badge-secondary"}`}>{a.role === "super_admin" ? "Super Admin" : "Admin"}</span>
                        </div>
                        {a._id !== auth?.id && (
                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                <button onClick={() => toggleActive({ userId: a._id, isActive: !a.isActive })} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }} id={`toggle-admin-${a._id}`}>
                                    {a.isActive ? <UserCheck size={18} color="var(--color-success)" /> : <UserX size={18} color="var(--color-error)" />}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </main>

            {showInvite && (
                <div className="modal-overlay" onClick={() => { setShowInvite(false); setInviteResult(null); }}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin">Invite Employee</h2>
                        <p style={{ fontSize: 14, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-lg)" }}>Enter the employee's email. They will receive a temporary password to set their account.</p>
                        {inviteResult?.success && (
                            <div className="alert alert-success">
                                <p>✅ Invitation created!</p>
                                <p style={{ marginTop: 4, fontSize: 13 }}>Temporary password: <strong style={{ fontFamily: "monospace" }}>{inviteResult.tempPassword}</strong></p>
                                <p style={{ marginTop: 4, fontSize: 12 }}>Share this securely with the employee.</p>
                            </div>
                        )}
                        {inviteResult?.error && <div className="alert alert-error">{inviteResult.error}</div>}
                        <div className="input-group">
                            <label className="input-label admin">Email Address</label>
                            <input className="input admin" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="employee@heritage.com" id="invite-email" />
                        </div>
                        <button className="btn btn-primary btn-full btn-lg" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} id="send-invite-btn">{inviting ? "Creating…" : "Create Account"}</button>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
