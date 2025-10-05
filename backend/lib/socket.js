// lib/socket.js
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Map userId -> array of socketIds
const userSocketMap = {}; // { userId: [socketId1, socketId2] }

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId] || [];
};

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  const userId = socket.handshake.query.userId;

  if (userId) {
    if (!userSocketMap[userId]) userSocketMap[userId] = [];
    userSocketMap[userId].push(socket.id);
    console.log(`User ${userId} mapped to socket(s):`, userSocketMap[userId]);
  }

  // notify all clients of current online users
  io.emit("onlineUsers", Object.keys(userSocketMap));

  // Listen for messages
  socket.on("sendMessage", ({ receiverId, text }) => {
    const sockets = getReceiverSocketId(receiverId);
    sockets.forEach((id) => {
      io.to(id).emit("receiveMessage", { senderId: userId, text });
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    if (userId && userSocketMap[userId]) {
      userSocketMap[userId] = userSocketMap[userId].filter(
        (id) => id !== socket.id
      );
      if (userSocketMap[userId].length === 0) delete userSocketMap[userId];
    }
    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
