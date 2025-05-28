import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { ProfileForm } from "./ProfileForm";
import { GameSessionsList } from "./GameSessionsList";
import { CommunityFeedPage } from "./CommunityFeedPage";
import { UserProfilePage } from "./UserProfilePage";
import { CreateGameSessionForm } from "./CreateGameSessionForm";
import { Toaster, toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

type ActiveView =
  | { type: "games"; showCreateModal?: boolean }
  | { type: "community" }
  | { type: "profile"; userId?: Id<"users"> }
  | { type: "edit-profile" };

export default function App() {
  const user = useQuery(api.auth.loggedInUser);
  const myProfile = useQuery(api.profiles.getMyProfile, user && user._id ? {} : "skip");

  const [activeView, setActiveView] = useState<ActiveView>({ type: "games" });
  const [_viewingUserId, setViewingUserId] = useState<Id<"users"> | null>(null);


  const handleNavigate = (view: ActiveView) => {
    setActiveView(view);
    if (view.type === "profile" && view.userId) {
      setViewingUserId(view.userId);
    } else if (view.type === "profile" && !view.userId && user?._id) {
      setViewingUserId(user._id);
    }
    else {
      setViewingUserId(null);
    }
  };

  const handleSessionCreated = (sessionId: Id<"game_sessions">) => {
    toast.success(`Game session created! ID: ${sessionId.substring(0,6)}...`);
    setActiveView({ type: "games", showCreateModal: false });
  };

  const handleViewUserProfile = (userIdToView: Id<"users">) => {
    setActiveView({ type: "profile", userId: userIdToView });
  };


  if (user === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
        <p className="text-gray-600">Loading authentication...</p>
      </div>
    );
  }

  if (user === null) {
    return <SignInForm />;
  }

  // Check if profile exists and is complete
  if (myProfile === undefined && user) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  if (user && myProfile && (myProfile === null || !myProfile.username || !myProfile.locationCity)) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
        <header className="w-full max-w-4xl mx-auto mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Welcome!</h1>
          <SignOutButton />
        </header>
        <main className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-center text-lg mb-6 text-gray-700">
            Please complete your profile to continue.
          </p>
          <ProfileForm />
        </main>
        <Toaster richColors position="bottom-right" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster richColors position="bottom-right" />

      {/* Modern Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-xl">🎲</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">
                  Game Night Planner
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">Plan • Play • Connect</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleNavigate({ type: "games" })}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeView.type === "games"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-primary hover:bg-gray-50"
                }`}
              >
                <span>🎮</span>
                <span>Games</span>
              </button>

              <button
                onClick={() => handleNavigate({ type: "community" })}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeView.type === "community"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-primary hover:bg-gray-50"
                }`}
              >
                <span>👥</span>
                <span>Community</span>
              </button>

              <button
                onClick={() => handleNavigate({ type: "profile", userId: user._id })}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeView.type === "profile" || activeView.type === "edit-profile"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-primary hover:bg-gray-50"
                }`}
              >
                <span>👤</span>
                <span>Profile</span>
              </button>

              <div className="ml-3 pl-3 border-l border-gray-200">
                <SignOutButton />
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-grow container mx-auto p-6 md:p-8 lg:p-10 min-h-full">
        {activeView.type === "games" && (
          <>
            <div className="mb-10">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
                <div>
                  <h1 className="text-4xl font-bold text-primary mb-3">Game Sessions</h1>
                  <p className="text-lg text-gray-600">Discover and join exciting game nights in your area</p>
                </div>
                <button
                  onClick={() => setActiveView({ type: "games", showCreateModal: true })}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md self-start sm:self-auto"
                >
                  <span>➕</span>
                  <span>Create Session</span>
                </button>
              </div>
            </div>
            <GameSessionsList onViewUserProfile={handleViewUserProfile} />
            {activeView.showCreateModal && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative border">
                   <button
                    onClick={() => setActiveView({ type: "games", showCreateModal: false })}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    aria-label="Close create session form"
                  >
                    ✕
                  </button>
                  <CreateGameSessionForm
                    onSessionCreated={handleSessionCreated}
                    onCancel={() => setActiveView({ type: "games", showCreateModal: false })}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeView.type === "community" && (
          <CommunityFeedPage onViewUserProfile={handleViewUserProfile} />
        )}

        {activeView.type === "profile" && activeView.userId && (
          <div className="max-w-3xl mx-auto">
            {activeView.userId === user._id && (
                 <div className="mb-8 flex justify-end">
                    <button
                        onClick={() => handleNavigate({ type: "edit-profile"})}
                        className="bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        ✏️ Edit Profile
                    </button>
                 </div>
            )}
            <UserProfilePage
              userId={activeView.userId}
              onViewUserProfile={handleViewUserProfile}
              onClose={activeView.userId !== user._id ? () => handleNavigate({type: "games"}) : undefined} // Only allow close if not own profile
            />
          </div>
        )}

        {activeView.type === "edit-profile" && myProfile && ( // Ensure myProfile is loaded
           <div className="max-w-2xl mx-auto">
            <ProfileForm />
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-gray-100 text-center p-6 mt-auto">
        <p className="text-gray-500">&copy; {new Date().getFullYear()} Game Night Planner. All rights reserved.</p>
      </footer>
    </div>
  );
}
