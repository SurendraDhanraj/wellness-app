import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getActivities = query({
    args: { category: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.category && args.category !== "all") {
            return ctx.db.query("activities")
                .withIndex("by_category", (q) => q.eq("category", args.category as any))
                .filter((q) => q.eq(q.field("isActive"), true))
                .collect();
        }
        return ctx.db.query("activities").filter((q) => q.eq(q.field("isActive"), true)).collect();
    },
});

export const getAllActivitiesAdmin = query({
    args: {},
    handler: async (ctx) => ctx.db.query("activities").collect(),
});

export const createActivity = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        category: v.union(v.literal("physical"), v.literal("social"), v.literal("financial"), v.literal("emotional")),
        points: v.number(),
        durationDays: v.optional(v.number()),
        icon: v.optional(v.string()),
        createdBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        return ctx.db.insert("activities", { ...args, isActive: true, createdAt: Date.now() });
    },
});

export const updateActivity = mutation({
    args: {
        id: v.id("activities"),
        name: v.string(),
        description: v.string(),
        category: v.union(v.literal("physical"), v.literal("social"), v.literal("financial"), v.literal("emotional")),
        points: v.number(),
        durationDays: v.optional(v.number()),
        icon: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const toggleActivity = mutation({
    args: { id: v.id("activities"), isActive: v.boolean() },
    handler: async (ctx, args) => ctx.db.patch(args.id, { isActive: args.isActive }),
});

export const getEnrollments = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const enrollments = await ctx.db.query("enrollments").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
        const result = [];
        for (const e of enrollments) {
            const activity = await ctx.db.get(e.activityId);
            result.push({ ...e, activity });
        }
        return result;
    },
});

export const getEnrollmentById = query({
    args: { enrollmentId: v.id("enrollments") },
    handler: async (ctx, args) => {
        const enrollment = await ctx.db.get(args.enrollmentId);
        if (!enrollment) return null;
        const activity = await ctx.db.get(enrollment.activityId);
        return { ...enrollment, activity };
    },
});

export const getPendingVerifications = query({
    args: {},
    handler: async (ctx) => {
        const pending = await ctx.db.query("enrollments").withIndex("by_status", (q) => q.eq("status", "pending_verification")).collect();
        const result = [];
        for (const e of pending) {
            const user = await ctx.db.get(e.userId);
            const activity = await ctx.db.get(e.activityId);
            result.push({ ...e, user, activity });
        }
        return result;
    },
});

export const enrollInActivity = mutation({
    args: { userId: v.id("users"), activityId: v.id("activities") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("enrollments")
            .withIndex("by_user_activity", (q) => q.eq("userId", args.userId).eq("activityId", args.activityId))
            .first();
        if (existing) return existing._id;
        return ctx.db.insert("enrollments", {
            userId: args.userId,
            activityId: args.activityId,
            enrolledAt: Date.now(),
            status: "in_progress",
        });
    },
});

export const submitProof = mutation({
    args: {
        enrollmentId: v.id("enrollments"),
        proofUrl: v.optional(v.string()),
        proofType: v.optional(v.union(v.literal("image"), v.literal("video"), v.literal("document"))),
        proofNote: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { enrollmentId, ...data } = args;
        await ctx.db.patch(enrollmentId, { ...data, status: "pending_verification", completedAt: Date.now() });
    },
});

export const verifySubmission = mutation({
    args: {
        enrollmentId: v.id("enrollments"),
        approve: v.boolean(),
        adminNote: v.optional(v.string()),
        verifiedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        const enrollment = await ctx.db.get(args.enrollmentId);
        if (!enrollment) return;
        const newStatus = args.approve ? "verified" : "rejected";
        await ctx.db.patch(args.enrollmentId, {
            status: newStatus,
            adminNote: args.adminNote,
            verifiedBy: args.verifiedBy,
            verifiedAt: Date.now(),
        });
        if (args.approve) {
            const activity = await ctx.db.get(enrollment.activityId);
            if (activity) {
                const user = await ctx.db.get(enrollment.userId);
                if (user) {
                    await ctx.db.patch(enrollment.userId, { totalPoints: user.totalPoints + activity.points });
                    // Create notification
                    await ctx.db.insert("notifications", {
                        userId: enrollment.userId,
                        type: "verification",
                        title: "Activity Approved! 🎉",
                        body: `Your "${activity.name}" submission has been approved. You've earned ${activity.points} points!`,
                        isRead: false,
                        createdAt: Date.now(),
                    });
                }
            }
        }
    },
});
