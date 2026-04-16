import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/user.js";
import Institute from "./models/Institute.js";
import { addUser, removeUser, getOnlineSnapshot } from "./presence.js";

let io;

function broadcastPresence() {
  if (!io) return;
  io.to("room:super_admin").emit("presence:update", getOnlineSnapshot());
}

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/$/, ""))
        : [],
      credentials: true,
    },
    connectionStateRecovery: {},
  });

  // Auth middleware — same lean query as before, no populate (avoids issues with missing ref)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userId = payload.id || payload._id;
      const user = await User.findById(userId)
        .select("_id role fullName institute")
        .lean();
      if (!user) return next(new Error("Unauthorized"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const { _id, role, fullName, institute: instituteId } = socket.user;

    // Each user joins their personal notification room
    socket.join(`user:${_id}`);

    // Super admins join a dedicated room to receive presence broadcasts
    if (role === "super_admin") {
      socket.join("room:super_admin");
    }

    // For admins, fetch the institute name so it shows in the super-admin table
    let instituteData = null;
    if (role === "admin" && instituteId) {
      try {
        const inst = await Institute.findById(instituteId).select("name").lean();
        if (inst) instituteData = { _id: String(inst._id), name: inst.name };
      } catch {
        // non-critical — continue without institute name
      }
    }

    addUser(socket.id, {
      userId:      _id,
      role,
      fullName,
      institute:   instituteData,
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
