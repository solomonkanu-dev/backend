import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/user.js";
import { addUser, removeUser, getOnlineSnapshot } from "./presence.js";

let io;

function broadcastPresence() {
  if (!io) return;
  io.to("room:super_admin").emit("presence:update", getOnlineSnapshot());
}

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
      const user = await User.findById(userId)
        .select("_id role fullName institute")
        .populate("institute", "name")
        .lean();
      if (!user) return next(new Error("Unauthorized"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { _id, role, fullName, institute } = socket.user;

    // Each user joins their personal notification room
    socket.join(`user:${_id}`);

    // Super admins join a dedicated room to receive presence broadcasts
    if (role === "super_admin") {
      socket.join("room:super_admin");
    }

    // Track presence
    addUser(socket.id, {
      userId:      _id,
      role,
      fullName,
      institute:   institute
        ? { _id: String(institute._id), name: institute.name }
        : null,
      connectedAt: new Date(),
    });
    broadcastPresence();

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
        userId: String(_id),
        name:   fullName,
        conversationId,
      });
    });

    socket.on("typing_stop", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("typing_stop", {
        userId: String(_id),
        conversationId,
      });
    });

    socket.on("disconnect", () => {
      removeUser(socket.id);
      broadcastPresence();
    });
  });

  return io;
}

export function getIO() {
  return io ?? null;
}
