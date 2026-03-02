import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getHealthMetrics = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const records = await ctx.db.query("healthMetrics")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc").take(90);
        // Sort by the date field (yyyy-MM-dd) descending so most recent DATE is first,
        // regardless of when the entry was created (handles backdated entries)
        return records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    },
});

export const logHealthMetric = mutation({
    args: {
        userId: v.id("users"),
        date: v.string(),
        weight: v.optional(v.number()),
        weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
        bmi: v.optional(v.number()),
        bloodPressureSystolic: v.optional(v.number()),
        bloodPressureDiastolic: v.optional(v.number()),
        steps: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Check if entry for today exists
        const existing = await ctx.db.query("healthMetrics")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
            .first();
        if (existing) {
            const { userId, date, ...updates } = args;
            await ctx.db.patch(existing._id, updates);
            return existing._id;
        }
        return ctx.db.insert("healthMetrics", { ...args, createdAt: Date.now() });
    },
});

// Admin: top weight loss and top steps across all users
export const getAdminHealthStats = query({
    args: {},
    handler: async (ctx) => {
        // Collect all health metrics
        const allMetrics = await ctx.db.query("healthMetrics").collect();

        // Group by user
        const byUser: Record<string, typeof allMetrics> = {};
        for (const m of allMetrics) {
            const uid = m.userId.toString();
            if (!byUser[uid]) byUser[uid] = [];
            byUser[uid].push(m);
        }

        // Compute weight loss (earliest weight - latest weight, sorted by date)
        const weightLoss: { userId: string; loss: number; latestWeight: number }[] = [];
        const topSteps: { userId: string; steps: number }[] = [];

        for (const [uid, records] of Object.entries(byUser)) {
            // Sort ascending by date
            const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
            const withWeight = sorted.filter(r => r.weight != null);
            if (withWeight.length >= 2) {
                const first = withWeight[0].weight as number;
                const last = withWeight[withWeight.length - 1].weight as number;
                const loss = first - last; // positive = lost weight
                if (loss > 0) weightLoss.push({ userId: uid, loss, latestWeight: last });
            }
            // Total cumulative steps
            const totalSteps = records.filter(r => r.steps != null).reduce((acc, r) => acc + (r.steps as number), 0);
            if (totalSteps > 0) topSteps.push({ userId: uid, steps: totalSteps });
        }

        weightLoss.sort((a, b) => b.loss - a.loss);
        topSteps.sort((a, b) => b.steps - a.steps);

        // Fetch user details for top 5 of each
        const topLoss = await Promise.all(weightLoss.slice(0, 5).map(async (e) => {
            const user = await ctx.db.query("users").filter(q => q.eq(q.field("_id"), e.userId as any)).first();
            return { ...e, user };
        }));
        const topStep = await Promise.all(topSteps.slice(0, 5).map(async (e) => {
            const user = await ctx.db.query("users").filter(q => q.eq(q.field("_id"), e.userId as any)).first();
            return { ...e, user };
        }));

        return { topWeightLoss: topLoss, topSteps: topStep };
    },
});

// Admin: all activity submissions (for chart)
export const getAllSubmissions = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db.query("enrollments")
            .filter(q => q.neq(q.field("completedAt"), undefined))
            .collect();
    },
});


