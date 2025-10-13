import { User } from "../models/user.model.js";
import { Message } from "../models/messages.models.js";
import cloudinary from "../lib/cloudinary.js";
import { findSocketsForUser, io } from "../lib/socket.js";

// Get users for sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );
    res.status(200).json(users);
  } catch (err) {
    console.error("getUsersForSidebar error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error("getMessages error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image)
      return res.status(400).json({ error: "Message text or image required" });

    let imageUrl = null;
    if (image) {
      try {
        const upload = await cloudinary.uploader.upload(image, {
          folder: "chat_images",
        });
        imageUrl = upload.secure_url;
      } catch (err) {
        console.error("Cloudinary upload error:", err.message);
        return res.status(500).json({ error: "Image upload failed" });
      }
    }

    const newMessage = await new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    }).save();

    const messageToEmit = {
      _id: newMessage._id.toString(),
      senderId: newMessage.senderId.toString(),
      receiverId: newMessage.receiverId.toString(),
      text: newMessage.text,
      image: newMessage.image || null,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
    };

    // Emit to receiver and sender sockets
    [receiverId, senderId].forEach((id) => {
      const sockets = findSocketsForUser(id);
      sockets?.forEach((socketId) =>
        io.to(socketId).emit("receiveMessage", messageToEmit)
      );
    });

    res.status(201).json(messageToEmit);
  } catch (err) {
    console.error("sendMessage error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
