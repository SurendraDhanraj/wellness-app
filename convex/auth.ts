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
    returns: v.any(),
    handler: async (ctx, args): Promise<{ success: boolean; error?: string; token?: string; user?: object }> => {
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

export const batchInviteEmployees = action({
    args: {
        adminToken: v.string(),
        employees: v.array(
            v.object({
                email: v.string(),
                firstName: v.optional(v.string()),
                surname: v.optional(v.string()),
                gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
                dateOfBirth: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const adminSession = await ctx.runQuery(api.users.getSessionByToken, { token: args.adminToken });
        if (!adminSession) return { success: false, error: "Unauthorized" };
        const admin = await ctx.runQuery(api.users.getUserById, { userId: adminSession.userId });
        if (!admin || (admin.role !== "admin" && admin.role !== "super_admin")) {
            return { success: false, error: "Unauthorized" };
        }

        const results = [];
        for (const emp of args.employees) {
            const trimmedEmail = emp.email.trim().toLowerCase();
            if (!trimmedEmail) continue;

            const existing = await ctx.runQuery(api.users.getUserByEmail, { email: trimmedEmail });
            if (existing) {
                results.push({
                    email: trimmedEmail,
                    success: false,
                    error: "Email already registered",
                });
                continue;
            }

            // Create employee with clean 6-char alpha-numeric uppercase temporary password
            const tempPassword = crypto.randomBytes(3).toString("hex").toUpperCase();
            const hash = hashPassword(tempPassword);
            await ctx.runMutation(api.users.createUser, {
                email: trimmedEmail,
                passwordHash: hash,
                role: "employee",
                isProfileComplete: false,
                totalPoints: 0,
                mustChangePassword: true,
                isActive: true,
                createdAt: Date.now(),
                firstName: emp.firstName?.trim() || undefined,
                surname: emp.surname?.trim() || undefined,
                gender: emp.gender || undefined,
                dateOfBirth: emp.dateOfBirth?.trim() || undefined,
            });

            results.push({
                email: trimmedEmail,
                firstName: emp.firstName?.trim(),
                surname: emp.surname?.trim(),
                tempPassword,
                success: true,
            });
        }

        return { success: true, results };
    },
});

export const adminResetUserPassword = action({
    args: {
        userId: v.id("users"),
        newPassword: v.string(),
        mustChangePassword: v.boolean(),
        adminToken: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const adminSession = await ctx.runQuery(api.users.getSessionByToken, { token: args.adminToken });
        if (!adminSession) return { success: false, error: "Unauthorized" };

        const admin = await ctx.runQuery(api.users.getUserById, { userId: adminSession.userId });
        if (!admin || (admin.role !== "admin" && admin.role !== "super_admin")) {
            return { success: false, error: "Unauthorized" };
        }

        const hash = hashPassword(args.newPassword);
        await ctx.runMutation(api.users.adminSetUserPassword, {
            userId: args.userId,
            passwordHash: hash,
            mustChangePassword: args.mustChangePassword,
        });

        return { success: true };
    },
});

export const requestPasswordRecovery = action({
    args: { email: v.string() },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const cleanEmail = args.email.trim().toLowerCase();
        const user = await ctx.runQuery(api.users.getUserByEmail, { email: cleanEmail });

        // Always return success to prevent email enumeration
        if (!user) {
            return { success: true, message: "If this email is registered, your request has been submitted." };
        }

        if (!user.isActive) {
            return { success: true, message: "If this email is registered, your request has been submitted." };
        }

        // Store the request in the DB for admin review
        await ctx.runMutation(api.users.createPasswordResetRequest, {
            userId: user._id,
            email: cleanEmail,
            firstName: user.firstName,
            surname: user.surname,
        });

        return {
            success: true,
            message: "Your request has been submitted. An administrator will reset your password and contact you shortly.",
        };
    },
});

export const verifyRecoveryCode = action({
    args: { email: v.string(), code: v.string() },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const cleanEmail = args.email.trim().toLowerCase();
        const user = await ctx.runQuery(api.users.getUserByEmail, { email: cleanEmail });
        if (!user || !user.recoveryCode || !user.recoveryCodeExpires || user.recoveryCodeExpires < Date.now()) {
            return { success: false, error: "Invalid or expired verification code." };
        }

        if (user.recoveryCode !== args.code.trim()) {
            return { success: false, error: "Invalid or expired verification code." };
        }

        // Create short-lived recovery token
        const token = crypto.randomBytes(16).toString("hex");
        const tokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await ctx.runMutation(api.users.setUserRecoveryToken, {
            userId: user._id,
            recoveryToken: token,
            recoveryTokenExpires: tokenExpires,
        });

        return { success: true, recoveryToken: token, userId: user._id };
    },
});

export const resetPasswordViaRecovery = action({
    args: {
        userId: v.id("users"),
        recoveryToken: v.string(),
        newPassword: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
        if (!user || user.recoveryToken !== args.recoveryToken || !user.recoveryTokenExpires || user.recoveryTokenExpires < Date.now()) {
            return { success: false, error: "Invalid or expired password reset session." };
        }

        const hash = hashPassword(args.newPassword);
        await ctx.runMutation(api.users.completeUserPasswordReset, {
            userId: args.userId,
            passwordHash: hash,
        });

        return { success: true };
    },
});
