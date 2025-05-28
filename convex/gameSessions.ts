import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

// --- Mutations ---

export const createGameSession = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    locationCity: v.string(),
    locationRegion: v.string(),
    locationCountry: v.string(),
    meetingPoint: v.optional(v.string()),
    scheduledTimestamp: v.number(),
    durationHours: v.optional(v.number()),
    maxPlayers: v.number(),
    difficultyLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced"),
      ),
    ),
    specialRules: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")), // Added
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated. Cannot create a game session.");
    }

    const userProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) {
      throw new Error("User profile not found. Please complete your profile first.");
    }
    if (!userProfile.username || !userProfile.locationCity) {
         throw new Error("Profile is incomplete. Please ensure username and location are set.");
    }

    if (args.maxPlayers <= 0) {
      throw new Error("Maximum players must be a positive number.");
    }
    if (args.scheduledTimestamp <= Date.now()) {
      throw new Error("Scheduled date and time must be in the future.");
    }

    const sessionId = await ctx.db.insert("game_sessions", {
      hostId: userId,
      title: args.title,
      description: args.description,
      locationCity: args.locationCity,
      locationRegion: args.locationRegion,
      locationCountry: args.locationCountry,
      meetingPoint: args.meetingPoint,
      scheduledTimestamp: args.scheduledTimestamp,
      durationHours: args.durationHours ?? 3,
      maxPlayers: args.maxPlayers,
      difficultyLevel: args.difficultyLevel,
      specialRules: args.specialRules,
      status: "open",
      imageId: args.imageId, // Added
    });

    await ctx.db.insert("session_participants", {
      sessionId: sessionId,
      userId: userId,
      status: "confirmed",
    });

    return sessionId;
  },
});

export const updateGameSession = mutation({
  args: {
    sessionId: v.id("game_sessions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    locationCity: v.optional(v.string()),
    locationRegion: v.optional(v.string()),
    locationCountry: v.optional(v.string()),
    meetingPoint: v.optional(v.string()),
    scheduledTimestamp: v.optional(v.number()),
    durationHours: v.optional(v.number()),
    maxPlayers: v.optional(v.number()),
    difficultyLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced"),
        v.literal(""), // Allow clearing
      ),
    ),
    specialRules: v.optional(v.string()),
    imageId: v.optional(v.union(v.id("_storage"), v.null())), // Added, allow null to remove
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Game session not found.");
    }

    if (session.hostId !== userId) {
      throw new Error("Only the host can update the game session.");
    }

    if (session.status !== "open") {
      throw new Error("Cannot update a session that is not 'open'.");
    }

    if (args.scheduledTimestamp && args.scheduledTimestamp <= Date.now()) {
      throw new Error("Scheduled date and time must be in the future.");
    }
    if (args.maxPlayers && args.maxPlayers <= 0) {
      throw new Error("Maximum players must be a positive number.");
    }

    const { sessionId: _, ...updates } = args;

    if (updates.difficultyLevel === "") {
      updates.difficultyLevel = undefined;
    }

    const definedUpdates: Partial<Doc<"game_sessions">> = {};
    for (const key in updates) {
      if (updates[key as keyof typeof updates] !== undefined) {
         if (key === "imageId" && updates[key as keyof typeof updates] === null) {
          definedUpdates[key as keyof Doc<"game_sessions">] = undefined as any; // Set to undefined to remove
        } else {
          definedUpdates[key as keyof Doc<"game_sessions">] = updates[key as keyof typeof updates] as any;
        }
      }
    }

    await ctx.db.patch(args.sessionId, definedUpdates);
    return true;
  },
});

export const joinSession = mutation({
  args: {
    sessionId: v.id("game_sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Game session not found.");
    }

    if (session.status !== "open") {
      throw new Error("This session is not open for new participants.");
    }

    if (session.hostId === userId) {
      throw new Error("You cannot join your own session.");
    }

    // Check if user already has a participation record
    const existingParticipation = await ctx.db
      .query("session_participants")
      .withIndex("by_sessionId_and_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId)
      )
      .first();

    if (existingParticipation) {
      if (existingParticipation.status === "confirmed") {
        throw new Error("You are already a participant in this session.");
      }
      if (existingParticipation.status === "pending_approval") {
        throw new Error("You have already requested to join this session.");
      }
    }

    // Check if session is full
    const confirmedParticipants = await ctx.db
      .query("session_participants")
      .withIndex("by_sessionId_and_status", (q) =>
        q.eq("sessionId", args.sessionId).eq("status", "confirmed")
      )
      .collect();

    if (confirmedParticipants.length >= session.maxPlayers) {
      throw new Error("This session is full.");
    }

    // Add user as confirmed participant (immediate join)
    await ctx.db.insert("session_participants", {
      sessionId: args.sessionId,
      userId: userId,
      status: "confirmed",
    });

    // Update session status to full if needed
    if (confirmedParticipants.length + 1 >= session.maxPlayers) {
      await ctx.db.patch(args.sessionId, { status: "full" });
    }

    return { success: true, message: "Successfully joined the session!" };
  },
});

export const leaveSession = mutation({
  args: {
    sessionId: v.id("game_sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Game session not found.");
    }

    if (session.hostId === userId) {
      throw new Error("Host cannot leave their own session. Cancel the session instead.");
    }

    if (session.status === "completed" || session.status === "cancelled") {
      throw new Error("Cannot leave a completed or cancelled session.");
    }

    // Find and remove the participation record
    const participation = await ctx.db
      .query("session_participants")
      .withIndex("by_sessionId_and_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId)
      )
      .first();

    if (!participation) {
      throw new Error("You are not a participant in this session.");
    }

    await ctx.db.delete(participation._id);

    // Update session status from full to open if needed
    if (session.status === "full") {
      await ctx.db.patch(args.sessionId, { status: "open" });
    }

    return { success: true, message: "Successfully left the session." };
  },
});

export const cancelSession = mutation({
  args: {
    sessionId: v.id("game_sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Game session not found.");
    }

    if (session.hostId !== userId) {
      throw new Error("Only the host can cancel the session.");
    }

    if (session.status === "completed" || session.status === "cancelled") {
      throw new Error("Session is already completed or cancelled.");
    }

    await ctx.db.patch(args.sessionId, { status: "cancelled" });

    return { success: true, message: "Session cancelled successfully." };
  },
});

export const completeSession = mutation({
  args: {
    sessionId: v.id("game_sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Game session not found.");
    }

    if (session.hostId !== userId) {
      throw new Error("Only the host can mark the session as completed.");
    }

    if (session.status === "completed") {
      throw new Error("Session is already marked as completed.");
    }

    if (session.status === "cancelled") {
      throw new Error("Cannot complete a cancelled session.");
    }

    await ctx.db.patch(args.sessionId, { status: "completed" });

    return { success: true, message: "Session marked as completed." };
  },
});

// --- Queries ---

export const listOpenGameSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("game_sessions")
      .withIndex("by_status_and_scheduledTimestamp", (q) => q.eq("status", "open"))
      .order("asc")
      .collect();

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const hostProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", session.hostId))
          .unique();

        const participants = await ctx.db
          .query("session_participants")
          .withIndex("by_sessionId_and_status", (q) => q.eq("sessionId", session._id))
          .collect();

        const hostUser = await ctx.db.get(session.hostId);
        const imageUrl = session.imageId ? await ctx.storage.getUrl(session.imageId) : null;
        const hostProfileImageUrl = hostProfile?.profileImageId ? await ctx.storage.getUrl(hostProfile.profileImageId) : null;


        return {
          ...session,
          hostDisplayName: hostProfile?.displayName ?? hostUser?.name ?? "Unknown Host",
          hostUsername: hostProfile?.username ?? "unknown_host",
          hostProfileImageUrl,
          currentPlayers: participants.filter(p => p.status === "confirmed").length,
          participants: participants,
          imageUrl, // Added
        };
      })
    );
    return sessionsWithDetails.filter(s => s.scheduledTimestamp > Date.now());
  },
});

export type GameSessionWithDetails = Doc<"game_sessions"> & {
  hostDisplayName: string;
  hostUsername: string;
  hostProfileImageUrl: string | null;
  currentPlayers: number;
  participants: Doc<"session_participants">[];
  imageUrl: string | null; // Added
};
