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
            if (m.isDeleted) continue; // hide deleted posts from employees
            const user = await ctx.db.get(m.userId);
            const replies = await ctx.db.query("messages")
                .withIndex("by_parent", (q) => q.eq("parentId", m._id)).collect();
            
            const mediaUrl = m.mediaStorageId 
                ? await ctx.storage.getUrl(m.mediaStorageId) 
                : m.mediaUrl;

            result.push({ 
                ...m, 
                mediaUrl: mediaUrl || undefined, 
                user, 
                replyCount: replies.length 
            });
        }
        return result;
    },
});

// Admin-only: returns ALL posts (including deleted/censored) for moderation
export const getAllMessagesAdmin = query({
    args: { group: v.string() },
    handler: async (ctx, args) => {
        const messages = await ctx.db.query("messages")
            .withIndex("by_group", (q) => q.eq("group", args.group))
            .filter((q) => q.eq(q.field("parentId"), undefined))
            .order("desc").take(100);
        const result = [];
        for (const m of messages) {
            const user = await ctx.db.get(m.userId);
            const replies = await ctx.db.query("messages")
                .withIndex("by_parent", (q) => q.eq("parentId", m._id)).collect();

            const mediaUrl = m.mediaStorageId 
                ? await ctx.storage.getUrl(m.mediaStorageId) 
                : m.mediaUrl;

            result.push({ 
                ...m, 
                mediaUrl: mediaUrl || undefined, 
                user, 
                replyCount: replies.length 
            });
        }
        return result;
    },
});

export const postMessage = mutation({
    args: {
        userId: v.id("users"),
        content: v.string(),
        group: v.string(),
        mediaStorageId: v.optional(v.string()),
        mediaUrl: v.optional(v.string()),
        mediaType: v.optional(v.union(v.literal("image"), v.literal("video"), v.literal("pdf"))),
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

export const getReplies = query({
    args: { parentId: v.id("messages") },
    handler: async (ctx, args) => {
        const replies = await ctx.db.query("messages")
            .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
            .order("asc")
            .collect();
        const result = [];
        for (const r of replies) {
            if (r.isDeleted) continue;
            const user = await ctx.db.get(r.userId);
            
            const mediaUrl = r.mediaStorageId 
                ? await ctx.storage.getUrl(r.mediaStorageId) 
                : r.mediaUrl;

            result.push({ 
                ...r, 
                mediaUrl: mediaUrl || undefined, 
                user 
            });
        }
        return result;
    },
});

// Admin: soft-delete a post (hidden from employees, recoverable)
export const deleteMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, { isDeleted: true });
    },
});

// Admin: restore a soft-deleted post
export const restoreMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, { isDeleted: false });
    },
});

// Admin: censor post content (replaces content with placeholder, keeps record)
export const censorMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, {
            isCensored: true,
            content: "[This post has been removed by an administrator.]",
            mediaUrl: undefined,
        });
    },
});

// Returns a short-lived pre-signed URL the client can POST a file to
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Resolves a Convex storageId to its public URL
export const getMediaUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId as any);
    },
});

