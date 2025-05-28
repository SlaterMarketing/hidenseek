import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// --- Mutations ---

export const submitRating = mutation({
  args: {
    ratedUserId: v.id("users"),
    sessionId: v.id("game_sessions"),
    rating: v.number(), // Expecting 1-5
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const raterUserId = await getAuthUserId(ctx);
    if (!raterUserId) {
      throw new Error("User not authenticated.");
    }
    if (raterUserId === args.ratedUserId) {
      throw new Error("Cannot rate yourself.");
    }
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }

    // Check if rater participated in the session
    const participantRecord = await ctx.db
      .query("session_participants")
      .withIndex("by_sessionId_and_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", raterUserId)
      )
      .filter(q => q.eq(q.field("status"), "confirmed"))
      .unique();

    if (!participantRecord) {
      // Allow host to rate even if not explicitly a participant in session_participants
      const session = await ctx.db.get(args.sessionId);
      if (!session || session.hostId !== raterUserId) {
         throw new Error("Rater did not participate in this session or is not the host.");
      }
      if (session.status !== "completed" && session.status !== "cancelled") { // Or other relevant statuses
        // Potentially allow rating for ongoing/full games if desired
        // For now, let's assume only completed/cancelled games can be rated for simplicity
        // throw new Error("Session must be completed or cancelled to submit ratings.");
      }
    }
    
    // Check if ratedUser also participated or was host
     const ratedUserParticipantRecord = await ctx.db
      .query("session_participants")
      .withIndex("by_sessionId_and_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", args.ratedUserId)
      )
      .filter(q => q.eq(q.field("status"), "confirmed"))
      .unique();
    const sessionForRatedUser = await ctx.db.get(args.sessionId);
    if (!ratedUserParticipantRecord && (sessionForRatedUser?.hostId !== args.ratedUserId)) {
        throw new Error("Rated user was not part of this session.");
    }


    // Check if already rated this user for this session
    const existingRating = await ctx.db
      .query("user_ratings")
      .withIndex("by_raterUserId_and_sessionId", q => q.eq("raterUserId", raterUserId).eq("sessionId", args.sessionId))
      .filter(q => q.eq(q.field("ratedUserId"), args.ratedUserId))
      .unique();

    if (existingRating) {
      // Update existing rating
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        comment: args.comment,
      });
      return { success: true, message: "Rating updated." , ratingId: existingRating._id};
    } else {
      // Insert new rating
      const ratingId = await ctx.db.insert("user_ratings", {
        ratedUserId: args.ratedUserId,
        raterUserId,
        sessionId: args.sessionId,
        rating: args.rating,
        comment: args.comment,
      });
      return { success: true, message: "Rating submitted.", ratingId };
    }
  },
});

// --- Queries ---

// Get all ratings received by a user
export const getRatingsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("user_ratings")
      .withIndex("by_ratedUserId_and_sessionId", q => q.eq("ratedUserId", args.userId)) // This index might need adjustment or a new one
      .order("desc")
      .collect();

    return Promise.all(
        ratings.map(async (rating) => {
            const raterProfile = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", rating.raterUserId)).unique();
            const raterUser = await ctx.db.get(rating.raterUserId);
            const session = await ctx.db.get(rating.sessionId);
            return {
                ...rating,
                raterUsername: raterProfile?.username ?? raterUser?.name ?? "Unknown Rater",
                raterDisplayName: raterProfile?.displayName ?? raterUser?.name ?? "Unknown Rater",
                sessionTitle: session?.title ?? "Unknown Session"
            };
        })
    );
  },
});

// Calculate average rating for a user
export const getAverageRatingForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("user_ratings")
      .withIndex("by_ratedUserId_and_sessionId", q => q.eq("ratedUserId", args.userId))
      .collect();

    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / ratings.length, count: ratings.length };
  },
});

// Get a specific rating given by the logged-in rater for a specific user in a session
export const getRatingByRaterForSession = query({
    args: {
        ratedUserId: v.id("users"),
        sessionId: v.id("game_sessions"),
    },
    handler: async (ctx, args) => {
        const raterUserId = await getAuthUserId(ctx);
        if (!raterUserId) {
            return null; // Not logged in
        }

        const rating = await ctx.db.query("user_ratings")
            .withIndex("by_raterUserId_and_sessionId", q => q.eq("raterUserId", raterUserId).eq("sessionId", args.sessionId))
            .filter(q => q.eq(q.field("ratedUserId"), args.ratedUserId))
            .unique();
        
        return rating;
    }
});
