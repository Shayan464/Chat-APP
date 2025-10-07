import express from "express";
import { getUserSocketMap } from "../lib/socket.js";
const router = express.Router();

// Debug: get current socket mapping
router.get("/sockets", (req, res) => {
  try {
    const map = getUserSocketMap();
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: "failed to read socket map" });
  }
});

export default router;
