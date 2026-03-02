import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMessages = query({
    args: { group: v.string() },
    handler: async (ctx, args) => {
        const messages = await ctx.db.query("messages")
            .withIndex("by_group", (q) => q.eq("group", args.group))
            .filter((q) => q.eq(q.field("parentId"), undefined))
            .order("desc").take(50);
        const result = [];
        for (const m of messages) {
            const user = await ctx.db.get(m.userId);
            const replies = await ctx.db.query("messages")
                .withIndex("by_parent", (q) => q.eq("parentId", m._id)).collect();
            result.push({ ...m, user, replyCount: replies.length });
        }
        return result;
    },
});

export const postMessage = mutation({
    args: {
        userId: v.id("users"),
        content: v.string(),
        group: v.string(),
        mediaUrl: v.optional(v.string()),
        parentId: v.optional(v.id("messages")),
    },
    handler: async (ctx, args) => {
        return ctx.db.insert("messages", {
            ...args,
            likes: [],
            isPinned: false,
            createdAt: Date.now(),
        });
    },
});

export const toggleLike = mutation({
    args: { messageId: v.id("messages"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const message = await ctx.db.get(args.messageId);
        if (!message) return;
        const liked = message.likes.includes(args.userId);
        const newLikes = liked
            ? message.likes.filter((id) => id !== args.userId)
            : [...message.likes, args.userId];
        await ctx.db.patch(args.messageId, { likes: newLikes });
    },
});
