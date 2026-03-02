"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthUser {
    id: string;
    email: string;
    role: "super_admin" | "admin" | "employee";
    isProfileComplete: boolean;
    mustChangePassword: boolean;
    firstName?: string;
    surname?: string;
    token: string;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    loading: boolean;
    updateUser: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch { }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success) {
            const authUser = { ...data.user, token: data.token };
            setUser(authUser);
            localStorage.setItem("heritage_auth", JSON.stringify(authUser));
        }
        return data;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("heritage_auth");
        window.location.href = "/login";
    };

    const updateUser = (data: Partial<AuthUser>) => {
        if (!user) return;
        const updated = { ...user, ...data };
        setUser(updated);
        localStorage.setItem("heritage_auth", JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
