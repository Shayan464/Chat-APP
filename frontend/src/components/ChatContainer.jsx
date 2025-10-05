import React, { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import { useRef } from "react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (!selectedUser?._id) return;
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    selectedUser?._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages)
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Select a chat to start messaging
      </div>
    );
  }

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">Loading...</div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg._id}
            ref={messageEndRef}
            className={`p-2 rounded-lg max-w-[60%] ${
              msg.senderId === selectedUser._id
                ? "bg-base-200 self-start"
                : "bg-primary text-primary-content self-end"
            }`}
          >
            {msg.text && <p>{msg.text}</p>}
            {msg.image && (
              <img
                src={msg.image}
                alt="msg"
                className="mt-2 rounded-lg max-w-full"
              />
            )}
          </div>
        ))}
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
