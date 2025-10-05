import express from "express";
import authRoutes from "../routes/auth.route.js";
import messageRoute from "../routes/message.route.js";
import dotenv from "dotenv";
import connectDB from "../lib/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { app, server } from "../lib/socket.js";
import path from "path";
dotenv.config();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoute);
// server.js

const port = process.env.PORT || 4000;
const __dirname = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/:path(*)", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(port, () => {
  console.log(`server is running on port ${port}`);
  connectDB();
});
