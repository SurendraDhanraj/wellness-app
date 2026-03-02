"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Global header strip — row 1 of every page.
 * Shows: Heritage logo (left) | live date & time (right)
 * Hidden on full-screen auth/onboarding pages.
 */
export function GlobalHeader() {
    const path = usePathname();
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    // Hide on pages that are full-screen (login, set-password, profile-setup)
    const hide =
        path === "/login" ||
        path === "/set-password" ||
        path?.startsWith("/profile-setup");

    if (hide) return null;

    const isAdmin = path?.startsWith("/admin");

    const formatted = now
        ? {
            date: now.toLocaleDateString("en-TT", {
                weekday: "short",
                month: "short",
                day: "numeric",
            }),
            time: now.toLocaleTimeString("en-TT", {
                hour: "2-digit",
                minute: "2-digit",
            }),
        }
        : { date: "", time: "" };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: 430,
                height: "var(--global-header-height)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: 16,
                paddingRight: 16,
                zIndex: 200,
                background: isAdmin
                    ? "var(--color-admin-surface)"
                    : "var(--color-surface)",
                borderBottom: isAdmin
                    ? "1px solid var(--color-admin-border)"
                    : "1px solid var(--color-border)",
            }}
        >
            {/* Logo */}
            <Image
                src="/logo.png"
                alt="Heritage Petroleum"
                width={90}
                height={30}
                style={{ objectFit: "contain", objectPosition: "left center" }}
                priority
            />

            {/* Date & Time */}
            <div style={{ textAlign: "right" }}>
                <p
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isAdmin
                            ? "var(--color-admin-text)"
                            : "var(--color-text-primary)",
                        lineHeight: 1.2,
                    }}
                >
                    {formatted.time}
                </p>
                <p
                    style={{
                        fontSize: 10,
                        color: isAdmin
                            ? "var(--color-admin-text-muted)"
                            : "var(--color-text-secondary)",
                        lineHeight: 1.2,
                    }}
                >
                    {formatted.date}
                </p>
            </div>
        </div>
    );
}
