import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getBadges = query({
    args: {},
    handler: async (ctx) => ctx.db.query("badges").filter((q) => q.eq(q.field("isActive"), true)).collect(),
});

export const getAllBadges = query({
    args: {},
    handler: async (ctx) => ctx.db.query("badges").collect(),
});

export const getUserBadges = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const userBadges = await ctx.db.query("userBadges").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
        const result = [];
        for (const ub of userBadges) {
            const badge = await ctx.db.get(ub.badgeId);
            result.push({ ...ub, badge });
        }
        return result;
    },
});

export const createBadge = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        icon: v.string(),
        triggerType: v.union(v.literal("points_threshold"), v.literal("activity_count"), v.literal("category_count"), v.literal("steps_total"), v.literal("weight_loss"), v.literal("streak")),
        triggerValue: v.number(),
        triggerCategory: v.optional(v.string()),
    },
    handler: async (ctx, args) => ctx.db.insert("badges", { ...args, isActive: true, createdAt: Date.now() }),
});

export const updateBadge = mutation({
    args: {
        id: v.id("badges"),
        name: v.string(),
        description: v.string(),
        icon: v.string(),
        triggerType: v.union(v.literal("points_threshold"), v.literal("activity_count"), v.literal("category_count"), v.literal("steps_total"), v.literal("weight_loss"), v.literal("streak")),
        triggerValue: v.number(),
        isActive: v.boolean(),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const awardBadge = mutation({
    args: { userId: v.id("users"), badgeId: v.id("badges") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("userBadges")
            .withIndex("by_user_badge", (q) => q.eq("userId", args.userId).eq("badgeId", args.badgeId))
            .first();
        if (existing) return;
        await ctx.db.insert("userBadges", { ...args, earnedAt: Date.now() });
        const badge = await ctx.db.get(args.badgeId);
        if (badge) {
            await ctx.db.insert("notifications", {
                userId: args.userId,
                type: "badge",
                title: `Badge Unlocked: ${badge.name} 🏅`,
                body: badge.description,
                isRead: false,
                createdAt: Date.now(),
            });
        }
    },
});

export const getNotifications = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", args.userId)).order("desc").take(30);
    },
});

export const markNotificationRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => ctx.db.patch(args.notificationId, { isRead: true }),
});

export const createNotification = mutation({
    args: {
        userId: v.id("users"),
        type: v.string(),
        title: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => ctx.db.insert("notifications", { ...args, isRead: false, createdAt: Date.now() }),
});
