import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore";

const BASE_URL = "http://localhost:4000"; // Adjust for production

export const useAuthStore = create((set, get) => ({
  authUser: null,
  socket: null,
  socketUserId: null,
  onlineUsers: [],
  isCheckingAuth: true,
  isLoggingIn: false,

  // ✅ Check authentication and auto-connect socket
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data, isCheckingAuth: false });
      get().connectSocket();
    } catch (err) {
      set({ authUser: null, isCheckingAuth: false });
      console.error("checkAuth error:", err.message);
    }
  },

  // ✅ Login (accepts single object)
  login: async ({ email, password }) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", { email, password });
      set({ authUser: res.data, isLoggingIn: false });
      get().connectSocket();
      toast.success("Login successful!");
    } catch (err) {
      set({ isLoggingIn: false });
      toast.error(err.response?.data?.message || "Login failed");
      console.error("Login error:", err.message);
    }
  },

  // ✅ Signup
  signup: async (data) => {
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      get().connectSocket();
      toast.success("Signup successful!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    }
  },

  // ✅ Logout
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      const socket = get().socket;
      if (socket) socket.disconnect();
      set({ authUser: null, socket: null, onlineUsers: [] });
      toast.success("Logged out successfully");
    } catch (err) {
      toast.error("Logout failed");
    }
  },

  // ✅ Connect to Socket.IO server
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

    // If there's an existing socket but it belongs to a different user,
    // disconnect it and create a fresh socket for the current authUser.
    const currentSocketUserId = get().socketUserId;
    if (socket?.connected && currentSocketUserId === authUser._id) return; // already connected as same user
    if (socket?.connected && currentSocketUserId !== authUser._id) {
      try {
        socket.disconnect();
      } catch (err) {
        console.warn("Error disconnecting stale socket", err);
      }
      set({ socket: null, socketUserId: null });
    }

    const newSocket = io(BASE_URL, {
      // include cookies during websocket handshake
      withCredentials: true,
      query: {
        userId: authUser._id,
        token: document?.cookie?.split("jwt=")[1],
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      set({ socket: newSocket, socketUserId: authUser._id });
      // Register explicitly so server maps the socket to this authUser
      try {
        newSocket.emit("register", authUser._id);
      } catch (err) {
        console.warn("Failed to emit register", err);
      }
      // If a chat is already selected, ensure we subscribe to incoming messages
      try {
        const selectedUser = useChatStore.getState().selectedUser;
        if (selectedUser) {
          useChatStore.getState().unsubscribeFromMessages();
          useChatStore.getState().subscribeToMessages();
          // Optionally refetch messages to ensure up-to-date history
          useChatStore.getState().getMessages(selectedUser._id);
        }
      } catch (err) {
        console.warn(
          "Failed to re-subscribe chat store after socket connect",
          err
        );
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
      set({ onlineUsers: [], socket: null, socketUserId: null });
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
    });

    newSocket.on("onlineUsers", (users) => {
      if (Array.isArray(users)) {
        set({ onlineUsers: users });
        console.log("🟢 Online users updated:", users);
      } else {
        console.warn("Invalid onlineUsers payload:", users);
        set({ onlineUsers: [] });
      }
    });

    set({ socket: newSocket });
  },
}));
