import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/user.js";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || [],
      credentials: true,
    },
    connectionStateRecovery: {},
  });

  // Auth middleware — verifies JWT from handshake.auth.token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userId = payload.id || payload._id;
      const user = await User.findById(userId).select("_id role fullName institute").lean();
      if (!user) return next(new Error("Unauthorized"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Each user joins their personal notification room
    socket.join(`user:${socket.user._id}`);

    // Join a conversation room (for typing indicators)
    socket.on("join_conversation", (conversationId) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });

    // Typing indicators
    socket.on("typing_start", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("typing", {
        userId: String(socket.user._id),
        name: socket.user.fullName,
        conversationId,
      });
    });

    socket.on("typing_stop", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("typing_stop", {
        userId: String(socket.user._id),
        conversationId,
      });
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO() {
  return io ?? null;
}
