import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// --- Mutations ---

// Request to follow another user
export const requestConnection = mutation({
  args: {
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const followerId = await getAuthUserId(ctx);
    if (!followerId) {
      throw new Error("User not authenticated.");
    }
    if (followerId === args.followingId) {
      throw new Error("Cannot connect with yourself.");
    }

    const existingConnection = await ctx.db
      .query("user_connections")
      .withIndex("by_followerId_and_followingId", (q) =>
        q.eq("followerId", followerId).eq("followingId", args.followingId)
      )
      .unique();

    if (existingConnection) {
      if (existingConnection.status === "blocked") {
        throw new Error("Cannot connect with a blocked user or user who blocked you.");
      }
      // If already pending or accepted, do nothing or throw error
      if (existingConnection.status === "pending") {
        return { success: false, message: "Connection request already pending." };
      }
      if (existingConnection.status === "accepted") {
        return { success: false, message: "Already connected." };
      }
    }
    
    // Check if the target user has blocked the requester
    const targetBlockedRequester = await ctx.db
      .query("user_connections")
      .withIndex("by_followerId_and_followingId", (q) => 
        q.eq("followerId", args.followingId).eq("followingId", followerId)
      )
      .filter(q => q.eq(q.field("status"), "blocked"))
      .first();

    if (targetBlockedRequester) {
        throw new Error("This user has blocked you.");
    }


    await ctx.db.insert("user_connections", {
      followerId,
      followingId: args.followingId,
      status: "pending",
    });
    return { success: true, message: "Connection request sent." };
  },
});

// Accept a connection request
export const acceptConnectionRequest = mutation({
  args: {
    connectionId: v.id("user_connections"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection request not found.");
    }

    if (connection.followingId !== userId) {
      throw new Error("Not authorized to accept this request.");
    }
    if (connection.status !== "pending") {
      throw new Error("Request is not pending.");
    }

    await ctx.db.patch(args.connectionId, { status: "accepted" });
    return { success: true, message: "Connection accepted." };
  },
});

// Decline a connection request or cancel an outgoing request
export const declineOrCancelConnectionRequest = mutation({
  args: {
    connectionId: v.id("user_connections"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection request not found.");
    }

    // User can cancel their own outgoing 'pending' request OR decline an incoming 'pending' request
    if (connection.followerId !== userId && connection.followingId !== userId) {
      throw new Error("Not authorized to modify this request.");
    }
    if (connection.status !== "pending") {
      throw new Error("Request is not pending.");
    }

    await ctx.db.delete(args.connectionId);
    return { success: true, message: "Connection request declined/cancelled." };
  },
});

// Remove an existing connection (unfollow)
export const removeConnection = mutation({
  args: {
    targetUserId: v.id("users"), // The user to unfollow
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx); // The user performing the unfollow
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const connection = await ctx.db
      .query("user_connections")
      .withIndex("by_followerId_and_followingId", (q) =>
        q.eq("followerId", userId).eq("followingId", args.targetUserId)
      )
      .filter(q => q.eq(q.field("status"), "accepted"))
      .unique();

    if (!connection) {
      throw new Error("No accepted connection found to remove.");
    }

    await ctx.db.delete(connection._id);
    return { success: true, message: "Connection removed." };
  },
});

// Block a user
export const blockUser = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    if (userId === args.targetUserId) {
      throw new Error("Cannot block yourself.");
    }

    // Remove any existing connection or request between them
    const existingConnection1 = await ctx.db
      .query("user_connections")
      .withIndex("by_followerId_and_followingId", (q) =>
        q.eq("followerId", userId).eq("followingId", args.targetUserId)
      ).first();
    if (existingConnection1) await ctx.db.delete(existingConnection1._id);
    
    const existingConnection2 = await ctx.db
      .query("user_connections")
      .withIndex("by_followerId_and_followingId", (q) =>
        q.eq("followerId", args.targetUserId).eq("followingId", userId)
      ).first();
    if (existingConnection2) await ctx.db.delete(existingConnection2._id);

    // Create a new 'blocked' record
    await ctx.db.insert("user_connections", {
      followerId: userId, // User who is blocking
      followingId: args.targetUserId, // User being blocked
      status: "blocked",
    });
    return { success: true, message: "User blocked." };
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const blockedConnection = await ctx.db
      .query("user_connections")
      .withIndex("by_followerId_and_followingId", (q) =>
        q.eq("followerId", userId).eq("followingId", args.targetUserId)
      )
      .filter(q => q.eq(q.field("status"), "blocked"))
      .unique();

    if (!blockedConnection) {
      throw new Error("No blocked record found for this user.");
    }

    await ctx.db.delete(blockedConnection._id);
    return { success: true, message: "User unblocked." };
  },
});


// --- Queries ---

// Get users who are following the specified userId (their followers)
export const getFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("user_connections")
      .withIndex("by_followingId_and_status", (q) =>
        q.eq("followingId", args.userId).eq("status", "accepted")
      )
      .collect();
    
    return Promise.all(connections.map(conn => ctx.db.get(conn.followerId)));
  },
});

// Get users whom the specified userId is following
export const getFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("user_connections")
      .withIndex("by_followerId_and_status", (q) =>
        q.eq("followerId", args.userId).eq("status", "accepted")
      )
      .collect();
    return Promise.all(connections.map(conn => ctx.db.get(conn.followingId)));
  },
});

// Get pending incoming connection requests for the logged-in user
export const getPendingIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const connections = await ctx.db
      .query("user_connections")
      .withIndex("by_followingId_and_status", (q) =>
        q.eq("followingId", userId).eq("status", "pending")
      )
      .collect();
    
    // Fetch profile details for each requester
    const requestsWithProfile = await Promise.all(
        connections.map(async (conn) => {
            const requesterProfile = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", conn.followerId)).unique();
            const requesterUser = await ctx.db.get(conn.followerId);
            return {
                ...conn,
                requester: {
                    _id: conn.followerId,
                    username: requesterProfile?.username ?? requesterUser?.name ?? "Unknown",
                    displayName: requesterProfile?.displayName ?? requesterUser?.name ?? "Unknown User",
                }
            };
        })
    );
    return requestsWithProfile;
  },
});

// Get the connection status between the logged-in user and a target user
export const getConnectionStatusWithUser = query({
    args: { targetUserId: v.id("users") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null; // No logged-in user, no status
        }
        if (userId === args.targetUserId) {
            return { status: "self" };
        }

        // Check if logged-in user is following targetUser
        const iFollowTarget = await ctx.db
            .query("user_connections")
            .withIndex("by_followerId_and_followingId", q => q.eq("followerId", userId).eq("followingId", args.targetUserId))
            .first();

        // Check if targetUser is following logged-in user
        const targetFollowsMe = await ctx.db
            .query("user_connections")
            .withIndex("by_followerId_and_followingId", q => q.eq("followerId", args.targetUserId).eq("followingId", userId))
            .first();

        if (iFollowTarget?.status === "blocked") {
            return { status: "blocked_by_me", connectionId: iFollowTarget._id };
        }
        if (targetFollowsMe?.status === "blocked") {
            return { status: "blocked_by_them", connectionId: targetFollowsMe._id };
        }
        
        if (iFollowTarget?.status === "accepted" && targetFollowsMe?.status === "accepted") {
            return { status: "friends", myConnectionId: iFollowTarget._id, theirConnectionId: targetFollowsMe._id };
        }
        if (iFollowTarget?.status === "accepted") {
            return { status: "following_them", myConnectionId: iFollowTarget._id };
        }
        if (targetFollowsMe?.status === "accepted") {
            return { status: "followed_by_them", theirConnectionId: targetFollowsMe._id };
        }
        if (iFollowTarget?.status === "pending") {
            return { status: "request_sent_by_me", myConnectionId: iFollowTarget._id };
        }
        if (targetFollowsMe?.status === "pending") {
            return { status: "request_received_from_them", theirConnectionId: targetFollowsMe._id };
        }

        return { status: "none" };
    }
});
