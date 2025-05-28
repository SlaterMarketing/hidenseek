import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { GameSessionCard } from "./GameSessionCard";
import { EditGameSessionForm } from "./EditGameSessionForm";
import { Doc, Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { ChatRoom } from "./ChatRoom";
import { GameSessionWithDetails } from "../convex/gameSessions"; 

interface GameSessionsListProps {
  onViewUserProfile: (userId: Id<"users">) => void;
}

export function GameSessionsList({ onViewUserProfile }: GameSessionsListProps) {
  // Using suggested listOpenGameSessions
  const gameSessions = useQuery(api.gameSessions.listOpenGameSessions); 
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const [editingSession, setEditingSession] = useState<GameSessionWithDetails | null>(null);
  const [viewingChatSession, setViewingChatSession] = useState<{id: Id<"game_sessions">, title: string} | null>(null);


  const handleSessionUpdated = () => {
    setEditingSession(null);
    toast.success("Session updated!");
  };

  if (gameSessions === undefined || loggedInUser === undefined) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Loading game sessions...</p>
      </div>
    );
  }

  if (gameSessions.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Game Sessions Yet</h2>
        <p className="text-gray-500">Why not be the first to create one?</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-primary mb-6 text-center">Available Game Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gameSessions.map((session: GameSessionWithDetails) => ( 
            <GameSessionCard 
              key={session._id} 
              session={session} 
              currentUserId={loggedInUser?._id}
              onEdit={() => setEditingSession(session)}
              onViewChat={() => setViewingChatSession({id: session._id, title: session.title})}
              onViewUserProfile={onViewUserProfile}
            />
          ))}
        </div>
      </div>

      {editingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           <div className="bg-white p-0 rounded-lg shadow-xl w-full max-w-2xl relative">
             <button 
                onClick={() => setEditingSession(null)} 
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl z-10"
                aria-label="Close edit session form"
              >
                &times;
              </button>
            <EditGameSessionForm
              session={editingSession}
              onSessionUpdated={handleSessionUpdated}
              onCancel={() => setEditingSession(null)}
            />
          </div>
        </div>
      )}

      {viewingChatSession && loggedInUser && (
        <ChatRoom 
          sessionId={viewingChatSession.id}
          sessionTitle={viewingChatSession.title}
          onClose={() => setViewingChatSession(null)}
        />
      )}
    </div>
  );
}
