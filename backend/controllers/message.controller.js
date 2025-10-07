import { User } from "../models/user.model.js";
import { Message } from "../models/messages.models.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, findSocketsForUser, io } from "../lib/socket.js";

// Get users for sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
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
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validate input
    if (!text && !image) {
      return res.status(400).json({ error: "Message text or image required" });
    }

    let imageUrl = null;

    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "chat_images",
        });
        imageUrl = uploadResponse.secure_url;
      } catch (err) {
        console.error("Cloudinary upload error:", err.message);
        return res.status(500).json({ error: "Image upload failed" });
      }
    }

    // Save message to DB
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });
    await newMessage.save();

    // Convert saved message to a plain object and stringify IDs so clients
    // receive consistent types (strings) and can match against selected user ids
    const messageObj = newMessage.toObject
      ? newMessage.toObject()
      : { ...newMessage };
    const messageToEmit = {
      ...messageObj,
      _id: messageObj._id?.toString?.() || messageObj._id,
      senderId: messageObj.senderId?.toString?.() || messageObj.senderId,
      receiverId: messageObj.receiverId?.toString?.() || messageObj.receiverId,
      image: messageObj.image || null,
    };

    // Emit to receiver sockets only. The sender already gets the saved
    // message as the HTTP response, so emitting to the sender can cause
    // duplicates and confusion when socket-user mapping is inconsistent.
    const receiverSocketIds = findSocketsForUser(receiverId); // robust lookup

    console.log("[sendMessage] senderId:", senderId);
    console.log("[sendMessage] receiverId:", receiverId);
    console.log("[sendMessage] receiverSocketIds:", receiverSocketIds);

    if (Array.isArray(receiverSocketIds) && receiverSocketIds.length > 0) {
      receiverSocketIds.forEach((socketId) =>
        io.to(socketId).emit("receiveMessage", messageToEmit)
      );
    } else {
      console.log("[sendMessage] No active sockets for receiver", receiverId);
    }

    // Also emit to sender sockets to ensure sender's other clients receive it
    const senderSocketIds = findSocketsForUser(senderId);
    if (Array.isArray(senderSocketIds) && senderSocketIds.length > 0) {
      senderSocketIds.forEach((socketId) =>
        io.to(socketId).emit("receiveMessage", messageToEmit)
      );
    }

    // Return the saved message to the HTTP client (sender)
    res.status(201).json(messageToEmit);
  } catch (error) {
    console.error("sendMessage error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
