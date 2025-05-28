import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { PostWithAuthorAndImageUrl } from "../convex/communityPosts"; // Updated import

interface CommunityPostCardProps {
  post: PostWithAuthorAndImageUrl; // Updated type
  onViewUserProfile: (userId: Id<"users">) => void;
  // onOpenComments?: (postId: Id<"community_posts">) => void; // Future use
}

export function CommunityPostCard({ post, onViewUserProfile }: CommunityPostCardProps) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const likePostMutation = useMutation(api.communityPosts.likePost);
  const deletePostMutation = useMutation(api.communityPosts.deletePost);

  const isAuthor = loggedInUser?._id === post.authorId;

  const handleLike = async () => {
    if (!loggedInUser) {
      toast.error("You must be logged in to like posts.");
      return;
    }
    try {
      await likePostMutation({ postId: post._id });
      // Optimistic update or rely on Convex reactivity
    } catch (error: any) {
      toast.error(error.message || "Failed to like post.");
    }
  };

  // const handleUnlike = async () => { // Future use if we track individual likes
  //   // ...
  // };

  const handleDelete = async () => {
    if (!isAuthor) return;
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePostMutation({ postId: post._id });
        toast.success("Post deleted.");
      } catch (error: any) {
        toast.error(error.message || "Failed to delete post.");
      }
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3 mb-4">
        {post.authorProfileImageUrl ? (
          <img
            src={post.authorProfileImageUrl}
            alt={post.authorDisplayName}
            className="w-12 h-12 rounded-full object-cover cursor-pointer ring-2 ring-gray-100"
            onClick={() => onViewUserProfile(post.authorId)}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold cursor-pointer ring-2 ring-gray-100"
            onClick={() => onViewUserProfile(post.authorId)}
          >
            {post.authorDisplayName?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => onViewUserProfile(post.authorId)}
                className="font-semibold text-gray-900 hover:text-primary transition-colors"
              >
                {post.authorDisplayName}
              </button>
              <p className="text-sm text-gray-500">
                @{post.authorUsername}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <time className="text-sm text-gray-500">
                {new Date(post._creationTime).toLocaleDateString()}
              </time>
              {isAuthor && (              <button
                onClick={() => void handleDelete()}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Delete post"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {post.title && (
          <h3 className="text-xl font-semibold text-gray-900 leading-tight">{post.title}</h3>
        )}

        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {post.imageUrl && (
          <div className="rounded-lg overflow-hidden">
            <img
              src={post.imageUrl}
              alt="Post image"
              className="w-full h-auto object-cover max-h-96"
            />
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
        <div className="flex space-x-6">
          <button
            onClick={() => void handleLike()}
            className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-sm font-medium">{post.likesCount}</span>
          </button>
          {/* Comments feature can be added here in the future */}
        </div>

        <div className="text-sm text-gray-500">
          {new Date(post._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
