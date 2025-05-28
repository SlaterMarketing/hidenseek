import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  profiles: defineTable({
    userId: v.id("users"),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    locationCity: v.optional(v.string()),
    locationRegion: v.optional(v.string()),
    locationCountry: v.optional(v.string()),
    experienceLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      )
    ),
    contactPreferences: v.optional(v.any()), // Consider a more specific schema
    profileImageId: v.optional(v.id("_storage")), 
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"]),

  game_sessions: defineTable({
    hostId: v.id("users"),
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
        v.literal("advanced")
      )
    ),
    specialRules: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("full"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    imageId: v.optional(v.id("_storage")), 
  })
    .index("by_hostId", ["hostId"])
    .index("by_status_and_scheduledTimestamp", ["status", "scheduledTimestamp"])
    .index("by_location", ["locationCountry", "locationRegion", "locationCity"]),

  session_participants: defineTable({
    sessionId: v.id("game_sessions"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending_approval"), 
      v.literal("confirmed"),         
      v.literal("declined"),          
      v.literal("cancelled_by_user")  
    ),
    joinedAt: v.optional(v.number()),
  })
    .index("by_sessionId_and_userId", ["sessionId", "userId"])
    .index("by_userId_and_sessionId", ["userId", "sessionId"])
    .index("by_sessionId_and_status", ["sessionId", "status"]),

  chat_messages: defineTable({
    sessionId: v.id("game_sessions"),
    userId: v.id("users"),
    messageText: v.string(),
  })
    .index("by_sessionId", ["sessionId"]), // Corrected: Removed _creationTime

  user_connections: defineTable({
    followerId: v.id("users"), 
    followingId: v.id("users"), 
    status: v.union(
      v.literal("pending"),   
      v.literal("accepted"),  
      v.literal("blocked")    
    ),
  })
    .index("by_followerId_and_followingId", ["followerId", "followingId"])
    .index("by_followingId_and_followerId", ["followingId", "followerId"]) 
    .index("by_followerId_and_status", ["followerId", "status"])
    .index("by_followingId_and_status", ["followingId", "status"]),

  user_ratings: defineTable({
    ratedUserId: v.id("users"), 
    raterUserId: v.id("users"), 
    sessionId: v.id("game_sessions"), 
    rating: v.number(), 
    comment: v.optional(v.string()),
  })
    .index("by_ratedUserId_and_sessionId", ["ratedUserId", "sessionId"])
    .index("by_raterUserId_and_sessionId", ["raterUserId", "sessionId"]),

  community_posts: defineTable({
    authorId: v.id("users"),
    title: v.optional(v.string()),
    content: v.string(),
    postType: v.optional(
      v.union(
        v.literal("general"),
        v.literal("strategy"),
        v.literal("meetup_report"),
        v.literal("question")
      )
    ),
    tags: v.optional(v.array(v.string())),
    likesCount: v.number(),
    commentsCount: v.number(),
    imageId: v.optional(v.id("_storage")), 
  })
    .index("by_authorId", ["authorId"])
    .index("by_postType", ["postType"]),
    
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
