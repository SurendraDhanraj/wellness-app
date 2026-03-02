import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("admin"), v.literal("employee")),
    firstName: v.optional(v.string()),
    surname: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    height: v.optional(v.number()),
    heightUnit: v.optional(v.union(v.literal("cm"), v.literal("ft"))),
    businessUnitId: v.optional(v.id("businessUnits")),
    departmentId: v.optional(v.id("departments")),
    locationId: v.optional(v.id("locations")),
    avatarStorageId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isProfileComplete: v.boolean(),
    totalPoints: v.number(),
    mustChangePassword: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  businessUnits: defineTable({
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  departments: defineTable({
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  locations: defineTable({
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  activities: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("physical"),
      v.literal("social"),
      v.literal("financial"),
      v.literal("emotional")
    ),
    points: v.number(),
    durationDays: v.optional(v.number()),
    icon: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_category", ["category"]),

  enrollments: defineTable({
    userId: v.id("users"),
    activityId: v.id("activities"),
    enrolledAt: v.number(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("pending_verification"),
      v.literal("verified"),
      v.literal("rejected")
    ),
    completedAt: v.optional(v.number()),
    proofStorageId: v.optional(v.string()),
    proofUrl: v.optional(v.string()),
    proofType: v.optional(v.union(v.literal("image"), v.literal("video"), v.literal("document"))),
    proofNote: v.optional(v.string()),
    adminNote: v.optional(v.string()),
    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_activity", ["activityId"])
    .index("by_status", ["status"])
    .index("by_user_activity", ["userId", "activityId"]),

  healthMetrics: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
    bmi: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    steps: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  messages: defineTable({
    userId: v.id("users"),
    content: v.string(),
    mediaStorageId: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    group: v.string(), // "trending", "myteam", or custom tags
    parentId: v.optional(v.id("messages")),
    likes: v.array(v.id("users")),
    isPinned: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_group", ["group"])
    .index("by_parent", ["parentId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  badges: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    triggerType: v.union(
      v.literal("points_threshold"),
      v.literal("activity_count"),
      v.literal("category_count"),
      v.literal("steps_total"),
      v.literal("weight_loss"),
      v.literal("streak")
    ),
    triggerValue: v.number(),
    triggerCategory: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  userBadges: defineTable({
    userId: v.id("users"),
    badgeId: v.id("badges"),
    earnedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_badge", ["userId", "badgeId"]),

  goalSettings: defineTable({
    userId: v.id("users"),
    goalType: v.union(
      v.literal("weight_loss"),
      v.literal("steps_daily"),
      v.literal("activities_monthly"),
      v.literal("points_monthly")
    ),
    targetValue: v.number(),
    currentValue: v.number(),
    deadline: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  supportTickets: defineTable({
    userId: v.id("users"),
    subject: v.string(),
    body: v.string(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved")),
    adminReply: v.optional(v.string()),
    repliedBy: v.optional(v.id("users")),
    repliedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  adminConfigs: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
});
