import React from "react";

const NoChatSelected = () => {
  return (
    <div className="flex items-center justify-center h-full w-full bg-base-100">
      <div className="text-center">
        <div className="text-6xl mb-4 text-base-content/40">💬</div>
        <h2 className="text-2xl font-semibold text-base-content/70">
          No Chat Selected
        </h2>
        <p className="text-sm text-base-content/50 mt-2">
          Select a user from the left to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
