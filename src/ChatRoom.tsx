import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { ChatMessageWithAuthorDetails } from "../convex/chat"; // Import the type

interface ChatRoomProps {
  sessionId: Id<"game_sessions">;
  sessionTitle: string;
  onClose: () => void;
}

export function ChatRoom({ sessionId, sessionTitle, onClose }: ChatRoomProps) {
  const messages = useQuery(api.chat.listMessagesForSession, { sessionId });
  const sendMessageMutation = useMutation(api.chat.sendMessageToSessionChat);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newMessageText.trim() === "") return;
    setIsSending(true);

    sendMessageMutation({
      sessionId: sessionId,
      messageText: newMessageText,
    }).then(() => {
      setNewMessageText("");
    }).catch((error: any) => {
      toast.error(error.message || "Failed to send message.");
    }).finally(() => {
      setIsSending(false);
    });
  };

  if (messages === undefined || loggedInUser === undefined) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[85vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-primary rounded-t-lg">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <span>{sessionTitle}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg: ChatMessageWithAuthorDetails) => (
              <div key={msg._id} className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] ${msg.isOwnMessage ? "ml-12" : "mr-12"}`}>
                  {!msg.isOwnMessage && (
                    <div className="flex items-center mb-1">
                      {msg.authorProfileImageUrl ? (
                        <img
                          src={msg.authorProfileImageUrl}
                          alt={msg.authorDisplayName}
                          className="w-6 h-6 rounded-full mr-2 object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary mr-2 flex items-center justify-center text-xs text-white font-medium">
                          {msg.authorDisplayName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-600">{msg.authorDisplayName}</span>
                    </div>
                  )}
                  <div className={`p-3 rounded-lg shadow-sm ${
                    msg.isOwnMessage
                      ? "bg-primary text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}>
                    <p className="text-sm leading-relaxed break-words">{msg.messageText}</p>
                    <p className={`text-xs mt-2 ${
                      msg.isOwnMessage ? "text-blue-100" : "text-gray-500"
                    } ${msg.isOwnMessage ? 'text-right' : 'text-left'}`}>
                      {new Date(msg._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessageText.trim() && !isSending) {
                      handleSubmit(e as any);
                    }
                  }
                }}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none bg-white text-gray-900"
                disabled={isSending}
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-white hover:bg-opacity-90 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shrink-0"
              disabled={isSending || !newMessageText.trim()}
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
