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

export const bulkVerifyEnrollments = mutation({
    args: {
        activityId: v.id("activities"),
        rows: v.array(v.string()),
        adminId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const activity = await ctx.db.get(args.activityId);
        if (!activity) throw new Error("Activity not found.");

        const results = [];
        for (const row of args.rows) {
            const cleanRow = row.trim();
            if (!cleanRow) continue;

            let user = null;
            if (cleanRow.includes('@')) {
                user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", cleanRow.toLowerCase())).first();
            } else {
                let firstName = "";
                let surname = "";
                if (cleanRow.includes(',')) {
                    const parts = cleanRow.split(',').map(p => p.trim());
                    surname = parts[0];
                    firstName = parts[1];
                } else {
                    const parts = cleanRow.split(/\s+/).map(p => p.trim());
                    firstName = parts[0];
                    surname = parts.slice(1).join(' ');
                }
                
                const allEmployees = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "employee")).collect();
                user = allEmployees.find(u => {
                    const uFirst = (u.firstName || "").trim().toLowerCase();
                    const uLast = (u.surname || "").trim().toLowerCase();
                    return uFirst === firstName.toLowerCase() && uLast === surname.toLowerCase();
                });
            }

            if (!user) {
                results.push({ identifier: cleanRow, success: false, status: "User Not Found" });
                continue;
            }

            const existing = await ctx.db.query("enrollments")
                .withIndex("by_user_activity", (q) => q.eq("userId", user._id).eq("activityId", args.activityId))
                .first();

            if (existing) {
                if (existing.status === "verified") {
                    results.push({ identifier: cleanRow, name: `${user.firstName} ${user.surname}`, success: true, status: "Already Verified" });
                    continue;
                }

                await ctx.db.patch(existing._id, {
                    status: "verified",
                    completedAt: existing.completedAt || Date.now(),
                    verifiedBy: args.adminId,
                    verifiedAt: Date.now(),
                });
            } else {
                await ctx.db.insert("enrollments", {
                    userId: user._id,
                    activityId: args.activityId,
                    enrolledAt: Date.now(),
                    completedAt: Date.now(),
                    status: "verified",
                    verifiedBy: args.adminId,
                    verifiedAt: Date.now(),
                });
            }

            await ctx.db.patch(user._id, { totalPoints: user.totalPoints + activity.points });
            await ctx.db.insert("notifications", {
                userId: user._id,
                type: "verification",
                title: "Activity Approved! 🎉",
                body: `You have been bulk-verified for "${activity.name}". You've earned ${activity.points} points!`,
                isRead: false,
                createdAt: Date.now(),
            });

            results.push({ identifier: cleanRow, name: `${user.firstName || "Incomplete"} ${user.surname || "Profile"}`, success: true, status: "Verified Successfully" });
        }

        return { success: true, results };
    },
});

// Admin: all enrollments with user + activity details, optionally filtered
export const getAllEnrollmentsAdmin = query({
    args: {
        status: v.optional(v.string()),
        activityId: v.optional(v.id("activities")),
    },
    handler: async (ctx, args) => {
        let enrollments;
        if (args.status && args.status !== "all") {
            enrollments = await ctx.db.query("enrollments")
                .withIndex("by_status", (q) => q.eq("status", args.status as any))
                .order("desc").take(200);
        } else if (args.activityId) {
            enrollments = await ctx.db.query("enrollments")
                .withIndex("by_activity", (q) => q.eq("activityId", args.activityId!))
                .order("desc").take(200);
        } else {
            enrollments = await ctx.db.query("enrollments").order("desc").take(200);
        }
        const result = [];
        for (const e of enrollments) {
            const user = await ctx.db.get(e.userId);
            const activity = await ctx.db.get(e.activityId);
            result.push({ ...e, user, activity });
        }
        return result;
    },
});

// Admin: delete a single enrollment
export const deleteEnrollment = mutation({
    args: { enrollmentId: v.id("enrollments") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.enrollmentId);
    },
});

// Admin: delete multiple enrollments by ID array
export const deleteEnrollments = mutation({
    args: { enrollmentIds: v.array(v.id("enrollments")) },
    handler: async (ctx, args) => {
        for (const id of args.enrollmentIds) {
            await ctx.db.delete(id);
        }
        return { deleted: args.enrollmentIds.length };
    },
});
