"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Bell, CheckCheck } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

export default function NotificationsPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const notifications = useQuery(api.badges.getNotifications, auth ? { userId: auth.id } : "skip") || [];
    const markRead = useMutation(api.badges.markNotificationRead);

    const typeIcon: Record<string, string> = { verification: "✅", badge: "🏅", reminder: "🔔", community: "💬" };

    return (
        <div className="app-container">
            <header className="top-bar">
                <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>←</button>
                <h1 className="top-bar-title">Notifications</h1>
                <CheckCheck size={20} color="var(--color-primary)" style={{ cursor: "pointer" }} onClick={async () => {
                    for (const n of notifications.filter((n: any) => !n.isRead)) {
                        await markRead({ notificationId: n._id });
                    }
                }} />
            </header>

            <main className="page-content">
                {notifications.length === 0 && (
                    <div className="empty-state">
                        <Bell size={48} className="empty-state-icon" />
                        <p className="empty-state-title">All caught up!</p>
                        <p className="empty-state-body">You have no notifications right now.</p>
                    </div>
                )}
                {notifications.map((n: any) => (
                    <div key={n._id} onClick={() => !n.isRead && markRead({ notificationId: n._id })}
                        style={{ display: "flex", gap: "var(--spacing-md)", padding: "var(--spacing-md)", borderRadius: "var(--radius-lg)", marginBottom: "var(--spacing-sm)", background: n.isRead ? "var(--color-surface)" : "var(--color-primary-light)", border: `1px solid ${n.isRead ? "var(--color-border)" : "var(--color-primary)"}22`, cursor: n.isRead ? "default" : "pointer", transition: "background var(--transition-fast)" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: n.isRead ? "var(--color-employee-bg)" : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                            {typeIcon[n.type] || "🔔"}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>{n.title}</p>
                            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2, lineHeight: 1.4 }}>{n.body}</p>
                            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{format(new Date(n.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                        {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", flexShrink: 0, marginTop: 6 }} />}
                    </div>
                ))}
            </main>

            <EmployeeBottomNav />
        </div>
    );
}
