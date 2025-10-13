// lib/socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const userSocketMap = {}; // { userId: [socketIds...] }

export const getReceiverSocketId = (userId) => userSocketMap[userId] || [];
export const getUserSocketMap = () => userSocketMap;

export const findSocketsForUser = (userId) => {
  if (!userId) return [];
  const id = String(userId);
  if (userSocketMap[id]?.length) return userSocketMap[id];

  const match = Object.entries(userSocketMap).find(
    ([k]) => k.includes(id) || k.endsWith(id)
  );
  if (match) return match[1];

  try {
    return Array.from(io.sockets.sockets.values())
      .filter((sock) => {
        const uid = String(
          sock.data?.userId || sock.handshake?.query?.userId || ""
        );
        return uid === id || uid.includes(id) || uid.endsWith(id);
      })
      .map((sock) => sock.id);
  } catch {
    return [];
  }
};

const io = new Server(server, {
  cors: {
    origin: (origin, cb) =>
      !origin || origin.startsWith("http://localhost")
        ? cb(null, true)
        : cb(null, true),
    credentials: true,
  },
});

const addSocket = (userId, socketId) => {
  if (!userId) return;
  const id = String(userId);
  userSocketMap[id] ??= [];
  if (!userSocketMap[id].includes(socketId)) userSocketMap[id].push(socketId);
};

const removeSocket = (userId, socketId) => {
  if (!userId || !userSocketMap[userId]) return;
  userSocketMap[userId] = userSocketMap[userId].filter((id) => id !== socketId);
  if (!userSocketMap[userId].length) delete userSocketMap[userId];
};

const broadcastOnlineUsers = () =>
  io.emit("onlineUsers", Object.keys(userSocketMap));

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);
  let userId = null;

  // --- JWT Auth ---
  try {
    const cookies = Object.fromEntries(
      (socket.handshake.headers.cookie || "").split(";").map((c) => {
        const [k, ...v] = c.split("=");
        return [k?.trim(), v?.join("=")];
      })
    );
    const token = cookies.jwt || socket.handshake.query?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded?.userId ? String(decoded.userId) : null;
    }
  } catch (err) {
    console.warn("JWT verify failed:", err.message);
  }

  // --- Fallback to query userId ---
  userId ||= socket.handshake.query.userId;
  if (userId) {
    addSocket(userId, socket.id);
    socket.data.userId = String(userId);
  } else {
    console.log("⚠️ Unauthenticated socket:", socket.id);
  }

  broadcastOnlineUsers();

  socket.on("register", (uid) => {
    if (!uid) return;
    addSocket(uid, socket.id);
    socket.data.userId = String(uid);
    broadcastOnlineUsers();
  });

  socket.on("sendMessage", ({ receiverId, text, image }) => {
    const payload = {
      senderId: userId,
      receiverId,
      text,
      ...(image && { image }),
    };
    getReceiverSocketId(receiverId).forEach((id) =>
      io.to(id).emit("receiveMessage", payload)
    );
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    removeSocket(userId, socket.id);
    removeSocket(socket.data?.userId, socket.id);
    broadcastOnlineUsers();
  });
});

export { io, app, server };
