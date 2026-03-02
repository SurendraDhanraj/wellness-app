import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Business Units
export const getBusinessUnits = query({
    args: {},
    handler: async (ctx) => ctx.db.query("businessUnits").collect(),
});

export const createBusinessUnit = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => ctx.db.insert("businessUnits", { name: args.name, isActive: true, createdAt: Date.now() }),
});

export const toggleBusinessUnit = mutation({
    args: { id: v.id("businessUnits"), isActive: v.boolean() },
    handler: async (ctx, args) => ctx.db.patch(args.id, { isActive: args.isActive }),
});

export const updateBusinessUnit = mutation({
    args: { id: v.id("businessUnits"), name: v.string() },
    handler: async (ctx, args) => ctx.db.patch(args.id, { name: args.name }),
});

// Departments
export const getDepartments = query({
    args: {},
    handler: async (ctx) => ctx.db.query("departments").collect(),
});

export const createDepartment = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => ctx.db.insert("departments", { name: args.name, isActive: true, createdAt: Date.now() }),
});

export const toggleDepartment = mutation({
    args: { id: v.id("departments"), isActive: v.boolean() },
    handler: async (ctx, args) => ctx.db.patch(args.id, { isActive: args.isActive }),
});

export const updateDepartment = mutation({
    args: { id: v.id("departments"), name: v.string() },
    handler: async (ctx, args) => ctx.db.patch(args.id, { name: args.name }),
});

// Locations
export const getLocations = query({
    args: {},
    handler: async (ctx) => ctx.db.query("locations").collect(),
});

export const createLocation = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => ctx.db.insert("locations", { name: args.name, isActive: true, createdAt: Date.now() }),
});

export const toggleLocation = mutation({
    args: { id: v.id("locations"), isActive: v.boolean() },
    handler: async (ctx, args) => ctx.db.patch(args.id, { isActive: args.isActive }),
});

export const updateLocation = mutation({
    args: { id: v.id("locations"), name: v.string() },
    handler: async (ctx, args) => ctx.db.patch(args.id, { name: args.name }),
});
