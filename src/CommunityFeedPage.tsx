import { useMutation, useAction } from "convex/react"; // Added useAction
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { FormEvent, useState, useRef } from "react";
import { toast } from "sonner";
import { CommunityPostCard } from "./CommunityPostCard";
import { usePaginatedQuery } from "convex/react";

interface CommunityFeedPageProps {
  onViewUserProfile: (userId: Id<"users">) => void;
}

const ITEMS_PER_PAGE = 5;

export function CommunityFeedPage({ onViewUserProfile }: CommunityFeedPageProps) {
  const {
    results: posts,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.communityPosts.listPosts,
    {},
    { initialNumItems: ITEMS_PER_PAGE }
  );

  const createPostMutation = useMutation(api.communityPosts.createPost);
  const generateUploadUrl = useAction(api.files.actionGenerateUploadUrl); // Changed to useAction

  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostImageFile, setNewPostImageFile] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [isPosting, setIsPosting] = useState(false);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewPostImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewPostImageFile(null);
      setNewPostImagePreview(null);
    }
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (newPostContent.trim() === "") {
      toast.error("Post content cannot be empty.");
      return;
    }
    setIsPosting(true);
    try {
      let imageId: Id<"_storage"> | undefined = undefined;
      if (newPostImageFile) {
        const uploadUrl = await generateUploadUrl(); // Call useAction result
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": newPostImageFile.type },
          body: newPostImageFile,
        });
        const uploadJson = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed: ${JSON.stringify(uploadJson)}`);
        }
        imageId = uploadJson.storageId;
      }

      await createPostMutation({
        content: newPostContent,
        title: newPostTitle || undefined,
        imageId: imageId
      });
      setNewPostContent("");
      setNewPostTitle("");
      setNewPostImageFile(null);
      setNewPostImagePreview(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      toast.success("Post created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create post.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary">Community Feed</h2>
        <p className="text-gray-600 mt-2">Connect with fellow gamers and share your experiences</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content - Posts */}
        <div className="lg:col-span-2 space-y-6">
          {status === "LoadingFirstPage" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          )}

          <div className="space-y-6">
            {posts.map((post) => (
              <CommunityPostCard key={post._id} post={post} onViewUserProfile={onViewUserProfile} />
            ))}
          </div>

          {/* Load more button */}
          {status === "CanLoadMore" && (
            <div className="text-center pt-6">
              <button
                onClick={() => void loadMore(ITEMS_PER_PAGE)}
                disabled={false}
                className="btn btn-outline"
              >
                Load More Posts
              </button>
            </div>
          )}

          {status === "LoadingMore" && (
            <div className="text-center pt-6">
              <button
                disabled={true}
                className="btn btn-outline"
              >
                Loading...
              </button>
            </div>
          )}

          {status !== "CanLoadMore" && status !== "LoadingMore" && posts.length > 0 && (
            <p className="text-center text-gray-500 py-6">No more posts to load.</p>
          )}

          {posts.length === 0 && status !== "LoadingFirstPage" && status !== "LoadingMore" && (
            <div className="text-center py-12">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No posts yet</p>
                <p className="text-gray-400 mt-1">Be the first to share something with the community!</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Create Post */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <form onSubmit={(e) => void handleCreatePost(e)} className="bg-white shadow-sm rounded-lg p-6 space-y-4 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Create Post</h3>
              </div>

              <div>
                <label htmlFor="postTitle" className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
                <input
                  id="postTitle"
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="input-base"
                  placeholder="Give your post a title..."
                />
              </div>

              <div>
                <label htmlFor="postContent" className="block text-sm font-medium text-gray-700 mb-2">What's on your mind? <span className="text-red-500">*</span></label>
                <textarea
                  id="postContent"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={4}
                  className="input-base resize-none"
                  placeholder="Share your thoughts, game experiences, or ask a question..."
                  required
                />
              </div>

              <div>
                <label htmlFor="postImage" className="block text-sm font-medium text-gray-700 mb-2">Add Image</label>
                <input
                  id="postImage"
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleImageFileChange}
                  className="file-input"
                />
                {newPostImagePreview && (
                  <div className="mt-3">
                    <div className="relative">
                      <img src={newPostImagePreview} alt="Post preview" className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewPostImageFile(null);
                          setNewPostImagePreview(null);
                          if(imageInputRef.current) imageInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full btn btn-primary"
                disabled={isPosting}
              >
                {isPosting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Posting...
                  </span>
                ) : (
                  "Share Post"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
