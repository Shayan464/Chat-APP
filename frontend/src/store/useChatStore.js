import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  selectedUser: null,
  isMessagesLoading: false,
  users: [],
  isUsersLoading: false,

  // Fetch users for sidebar
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Select a user and fetch messages
  setSelectedUser: (user) => {
    set({ selectedUser: user, messages: [] });
    get().unsubscribeFromMessages();
    get().subscribeToMessages();
    get().getMessages(user._id);
  },

  // Fetch messages for selected user
  getMessages: async (receiverId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${receiverId}`);
      set({ messages: res.data || [] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Send message (text + optional image)
  sendMessage: async (text, image = null) => {
    const { selectedUser } = get();
    const { socket } = useAuthStore.getState();

    if (!selectedUser?._id) return toast.error("No user selected");
    if (!socket) return toast.error("Socket not initialized");

    if (!text && !image) return toast.error("Message is empty");

    try {
      const payload = { text, image };

      // POST to backend (backend will emit to receiver)
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        payload
      );

      // ✅ Add message immediately for sender (avoid duplicate by socket)
      get().addMessage(res.data);

      // No need to manually emit here; backend handles it
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    }
  },

  // Add message safely
  addMessage: (msg) => {
    set((state) => {
      // Prevent duplicates
      if (state.messages.some((m) => m._id === msg._id)) return state;
      return { messages: [...state.messages, msg] };
    });
  },

  // Subscribe to incoming socket messages
  subscribeToMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    // Ensure we listen to the event emitted by the backend
    socket.off("receiveMessage");
    socket.on("receiveMessage", (msg) => {
      const selectedUser = get().selectedUser;
      if (!selectedUser) return;

      // Only add messages related to current chat
      if (
        msg.senderId === selectedUser._id ||
        msg.receiverId === selectedUser._id
      ) {
        get().addMessage(msg);
      }
    });
  },

  // Unsubscribe from socket messages
  unsubscribeFromMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;
    socket.off("receiveMessage");
  },
}));
