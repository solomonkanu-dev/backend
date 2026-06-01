import { AppError } from "../errors/AppError.js";
import * as repo from "../repositories/chat.repository.js";
import { getIO } from "../socket.js";
import User from "../models/user.js";
import { sendExpoPushes } from "../utils/expoPush.js";

// Emit a message event to all participants of a conversation
function emitToParticipants(conv, event, payload) {
  const io = getIO();
  if (!io) {
    console.warn(`[chat] emit ${event} skipped — io not initialised`);
    return;
  }
  const rooms = conv.participants.map((p) => `user:${p._id ?? p}`);
  const sizes = rooms.map((r) => io.sockets.adapter.rooms.get(r)?.size ?? 0);
  console.log(
    `[chat] emit ${event} conv=${conv._id} rooms=[${rooms.join(",")}] sockets=[${sizes.join(",")}]`
  );
  conv.participants.forEach((p) => {
    io.to(`user:${p._id ?? p}`).emit(event, payload);
  });
  // Also emit to the conversation room (for active thread listeners)
  io.to(`conv:${conv._id}`).emit(event, payload);
}

export const getContacts = async (user) => {
  return repo.findContacts(user);
};

export const getConversations = async (userId) => {
  return repo.findConversationsByUser(userId);
};

export const getOrCreateConversation = async (requestingUser, targetUserId) => {
  if (String(requestingUser._id) === String(targetUserId)) {
    throw new AppError("Cannot start a conversation with yourself", 400);
  }

  const instituteId =
    typeof requestingUser.institute === "object"
      ? requestingUser.institute._id
      : requestingUser.institute;

  let conv = await repo.findConversation(requestingUser._id, targetUserId);
  if (!conv) {
    conv = await repo.createConversation([requestingUser._id, targetUserId], instituteId);
  }

  return repo.findConversationById(conv._id, requestingUser._id);
};

export const createGroupConversation = async (requestingUser, name, participantIds) => {
  if (!name?.trim()) throw new AppError("Group name is required", 400);
  if (!Array.isArray(participantIds) || participantIds.length < 1) {
    throw new AppError("A group requires at least one other participant", 400);
  }

  const instituteId =
    typeof requestingUser.institute === "object"
      ? requestingUser.institute._id
      : requestingUser.institute;

  // Always include the creator in participants
  const all = [String(requestingUser._id), ...participantIds.map(String)];
  const unique = [...new Set(all)];

  const conv = await repo.createGroupConversation(
    name.trim(),
    unique,
    requestingUser._id,
    instituteId
  );

  return repo.findConversationById(conv._id, requestingUser._id);
};

export const getMessages = async (conversationId, userId, limit, before) => {
  const conv = await repo.findConversationById(conversationId, userId);
  if (!conv) throw new AppError("Conversation not found", 404);

  const messages = await repo.findMessages(conversationId, limit, before);
  return messages.reverse();
};

export const sendMessage = async (conversationId, senderId, content) => {
  if (!content?.trim()) throw new AppError("Message content cannot be empty", 400);

  const conv = await repo.findConversationById(conversationId, senderId);
  if (!conv) throw new AppError("Conversation not found", 404);

  const message = await repo.createMessage(conversationId, senderId, content.trim());
  await repo.updateConversationLastMessage(conversationId, message._id);
  await message.populate("sender", "fullName role profilePhoto");

  // Real-time delivery via Socket.io
  emitToParticipants(conv, "new_message", { conversationId, message });
  emitToParticipants(conv, "conversation_updated", { conversationId });

  // Native OS push to recipients other than the sender
  (async () => {
    try {
      const recipientIds = conv.participants
        .map((p) => p._id ?? p)
        .filter((id) => String(id) !== String(senderId));
      if (recipientIds.length === 0) return;

      const recipients = await User.find(
        { _id: { $in: recipientIds } },
        "expoPushTokens"
      ).lean();
      const tokens = recipients.flatMap((u) => u.expoPushTokens || []);
      if (tokens.length === 0) return;

      const senderName = message.sender?.fullName || "New message";
      const preview = message.content.length > 120
        ? `${message.content.slice(0, 117)}…`
        : message.content;
      const isGroup = conv.type === "group" && conv.name;
      await sendExpoPushes(tokens, {
        title: isGroup ? `${conv.name} · ${senderName}` : senderName,
        body: preview,
        channelId: "messages",
        data: { type: "message", conversationId: String(conversationId) },
      });
    } catch (err) {
      console.warn("[chat] push send failed:", err?.message ?? err);
    }
  })();

  return message;
};

export const markRead = async (conversationId, userId) => {
  const conv = await repo.findConversationById(conversationId, userId);
  if (!conv) throw new AppError("Conversation not found", 404);
  await repo.markConversationRead(conversationId, userId);

  // Notify other participants so their sent-message ticks turn blue
  const io = getIO();
  if (io) {
    conv.participants.forEach((p) => {
      if (String(p._id) !== String(userId)) {
        io.to(`user:${p._id}`).emit("messages_read", {
          conversationId,
          readBy: String(userId),
        });
      }
    });
  }
};

export const getUnreadCount = async (userId) => {
  const result = await repo.countUnread(userId);
  return result[0]?.total ?? 0;
};
