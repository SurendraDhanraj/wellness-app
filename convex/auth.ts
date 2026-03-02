"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import * as crypto from "crypto";

// Simple hash using SHA-256 (no bcrypt needed for local dev)
function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password + "heritage_salt_2024").digest("hex");
}

export const createInitialSuperAdmin = action({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.runQuery(api.users.getUserByEmail, { email: args.email });
        if (existing) return { success: false, error: "Email already registered" };
        const hash = hashPassword(args.password);
        await ctx.runMutation(api.users.createUser, {
            email: args.email,
            passwordHash: hash,
            role: "super_admin",
            isProfileComplete: true,
            totalPoints: 0,
            mustChangePassword: false,
            isActive: true,
            createdAt: Date.now(),
        });
        return { success: true };
    },
});

export const login = action({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.runQuery(api.users.getUserByEmail, { email: args.email });
        if (!user) return { success: false, error: "Invalid credentials" };
        if (!user.isActive) return { success: false, error: "Account is deactivated" };
        const hash = hashPassword(args.password);
        if (hash !== user.passwordHash) return { success: false, error: "Invalid credentials" };
        // Create session token
        const token = crypto.randomBytes(32).toString("hex");
        await ctx.runMutation(api.users.createSession, {
            userId: user._id,
            token,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            createdAt: Date.now(),
        });
        return {
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isProfileComplete: user.isProfileComplete,
                mustChangePassword: user.mustChangePassword,
                firstName: user.firstName,
                surname: user.surname,
            },
        };
    },
});

export const setPassword = action({
    args: { token: v.string(), newPassword: v.string() },
    handler: async (ctx, args) => {
        const session = await ctx.runQuery(api.users.getSessionByToken, { token: args.token });
        if (!session || session.expiresAt < Date.now()) {
            return { success: false, error: "Invalid or expired session" };
        }
        const hash = hashPassword(args.newPassword);
        await ctx.runMutation(api.users.updateUserPassword, {
            userId: session.userId,
            passwordHash: hash,
        });
        return { success: true };
    },
});

export const inviteEmployee = action({
    args: { email: v.string(), adminToken: v.string() },
    handler: async (ctx, args) => {
        const adminSession = await ctx.runQuery(api.users.getSessionByToken, { token: args.adminToken });
        if (!adminSession) return { success: false, error: "Unauthorized" };
        const admin = await ctx.runQuery(api.users.getUserById, { userId: adminSession.userId });
        if (!admin || (admin.role !== "admin" && admin.role !== "super_admin")) {
            return { success: false, error: "Unauthorized" };
        }
        const existing = await ctx.runQuery(api.users.getUserByEmail, { email: args.email });
        if (existing) return { success: false, error: "Email already registered" };
        // Create employee with temporary password
        const tempPassword = crypto.randomBytes(8).toString("hex");
        const hash = hashPassword(tempPassword);
        await ctx.runMutation(api.users.createUser, {
            email: args.email,
            passwordHash: hash,
            role: "employee",
            isProfileComplete: false,
            totalPoints: 0,
            mustChangePassword: true,
            isActive: true,
            createdAt: Date.now(),
        });
        return { success: true, tempPassword };
    },
});
