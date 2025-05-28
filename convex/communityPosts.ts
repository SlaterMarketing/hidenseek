import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server"; 

// --- Mutations ---

export const createPost = mutation({
  args: {
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
    imageId: v.optional(v.id("_storage")), // Added
  },
  handler: async (ctx, args) => {
    const authorId = await getAuthUserId(ctx);
    if (!authorId) {
      throw new Error("User not authenticated.");
    }
    if (args.content.trim() === "") {
        throw new Error("Post content cannot be empty.");
    }

    const postId = await ctx.db.insert("community_posts", {
      authorId,
      title: args.title,
      content: args.content,
      postType: args.postType ?? "general",
      tags: args.tags,
      likesCount: 0,
      commentsCount: 0, 
      imageId: args.imageId, // Added
    });
    return postId;
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("community_posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    postType: v.optional(
      v.union(
        v.literal("general"),
        v.literal("strategy"),
        v.literal("meetup_report"),
        v.literal("question")
      )
    ),
    tags: v.optional(v.array(v.string())),
    imageId: v.optional(v.union(v.id("_storage"), v.null())), // Added
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found.");
    }
    if (post.authorId !== userId) {
      throw new Error("Not authorized to update this post.");
    }
     if (args.content && args.content.trim() === "") {
        throw new Error("Post content cannot be empty.");
    }

    const { postId, ...updates } = args;
    const updateData: Partial<Omit<Doc<"community_posts">, "_id" | "_creationTime">> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.postType !== undefined) updateData.postType = updates.postType;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.imageId !== undefined) { // Check if imageId is part of updates
        updateData.imageId = updates.imageId === null ? undefined : updates.imageId;
    }


    await ctx.db.patch(args.postId, updateData);
    return true;
  },
});

export const deletePost = mutation({
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found.");
    }
    if (post.authorId !== userId) {
      throw new Error("Not authorized to delete this post.");
    }
    // If post had an image, it's not deleted from storage automatically by Convex
    // Consider a cleanup mechanism if storage becomes an issue (e.g. a cron job for orphaned files)
    if (post.imageId) {
        // await ctx.storage.delete(post.imageId); // If you want to delete from storage
    }
    await ctx.db.delete(args.postId);
    return true;
  },
});

export const likePost = mutation({
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found.");
    }
    // TODO: Implement a proper liking system (e.g., a `post_likes` table)
    // This current implementation just increments a counter and doesn't prevent multiple likes by the same user.
    await ctx.db.patch(args.postId, { likesCount: post.likesCount + 1 });
    return true;
  },
});

export const unlikePost = mutation({ // This is a simple unlike, assumes no tracking of who liked.
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found.");
    }
    if (post.likesCount > 0) {
      await ctx.db.patch(args.postId, { likesCount: post.likesCount - 1 });
    }
    return true;
  },
});


// --- Queries ---

export type PostWithAuthorAndImageUrl = Doc<"community_posts"> & {
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  imageUrl: string | null;
};


export const listPosts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    postType: v.optional(
      v.union(
        v.literal("general"),
        v.literal("strategy"),
        v.literal("meetup_report"),
        v.literal("question")
      )
    ),
    authorId: v.optional(v.id("users")),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ page: PostWithAuthorAndImageUrl[], isDone: boolean, continueCursor: string}> => {
    let paginatedQuery;

    if (args.postType) {
      paginatedQuery = ctx.db
        .query("community_posts")
        .withIndex("by_postType", (q) => q.eq("postType", args.postType!))
        .order("desc"); 
    } else if (args.authorId) {
      paginatedQuery = ctx.db
        .query("community_posts")
        .withIndex("by_authorId", (q) => q.eq("authorId", args.authorId!))
        .order("desc"); 
    } else {
      // Default: by creation time (implicitly via .order("desc") on primary table scan if no other index used)
      // For better performance on general listing, consider an index on _creationTime if not relying on default.
      // However, Convex automatically includes _creationTime in other indexes, so "desc" on those might be efficient.
      paginatedQuery = ctx.db
        .query("community_posts")
        .order("desc"); 
    }
    
    const pageResult = await paginatedQuery.paginate(args.paginationOpts);

    const postsWithDetails: PostWithAuthorAndImageUrl[] = await Promise.all(
      pageResult.page.map(async (post: Doc<"community_posts">) => {
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", post.authorId))
          .unique();
        const authorUser = await ctx.db.get(post.authorId);
        
        const imageUrl = post.imageId ? await ctx.storage.getUrl(post.imageId) : null;
        const authorProfileImageUrl = authorProfile?.profileImageId ? await ctx.storage.getUrl(authorProfile.profileImageId) : null;

        return {
          ...post,
          authorUsername: authorProfile?.username ?? authorUser?.name ?? "Unknown",
          authorDisplayName: authorProfile?.displayName ?? authorUser?.name ?? "Unknown User",
          authorProfileImageUrl,
          imageUrl,
        };
      })
    );
    
    let filteredPosts = postsWithDetails;
    if (args.tag && args.tag.trim() !== "") {
        // This client-side filtering after pagination is not ideal for large datasets.
        // For robust tag filtering, consider a search index or a many-to-many table for tags.
        filteredPosts = postsWithDetails.filter((p) => p.tags && p.tags.includes(args.tag!));
    }

    return {
        ...pageResult,
        page: filteredPosts,
    };
  },
});

export const getPostDetails = query({
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args): Promise<PostWithAuthorAndImageUrl | null> => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return null;
    }
    const authorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", post.authorId))
      .unique();
    const authorUser = await ctx.db.get(post.authorId);
    
    const imageUrl = post.imageId ? await ctx.storage.getUrl(post.imageId) : null;
    const authorProfileImageUrl = authorProfile?.profileImageId ? await ctx.storage.getUrl(authorProfile.profileImageId) : null;
    
    return {
      ...post,
      authorUsername: authorProfile?.username ?? authorUser?.name ?? "Unknown",
      authorDisplayName: authorProfile?.displayName ?? authorUser?.name ?? "Unknown User",
      authorProfileImageUrl,
      imageUrl,
    };
  },
});
