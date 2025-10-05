import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { create } from "zustand";
import { useAuthStore } from "../store/useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    if (!userId) return;
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async ({ text, image }) => {
    const { selectedUser } = get();
    if (!selectedUser?._id) {
      toast.error("No user selected to send message");
      return;
    }

    try {
      // send via server-side API
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        { text, image }
      );

      // append locally
      set((state) => ({ messages: [...state.messages, res.data] }));

      // emit via socket so all devices get it
      const socket = useAuthStore.getState().socket;
      socket.emit("sendMessage", {
        receiverId: selectedUser._id,
        text,
        image,
      });
    } catch (error) {
      console.error(error.response?.data || error.message);
      toast.error(error.response?.data?.error || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // listen to incoming messages
    socket.on("receiveMessage", (msg) => {
      const { selectedUser, messages } = get();

      // only append messages for the current chat
      if (
        selectedUser &&
        (msg.senderId === selectedUser._id ||
          msg.receiverId === selectedUser._id)
      ) {
        set({ messages: [...messages, msg] });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("receiveMessage");
  },

  setSelectedUser: (user) => {
    set({ selectedUser: user, messages: [] });
    get().getMessages(user?._id);
  },
}));
