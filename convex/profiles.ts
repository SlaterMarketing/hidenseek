import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

export const getMyProfile = query({
  handler: async (ctx): Promise<(Doc<"profiles"> & { profileImageUrl?: string | null }) | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (profile) {
      const profileImageUrl = profile.profileImageId ? await ctx.storage.getUrl(profile.profileImageId) : null;
      return { ...profile, profileImageUrl };
    }
    return null;
  },
});

export const getUserProfileById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<(Doc<"profiles"> & { user: Doc<"users"> | null; profileImageUrl?: string | null }) | null> => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    
    const user = await ctx.db.get(args.userId);
    const profileImageUrl = profile?.profileImageId ? await ctx.storage.getUrl(profile.profileImageId) : null;

    if (!profile) {
        if (user) {
            return {
                _id: user._id as unknown as Id<"profiles">, 
                _creationTime: user._creationTime,
                userId: user._id,
                username: user.name, 
                user: user,
                profileImageUrl: null, // No profile document means no custom image
            }
        }
        return null;
    }
    return { ...profile, user, profileImageUrl };
  },
});

export const updateMyProfile = mutation({
  args: {
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    locationCity: v.optional(v.string()),
    locationRegion: v.optional(v.string()),
    locationCountry: v.optional(v.string()),
    experienceLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced"),
      ),
    ),
    bio: v.optional(v.string()),
    contactPreferences: v.optional(v.any()),
    profileImageId: v.optional(v.union(v.id("_storage"), v.null())), // Added, allow null to remove
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (args.username) {
      const existingByUsername = await ctx.db
        .query("profiles")
        .withIndex("by_username", (q) => q.eq("username", args.username!))
        .unique();
      if (existingByUsername && existingByUsername.userId !== userId) {
        throw new Error("Username already taken");
      }
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const profileDataToUpdate: Partial<Omit<Doc<"profiles">, "_id" | "_creationTime" | "userId">> = {};
    if (args.username !== undefined) profileDataToUpdate.username = args.username;
    if (args.displayName !== undefined) profileDataToUpdate.displayName = args.displayName;
    if (args.locationCity !== undefined) profileDataToUpdate.locationCity = args.locationCity;
    if (args.locationRegion !== undefined) profileDataToUpdate.locationRegion = args.locationRegion;
    if (args.locationCountry !== undefined) profileDataToUpdate.locationCountry = args.locationCountry;
    if (args.experienceLevel !== undefined) profileDataToUpdate.experienceLevel = args.experienceLevel;
    if (args.bio !== undefined) profileDataToUpdate.bio = args.bio;
    if (args.contactPreferences !== undefined) profileDataToUpdate.contactPreferences = args.contactPreferences;
    
    if (args.profileImageId !== undefined) {
        profileDataToUpdate.profileImageId = args.profileImageId === null ? undefined : args.profileImageId;
    }


    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileDataToUpdate);
    } else {
      await ctx.db.insert("profiles", {
        userId,
        ...profileDataToUpdate,
      });
    }
    return true;
  },
});

export function isProfileComplete(profile: Doc<"profiles"> | null | undefined): boolean {
  if (!profile) return false;
  return !!profile.username && !!profile.locationCity && !!profile.locationRegion && !!profile.locationCountry;
}
