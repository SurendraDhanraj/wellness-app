import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTickets = query({
    args: { userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        if (args.userId) {
            return ctx.db.query("supportTickets").withIndex("by_user", (q) => q.eq("userId", args.userId!)).order("desc").collect();
        }
        return ctx.db.query("supportTickets").order("desc").collect();
    },
});

export const createTicket = mutation({
    args: { userId: v.id("users"), subject: v.string(), body: v.string() },
    handler: async (ctx, args) => ctx.db.insert("supportTickets", { ...args, status: "open", createdAt: Date.now() }),
});

export const replyTicket = mutation({
    args: { ticketId: v.id("supportTickets"), adminReply: v.string(), repliedBy: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.ticketId, {
            adminReply: args.adminReply,
            repliedBy: args.repliedBy,
            repliedAt: Date.now(),
            status: "resolved",
        });
    },
});

export const getGoals = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => ctx.db.query("goalSettings").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
});

export const upsertGoal = mutation({
    args: {
        userId: v.id("users"),
        goalType: v.union(v.literal("weight_loss"), v.literal("steps_daily"), v.literal("activities_monthly"), v.literal("points_monthly")),
        targetValue: v.number(),
        currentValue: v.number(),
        deadline: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("goalSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("goalType"), args.goalType))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, { targetValue: args.targetValue, deadline: args.deadline });
        } else {
            await ctx.db.insert("goalSettings", { ...args, createdAt: Date.now() });
        }
    },
});
