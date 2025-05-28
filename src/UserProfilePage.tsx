import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id, Doc } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { CommunityPostCard } from "./CommunityPostCard"; 
import { PostWithAuthorAndImageUrl } from "../convex/communityPosts"; // Corrected import


interface UserProfilePageProps {
  userId: Id<"users">;
  onClose?: () => void; 
  onViewUserProfile: (userId: Id<"users">) => void; 
}

export function UserProfilePage({ userId, onClose, onViewUserProfile }: UserProfilePageProps) {
  const profileResult = useQuery(api.profiles.getUserProfileById, { userId });
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const connectionStatus = useQuery(api.userConnections.getConnectionStatusWithUser, loggedInUser ? { targetUserId: userId } : "skip");
  
  const userPostsResult = useQuery(api.communityPosts.listPosts, { authorId: userId, paginationOpts: {numItems: 10, cursor: null } });
  const averageRating = useQuery(api.userRatings.getAverageRatingForUser, { userId });


  const requestConnection = useMutation(api.userConnections.requestConnection);
  const acceptConnectionRequest = useMutation(api.userConnections.acceptConnectionRequest);
  const declineOrCancelConnectionRequest = useMutation(api.userConnections.declineOrCancelConnectionRequest);
  const removeConnection = useMutation(api.userConnections.removeConnection);
  const blockUser = useMutation(api.userConnections.blockUser);
  const unblockUser = useMutation(api.userConnections.unblockUser);

  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const handleAction = async (action: () => Promise<any>, successMessage: string) => {
    setIsLoadingAction(true);
    try {
      await action();
      toast.success(successMessage);
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setIsLoadingAction(false);
    }
  };

  if (profileResult === undefined || connectionStatus === undefined || loggedInUser === undefined || userPostsResult === undefined || averageRating === undefined) {
    return <div className="p-4 text-center">Loading profile...</div>;
  }

  if (profileResult === null) {
    return <div className="p-4 text-center text-red-500">User profile not found.</div>;
  }

  const { username, displayName, bio, locationCity, locationRegion, locationCountry, experienceLevel, user, profileImageUrl } = profileResult;
  const isOwnProfile = loggedInUser?._id === userId;

  const renderConnectionButton = () => {
    if (isOwnProfile || !loggedInUser || !connectionStatus) return null;

    switch (connectionStatus.status) {
      case "none":
        return <button onClick={() => handleAction(() => requestConnection({ followingId: userId }), "Connection request sent!")} disabled={isLoadingAction} className="btn btn-primary">Follow</button>;
      case "request_sent_by_me":
        return <button onClick={() => handleAction(() => declineOrCancelConnectionRequest({ connectionId: connectionStatus.myConnectionId! }), "Request cancelled")} disabled={isLoadingAction} className="btn btn-outline">Cancel Request</button>;
      case "request_received_from_them":
        return (
          <div className="flex gap-2">
            <button onClick={() => handleAction(() => acceptConnectionRequest({ connectionId: connectionStatus.theirConnectionId! }), "Request accepted!")} disabled={isLoadingAction} className="btn btn-primary">Accept</button>
            <button onClick={() => handleAction(() => declineOrCancelConnectionRequest({ connectionId: connectionStatus.theirConnectionId! }), "Request declined")} disabled={isLoadingAction} className="btn btn-outline">Decline</button>
          </div>
        );
      case "following_them": 
         return <button onClick={() => handleAction(() => removeConnection({ targetUserId: userId }), "Unfollowed user")} disabled={isLoadingAction} className="btn btn-outline">Unfollow</button>;
      case "followed_by_them": 
         return <button onClick={() => handleAction(() => requestConnection({ followingId: userId }), "Follow request sent!")} disabled={isLoadingAction} className="btn btn-primary">Follow Back</button>;
      case "friends":
        return <button onClick={() => handleAction(() => removeConnection({ targetUserId: userId }), "Unfollowed user")} disabled={isLoadingAction} className="btn btn-outline">Unfollow</button>;
      case "blocked_by_me":
        return <button onClick={() => handleAction(() => unblockUser({ targetUserId: userId }), "User unblocked")} disabled={isLoadingAction} className="btn btn-outline">Unblock</button>;
      case "blocked_by_them":
        return <p className="text-sm text-red-500">This user has blocked you.</p>;
      default:
        return null;
    }
  };


  return (
    <div className="space-y-6 p-4 md:p-6 bg-white shadow-lg rounded-lg">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {profileImageUrl ? (
          <img src={profileImageUrl} alt={displayName || username || "Profile"} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-2 border-primary" />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-300 flex items-center justify-center text-4xl text-white">
            {(displayName || username || user?.name)?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-bold text-primary">{displayName || username || user?.name || "User Profile"}</h2>
            {onClose && <button onClick={onClose} className="text-sm text-gray-500 hover:text-primary">&times; Close</button>}
          </div>
          {username && <p className="text-md text-gray-600">@{username}</p>}
          {!isOwnProfile && loggedInUser && connectionStatus?.status !== "blocked_by_me" && connectionStatus?.status !== "blocked_by_them" && (
              <button 
                  onClick={() => handleAction(() => blockUser({ targetUserId: userId }), "User blocked. You may need to refresh to see all changes.")} 
                  disabled={isLoadingAction} 
                  className="text-xs text-red-500 hover:underline mt-1"
              >
                  Block User
              </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">About</h3>
          {bio && <p className="text-gray-700 whitespace-pre-wrap">{bio}</p>}
          {!bio && <p className="text-gray-500 italic">No bio provided.</p>}
          
          <div className="mt-4 space-y-1">
            {locationCity && locationRegion && locationCountry && (
              <p className="text-sm text-gray-600"><strong>Location:</strong> {locationCity}, {locationRegion}, {locationCountry}</p>
            )}
            {experienceLevel && (
              <p className="text-sm text-gray-600"><strong>Experience:</strong> {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)}</p>
            )}
           {averageRating && (
            <p className="text-sm text-gray-600 mt-2">
              <strong>Average Rating:</strong> {averageRating.count > 0 ? `${averageRating.average.toFixed(1)}/5 (${averageRating.count} ratings)` : "Not yet rated"}
            </p>
          )}
          </div>
        </div>
        
        {!isOwnProfile && (
          <div className="md:text-right mt-4 md:mt-0">
            {renderConnectionButton()}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6 border-t pt-4">Recent Posts</h3>
        {userPostsResult && userPostsResult.page.length > 0 ? (
          <div className="space-y-4">
            {userPostsResult.page.map((post) => (
              <CommunityPostCard key={post._id} post={post as PostWithAuthorAndImageUrl} onViewUserProfile={onViewUserProfile} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">This user hasn't made any posts yet.</p>
        )}
      </div>
    </div>
  );
}
