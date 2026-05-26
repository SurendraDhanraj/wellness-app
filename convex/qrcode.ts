import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to share verification logic between direct QR scans and manual identifier check-ins
async function verifyUserEventInternal(
    ctx: any, 
    args: { userId: any; activityId: any; adminId: any }
) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
        throw new Error("Employee not found.");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
        throw new Error("Activity not found.");
    }

    const userName = `${user.firstName || "Employee"} ${user.surname || ""}`.trim();
    const activityName = activity.name;

    // Check if there is an existing enrollment
    const existing = await ctx.db.query("enrollments")
        .withIndex("by_user_activity", (q: any) => q.eq("userId", args.userId).eq("activityId", args.activityId))
        .first();

    if (existing) {
        if (existing.status === "verified") {
            return {
                success: true,
                alreadyVerified: true,
                userName,
                activityName,
                points: activity.points,
            };
        }

        // Verify the existing enrollment
        await ctx.db.patch(existing._id, {
            status: "verified",
            completedAt: existing.completedAt || Date.now(),
            verifiedBy: args.adminId,
            verifiedAt: Date.now(),
        });
    } else {
        // Create a new verified enrollment directly
        await ctx.db.insert("enrollments", {
            userId: args.userId,
            activityId: args.activityId,
            enrolledAt: Date.now(),
            completedAt: Date.now(),
            status: "verified",
            verifiedBy: args.adminId,
            verifiedAt: Date.now(),
        });
    }

    // Credit points
    await ctx.db.patch(user._id, {
        totalPoints: (user.totalPoints || 0) + activity.points,
    });

    // Send notification
    await ctx.db.insert("notifications", {
        userId: user._id,
        type: "verification",
        title: "Activity Verified! 🎉",
        body: `You have been checked in and verified for "${activity.name}" via QR code scan. You've earned ${activity.points} points!`,
        isRead: false,
        createdAt: Date.now(),
    });

    return {
        success: true,
        alreadyVerified: false,
        userName,
        activityName,
        points: activity.points,
    };
}

export const verifyEnrollmentViaQR = mutation({
    args: {
        enrollmentId: v.id("enrollments"),
        adminId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const enrollment = await ctx.db.get(args.enrollmentId);
        if (!enrollment) {
            throw new Error("Enrollment not found.");
        }

        const user = await ctx.db.get(enrollment.userId);
        if (!user) {
            throw new Error("Employee not found.");
        }

        const activity = await ctx.db.get(enrollment.activityId);
        if (!activity) {
            throw new Error("Activity not found.");
        }

        const userName = `${user.firstName || "Employee"} ${user.surname || ""}`.trim();
        const activityName = activity.name;

        if (enrollment.status === "verified") {
            return {
                success: true,
                alreadyVerified: true,
                userName,
                activityName,
                points: activity.points,
            };
        }

        // Verify enrollment
        await ctx.db.patch(args.enrollmentId, {
            status: "verified",
            completedAt: enrollment.completedAt || Date.now(),
            verifiedBy: args.adminId,
            verifiedAt: Date.now(),
        });

        // Credit points
        await ctx.db.patch(user._id, {
            totalPoints: (user.totalPoints || 0) + activity.points,
        });

        // Send notification
        await ctx.db.insert("notifications", {
            userId: user._id,
            type: "verification",
            title: "Activity Verified! 🎉",
            body: `Your "${activity.name}" enrollment has been verified via QR code scan. You've earned ${activity.points} points!`,
            isRead: false,
            createdAt: Date.now(),
        });

        return {
            success: true,
            alreadyVerified: false,
            userName,
            activityName,
            points: activity.points,
        };
    },
});

export const verifyUserEventViaQR = mutation({
    args: {
        userId: v.id("users"),
        activityId: v.id("activities"),
        adminId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await verifyUserEventInternal(ctx, args);
    },
});

export const verifyUserEventViaIdentifier = mutation({
    args: {
        identifier: v.string(),
        activityId: v.id("activities"),
        adminId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const cleanId = args.identifier.trim();
        if (!cleanId) throw new Error("Identifier is required.");

        let user = null;

        // 1. Try treating it as a full Convex ID
        try {
            if (cleanId.length === 32) {
                user = await ctx.db.get(cleanId as any);
            }
        } catch (e) {}

        // 2. Try email lookup
        if (!user && cleanId.includes("@")) {
            user = await ctx.db.query("users")
                .withIndex("by_email", (q: any) => q.eq("email", cleanId.toLowerCase()))
                .first();
        }

        // 3. Try 8-character prefix lookup
        if (!user && cleanId.length === 8) {
            const prefix = cleanId.toLowerCase();
            const allUsers = await ctx.db.query("users").collect();
            user = allUsers.find(u => u._id.substring(0, 8).toLowerCase() === prefix);
        }

        // 4. Try name split lookup
        if (!user) {
            let firstName = "";
            let surname = "";
            if (cleanId.includes(",")) {
                const parts = cleanId.split(",").map(p => p.trim());
                surname = parts[0];
                firstName = parts[1];
            } else {
                const parts = cleanId.split(/\s+/).map(p => p.trim());
                firstName = parts[0];
                surname = parts.slice(1).join(" ");
            }

            const allEmployees = await ctx.db.query("users")
                .withIndex("by_role", (q: any) => q.eq("role", "employee"))
                .collect();
                
            user = allEmployees.find(u => {
                const uFirst = (u.firstName || "").trim().toLowerCase();
                const uLast = (u.surname || "").trim().toLowerCase();
                return uFirst === firstName.toLowerCase() && uLast === surname.toLowerCase();
            });
        }

        if (!user) {
            throw new Error(`Could not find any employee matching "${cleanId}".`);
        }

        // Delegate to verifyUserEventInternal helper
        return await verifyUserEventInternal(ctx, {
            userId: user._id,
            activityId: args.activityId,
            adminId: args.adminId,
        });
    },
});
