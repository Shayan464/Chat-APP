import React, { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";

const ChatContainer = () => {
  const { messages, getMessages, selectedUser, isMessagesLoading } =
    useChatStore();
  const authUser = useAuthStore((state) => state.authUser);
  const messageEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 border-l border-zinc-700">
      <ChatHeader user={selectedUser} />
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-900">
        {isMessagesLoading && (
          <div className="text-center text-zinc-500">Loading messages...</div>
        )}

        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${
              // Message is from the other user if senderId matches selectedUser
              msg.senderId === selectedUser._id
                ? "justify-start"
                : "justify-end"
            }`}
          >
            <div
              className={`p-2 rounded-lg max-w-xs break-words ${
                // If message sender is the current auth user, style as outgoing
                msg.senderId === authUser?._id
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-700 text-white"
              }`}
            >
              {msg.text && <p>{msg.text}</p>}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Sent"
                  className="mt-2 w-48 h-48 object-cover rounded-lg"
                />
              )}
            </div>
          </div>
        ))}
        <div ref={messageEndRef}></div>
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
