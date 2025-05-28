import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { GameSessionWithDetails } from "../convex/gameSessions";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

interface GameSessionCardProps {
  session: GameSessionWithDetails;
  currentUserId?: Id<"users">;
  onEdit: (session: GameSessionWithDetails) => void;
  onViewChat: (sessionId: Id<"game_sessions">, sessionTitle: string) => void;
  onViewUserProfile: (userId: Id<"users">) => void;
}

export function GameSessionCard({ session, currentUserId, onEdit, onViewChat, onViewUserProfile }: GameSessionCardProps) {
  const joinSessionMutation = useMutation(api.gameSessions.joinSession);
  const leaveSessionMutation = useMutation(api.gameSessions.leaveSession);
  const cancelSessionMutation = useMutation(api.gameSessions.cancelSession);
  const completeSessionMutation = useMutation(api.gameSessions.completeSession);

  const isHost = currentUserId === session.hostId;
  const isParticipant = session.participants?.some(p => p.userId === currentUserId && p.status === "confirmed");
  const hasRequestedToJoin = session.participants?.some(p => p.userId === currentUserId && p.status === "pending_approval");
  const canJoin = !isHost && !isParticipant && !hasRequestedToJoin && session.status === "open" && (session.participants?.filter(p=>p.status === "confirmed").length || 0) < session.maxPlayers;
  const canLeave = isParticipant && (session.status === "open" || session.status === "full");

  const handleJoinSession = async () => {
    try {
      await joinSessionMutation({ sessionId: session._id });
      toast.success("Successfully joined the session!");
    } catch (error: any) {
      toast.error(error.message || "Failed to join session.");
    }
  };

  const handleLeaveSession = async () => {
    if (window.confirm("Are you sure you want to leave this session?")) {
      try {
        await leaveSessionMutation({ sessionId: session._id });
        toast.success("Successfully left the session.");
      } catch (error: any) {
        toast.error(error.message || "Failed to leave session.");
      }
    }
  };

  const handleCancelSession = async () => {
    if (window.confirm("Are you sure you want to cancel this session? This cannot be undone.")) {
      try {
        await cancelSessionMutation({ sessionId: session._id });
        toast.success("Session cancelled successfully.");
      } catch (error: any) {
        toast.error(error.message || "Failed to cancel session.");
      }
    }
  };

  const handleCompleteSession = async () => {
    if (window.confirm("Are you sure you want to mark this session as completed?")) {
      try {
        await completeSessionMutation({ sessionId: session._id });
        toast.success("Session marked as completed.");
      } catch (error: any) {
        toast.error(error.message || "Failed to complete session.");
      }
    }
  };

  const confirmedParticipantsCount = session.participants?.filter(p => p.status === "confirmed").length || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full overflow-hidden border border-gray-100 relative">
      {/* Status pills in top right corner */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        {isParticipant && (session.status === "open" || session.status === "full" || session.status === "in_progress") && (
          <span className="bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">✅ Joined</span>
        )}
        {hasRequestedToJoin && (
          <span className="bg-yellow-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">⏳ Pending</span>
        )}
        {session.status === "cancelled" && (
          <span className="bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">❌ Cancelled</span>
        )}
        {session.status === "completed" && (
          <span className="bg-gray-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">✅ Completed</span>
        )}
        {session.status === "full" && !isParticipant && !isHost && (
          <span className="bg-blue-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">👥 Full</span>
        )}
      </div>

      {session.imageUrl && (
        <div className="relative">
          <img src={session.imageUrl} alt={session.title} className="w-full h-40 object-cover" />
          <div className="absolute top-3 left-3">
            {session.status === "open" && <span className="bg-green-500/90 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">Open</span>}
            {session.status === "in_progress" && <span className="bg-yellow-500/90 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">In Progress</span>}
          </div>
        </div>
      )}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-primary mb-3">{session.title}</h3>
        <div className="space-y-2.5 mb-4">
          <p className="text-sm text-gray-600 flex items-center">
            <span className="font-medium text-gray-700 mr-2">Host:</span>
            <button onClick={() => onViewUserProfile(session.hostId)} className="text-primary hover:text-primary/80 hover:underline transition-colors">
              {session.hostDisplayName || session.hostUsername || "Host"}
            </button>
          </p>
          <p className="text-sm text-gray-600 flex items-center">
            <span className="font-medium text-gray-700 mr-2">📍 Location:</span>
            {session.locationCity}, {session.locationRegion}, {session.locationCountry}
          </p>
          <p className="text-sm text-gray-600 flex items-center">
            <span className="font-medium text-gray-700 mr-2">⏰ When:</span>
            {new Date(session.scheduledTimestamp).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 flex items-center">
            <span className="font-medium text-gray-700 mr-2">👥 Players:</span>
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
              confirmedParticipantsCount >= session.maxPlayers
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {confirmedParticipantsCount} / {session.maxPlayers}
            </span>
          </p>
          {session.difficultyLevel && (
            <p className="text-sm text-gray-600 flex items-center">
              <span className="font-medium text-gray-700 mr-2">🎯 Difficulty:</span>
              <span className="capitalize bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-200">
                {session.difficultyLevel}
              </span>
            </p>
          )}
        </div>
        {session.description && (
          <p className="text-sm text-gray-600 mb-4 flex-grow bg-gray-50 p-3 rounded-md border">
            {session.description.substring(0,120)}{session.description.length > 120 ? "..." : ""}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2 items-center justify-center">
            {isHost && session.status === "open" && (
              <>
                <button onClick={() => onEdit(session)} className="btn btn-outline btn-sm">✏️ Edit</button>
                <button onClick={() => void handleCancelSession()} className="btn btn-danger btn-sm">❌ Cancel</button>
              </>
            )}
             {isHost && session.status === "full" && (
              <button onClick={() => void handleCancelSession()} className="btn btn-danger btn-sm">❌ Cancel</button>
            )}
            {(isHost || isParticipant) && (session.status === "open" || session.status === "full" || session.status === "in_progress") && (
                 <button onClick={() => onViewChat(session._id, session.title)} className="btn btn-secondary btn-sm">💬 Chat</button>
            )}
            {isHost && session.status === "in_progress" && (
                <button onClick={() => void handleCompleteSession()} className="btn btn-primary btn-sm">✅ Complete</button>
            )}

            {canJoin && <button onClick={() => void handleJoinSession()} className="btn btn-primary btn-sm">🎮 Join Game</button>}
            {canLeave && <button onClick={() => void handleLeaveSession()} className="btn btn-outline btn-sm">🚪 Leave</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
