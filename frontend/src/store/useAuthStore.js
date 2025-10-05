import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  chats: [], // optional: store received messages locally

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      axiosInstance.defaults.withCredentials = true;
      const response = await axiosInstance.get("/auth/check");
      set({ authUser: response.data });
      get().connectSocket();
    } catch (error) {
      console.log("error in checkAuth", error);
      localStorage.removeItem("token");
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      if (res.data.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data.user || res.data });
      toast.success("Account created successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      if (res.data.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data.user || res.data });
      toast.success("Logged in Successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("token");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile", error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;
    if (get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
      transports: ["websocket"],
    });

    set({ socket });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    // Listen for online users
    socket.on("onlineUsers", (users) => {
      set({ onlineUsers: users });
      console.log("👥 Online users:", users);
    });

    // Listen for incoming messages
    socket.on("receiveMessage", (msg) => {
      console.log("📨 Message received:", msg);
      set((state) => ({ chats: [...state.chats, msg] }));
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },

  sendMessage: ({ receiverId, text }) => {
    const { socket, authUser } = get();
    if (!socket || !authUser) return;

    const message = {
      senderId: authUser._id,
      receiverId,
      text,
    };

    console.log("📨 Sending message:", message);
    socket.emit("sendMessage", message);

    // Optionally, add to local chat immediately
    set((state) => ({ chats: [...state.chats, message] }));
  },
}));
