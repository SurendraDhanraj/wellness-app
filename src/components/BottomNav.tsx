"use client";
import { useRouter, usePathname } from "next/navigation";
import { Home, Trophy, Activity, User, Users, Settings } from "lucide-react";

const employeeNav = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/activities", icon: Activity, label: "Activities" },
    { href: "/profile", icon: User, label: "Profile" },
];

const adminNav = [
    { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
    { href: "/admin/verify", icon: Activity, label: "Verify" },
    { href: "/admin/manage", icon: Users, label: "Manage" },
    { href: "/admin/admins", icon: User, label: "Admins" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function EmployeeBottomNav() {
    const router = useRouter();
    const path = usePathname();
    return (
        <nav className="bottom-nav">
            {employeeNav.map(({ href, icon: Icon, label }) => {
                const active = path === href || path.startsWith(href + "/");
                return (
                    <button key={href} className={`nav-item ${active ? "active" : ""}`} onClick={() => router.push(href)} id={`nav-${label.toLowerCase()}`}>
                        <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                        <span>{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

export function AdminBottomNav() {
    const router = useRouter();
    const path = usePathname();
    return (
        <nav className="bottom-nav admin">
            {adminNav.map(({ href, icon: Icon, label }) => {
                const active = path === href || path.startsWith(href + "/");
                return (
                    <button key={href} className={`nav-item admin-nav ${active ? "active" : ""}`} onClick={() => router.push(href)} id={`admin-nav-${label.toLowerCase()}`}>
                        <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                        <span>{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
