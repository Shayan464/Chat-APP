// lib/socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Map userId -> array of socketIds
const userSocketMap = {}; // { userId: [socketId1, socketId2] }

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId] || [];
};

// Export the whole map for debugging (avoid in production)
export const getUserSocketMap = () => userSocketMap;

// Robust lookup: try exact match, then try to find a key that includes the provided id
export const findSocketsForUser = (userId) => {
  if (!userId) return [];
  const idStr = String(userId);
  // Exact match
  if (userSocketMap[idStr] && userSocketMap[idStr].length > 0)
    return userSocketMap[idStr];

  // Fallback: find by suffix or includes (covers cases where keys are ObjectIds or have prefixes)
  const keys = Object.keys(userSocketMap);
  for (const k of keys) {
    if (k === idStr) return userSocketMap[k];
  }
  for (const k of keys) {
    if (k.includes(idStr) || k.endsWith(idStr)) return userSocketMap[k];
  }
  // Fallback: inspect live sockets for socket.data.userId matching
  try {
    if (typeof io !== "undefined" && io.sockets && io.sockets.sockets) {
      const matches = [];
      // io.sockets.sockets is a Map in socket.io v4
      for (const [sid, sock] of io.sockets.sockets) {
        try {
          const sockUid =
            sock.data?.userId ||
            (sock.handshake?.query?.userId
              ? String(sock.handshake.query.userId)
              : null);
          if (!sockUid) continue;
          const sUid = String(sockUid);
          if (sUid === idStr || sUid.includes(idStr) || sUid.endsWith(idStr)) {
            matches.push(sid);
          }
        } catch (e) {
          // ignore per-socket errors
        }
      }
      if (matches.length) return matches;
    }
  } catch (err) {
    console.warn("findSocketsForUser fallback failed", err);
  }
  return [];
};

const io = new Server(server, {
  // During development allow local origins (vite may pick 5173/5174 etc.)
  cors: {
    origin: (origin, callback) => {
      // allow all local origins and null (for some dev tools)
      if (!origin || origin.startsWith("http://localhost"))
        return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);
  // Try to authenticate socket using JWT cookie first (more reliable)
  let userId = null;
  try {
    const cookieHeader = socket.handshake.headers?.cookie || "";
    // parse cookie string to find jwt
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.split("=");
        return [k?.trim(), v?.join("=")];
      })
    );
    const token = cookies.jwt || socket.handshake.query?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.userId) {
        userId = String(decoded.userId);
        socket.data = socket.data || {};
        socket.data.userId = userId; // authoritative
        if (!userSocketMap[userId]) userSocketMap[userId] = [];
        if (!userSocketMap[userId].includes(socket.id))
          userSocketMap[userId].push(socket.id);
        console.log(
          `[socket] jwt-auth mapped user '${userId}' -> sockets:`,
          userSocketMap[userId]
        );
      }
    }
  } catch (err) {
    console.warn(
      "Socket JWT verify failed or not provided",
      err?.message || err
    );
  }

  if (!userId) {
    // fallback to query userId if JWT not present
    const rawUserId = socket.handshake.query.userId;
    userId = rawUserId != null ? String(rawUserId) : null;
    if (userId) {
      if (!userSocketMap[userId]) userSocketMap[userId] = [];
      userSocketMap[userId].push(socket.id);
      console.log(
        `[socket] mapped user key: '${userId}' -> sockets:`,
        userSocketMap[userId]
      );
    } else {
      console.log(
        "[socket] connection without userId in handshake query or jwt:",
        socket.id
      );
    }
  }

  // Allow client to explicitly register its userId after connect.
  socket.on("register", (uid) => {
    try {
      const regId = uid != null ? String(uid) : null;
      if (!regId) return;
      // Mark on socket.data for cleanup
      socket.data = socket.data || {};
      socket.data.userId = regId;
      if (!userSocketMap[regId]) userSocketMap[regId] = [];
      if (!userSocketMap[regId].includes(socket.id))
        userSocketMap[regId].push(socket.id);
      console.log(
        `[socket] registered user '${regId}' -> sockets:`,
        userSocketMap[regId]
      );
      io.emit("onlineUsers", Object.keys(userSocketMap));
    } catch (err) {
      console.error("Error in register handler", err);
    }
  });

  // notify all clients of current online users
  io.emit("onlineUsers", Object.keys(userSocketMap));

  // Listen for messages
  // Listen for messages sent via socket (optional - server controller emits saved messages)
  // Accept text and optional image and forward as-is so realtime works if client emits directly
  socket.on("sendMessage", ({ receiverId, text, image }) => {
    console.log("[socket] sendMessage received from", userId, {
      receiverId,
      text,
      hasImage: !!image,
    });
    const sockets = getReceiverSocketId(receiverId);
    const payload = { senderId: userId, receiverId, text };
    if (image) payload.image = image;
    sockets.forEach((id) => {
      io.to(id).emit("receiveMessage", payload);
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

    const regId = socket.data?.userId;
    if (regId && userSocketMap[regId]) {
      userSocketMap[regId] = userSocketMap[regId].filter(
        (id) => id !== socket.id
      );
      if (userSocketMap[regId].length === 0) delete userSocketMap[regId];
    }

    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
