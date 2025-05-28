import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// --- Mutations ---

export const sendMessageToSessionChat = mutation({
  args: {
    sessionId: v.id("game_sessions"),
    messageText: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated. Cannot send message.");
    }
    if (args.messageText.trim() === "") {
      throw new Error("Message text cannot be empty.");
    }

    const gameSession = await ctx.db.get(args.sessionId);
    if (!gameSession) {
      throw new Error("Game session not found.");
    }

    // Check if user is a participant or host
    const participantRecord = await ctx.db
      .query("session_participants")
      .withIndex("by_sessionId_and_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId)
      )
      .unique();

    if (!participantRecord && gameSession.hostId !== userId) {
      throw new Error("You are not part of this game session's chat.");
    }
    if (participantRecord && participantRecord.status !== "confirmed" && gameSession.hostId !== userId) {
        throw new Error("Your participation is not confirmed for this session's chat.");
    }


    await ctx.db.insert("chat_messages", { 
      sessionId: args.sessionId,
      userId: userId,
      messageText: args.messageText,
    });
    return true;
  },
});


// --- Queries ---

export type ChatMessageWithAuthorDetails = Doc<"chat_messages"> & {
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  isOwnMessage: boolean;
};

export const listMessagesForSession = query({
  args: { sessionId: v.id("game_sessions") },
  handler: async (ctx, args): Promise<ChatMessageWithAuthorDetails[]> => {
    const currentUserId = await getAuthUserId(ctx); 

    const messages = await ctx.db
      .query("chat_messages") 
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId)) // Corrected: Use the new index name
      .order("asc") // Convex automatically orders by _creationTime with this index
      .collect();

    const messagesWithDetails = await Promise.all(
      messages.map(async (message) => {
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", message.userId))
          .unique();
        const authorUser = await ctx.db.get(message.userId);
        
        const authorProfileImageUrl = authorProfile?.profileImageId 
          ? await ctx.storage.getUrl(authorProfile.profileImageId) 
          : null;

        return {
          ...message,
          authorUsername: authorProfile?.username ?? authorUser?.name ?? "Unknown",
          authorDisplayName: authorProfile?.displayName ?? authorUser?.name ?? "User",
          authorProfileImageUrl,
          isOwnMessage: message.userId === currentUserId,
        };
      })
    );
    return messagesWithDetails;
  },
});

// Helper to ensure user is authenticated and has a profile for actions requiring it
export const internalEnsureUserHasProfile = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated.");
        }
        const userProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique();
        if (!userProfile || !userProfile.username) {
            throw new Error(
                "Profile incomplete. Please set your username in your profile before proceeding."
            );
        }
        return { userId, userProfile };
    },
});
