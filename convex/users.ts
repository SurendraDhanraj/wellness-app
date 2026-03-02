import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", args.email)).first();
    },
});

export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

export const getSessionByToken = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", args.token)).first();
    },
});

export const createUser = mutation({
    args: {
        email: v.string(),
        passwordHash: v.string(),
        role: v.union(v.literal("super_admin"), v.literal("admin"), v.literal("employee")),
        isProfileComplete: v.boolean(),
        totalPoints: v.number(),
        mustChangePassword: v.boolean(),
        isActive: v.boolean(),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("users", args);
    },
});

export const createSession = mutation({
    args: {
        userId: v.id("users"),
        token: v.string(),
        expiresAt: v.number(),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("sessions", args);
    },
});

export const updateUserPassword = mutation({
    args: { userId: v.id("users"), passwordHash: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { passwordHash: args.passwordHash, mustChangePassword: false });
    },
});

export const updateUserProfile = mutation({
    args: {
        userId: v.id("users"),
        firstName: v.string(),
        surname: v.string(),
        dateOfBirth: v.string(),
        gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
        height: v.number(),
        heightUnit: v.union(v.literal("cm"), v.literal("ft")),
        businessUnitId: v.id("businessUnits"),
        departmentId: v.id("departments"),
        locationId: v.id("locations"),
        avatarUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId, ...data } = args;
        await ctx.db.patch(userId, { ...data, isProfileComplete: true });
    },
});

export const getAllEmployees = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "employee")).collect();
    },
});

export const getAllAdmins = query({
    args: {},
    handler: async (ctx) => {
        const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
        const superAdmins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "super_admin")).collect();
        return [...admins, ...superAdmins];
    },
});

export const updateUserRole = mutation({
    args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("employee")) },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { role: args.role });
    },
});

export const toggleUserActive = mutation({
    args: { userId: v.id("users"), isActive: v.boolean() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { isActive: args.isActive });
    },
});

export const addPoints = mutation({
    args: { userId: v.id("users"), points: v.number() },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return;
        await ctx.db.patch(args.userId, { totalPoints: user.totalPoints + args.points });
    },
});

export const getLeaderboard = query({
    args: {
        type: v.union(v.literal("points"), v.literal("steps"), v.literal("weight_loss")),
        businessUnitId: v.optional(v.id("businessUnits")),
        departmentId: v.optional(v.id("departments")),
        locationId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        let users = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "employee")).collect();
        if (args.businessUnitId) users = users.filter((u) => u.businessUnitId === args.businessUnitId);
        if (args.departmentId) users = users.filter((u) => u.departmentId === args.departmentId);
        if (args.locationId) users = users.filter((u) => u.locationId === args.locationId);

        if (args.type === "points") {
            return users.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 50);
        }

        // For steps/weight_loss, aggregate from healthMetrics
        const result = [];
        for (const user of users) {
            const metrics = await ctx.db.query("healthMetrics").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
            let value = 0;
            if (args.type === "steps") {
                value = metrics.reduce((sum, m) => sum + (m.steps ?? 0), 0);
            } else {
                const sorted = metrics.filter((m) => m.weight).sort((a, b) => a.createdAt - b.createdAt);
                if (sorted.length >= 2) {
                    value = (sorted[0].weight ?? 0) - (sorted[sorted.length - 1].weight ?? 0);
                }
            }
            result.push({ ...user, leaderboardValue: value });
        }
        return result.sort((a, b) => b.leaderboardValue - a.leaderboardValue).slice(0, 50);
    },
});
