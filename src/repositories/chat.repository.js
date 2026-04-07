import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/user.js";

export const findConversation = (participantA, participantB) =>
  Conversation.findOne({
    type: "direct",
    participants: { $all: [participantA, participantB], $size: 2 },
  });

export const createConversation = (participantIds, instituteId) =>
  Conversation.create({ type: "direct", participants: participantIds, institute: instituteId });

export const createGroupConversation = (name, participantIds, createdById, instituteId) =>
  Conversation.create({
    type: "group",
    name,
    participants: participantIds,
    createdBy: createdById,
    institute: instituteId,
  });

export const findConversationById = (id, userId) =>
  Conversation.findOne({ _id: id, participants: userId })
    .populate("participants", "fullName role profilePhoto")
    .populate({ path: "lastMessage", select: "content sender createdAt" });

export const findConversationsByUser = (userId) =>
  Conversation.find({ participants: userId })
    .populate("participants", "fullName role profilePhoto")
    .populate({ path: "lastMessage", populate: { path: "sender", select: "fullName" } })
    .sort({ lastMessageAt: -1 });

export const findMessages = (conversationId, limit = 50, before = null) => {
  const query = { conversation: conversationId };
  if (before) query.createdAt = { $lt: new Date(before) };
  return Message.find(query)
    .populate("sender", "fullName role profilePhoto")
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const createMessage = (conversationId, senderId, content) =>
  Message.create({ conversation: conversationId, sender: senderId, content, readBy: [senderId] });

export const markConversationRead = (conversationId, userId) =>
  Message.updateMany(
    { conversation: conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

export const updateConversationLastMessage = (conversationId, messageId) =>
  Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: messageId,
    lastMessageAt: new Date(),
  });

export const countUnread = (userId) =>
  Message.aggregate([
    { $match: { readBy: { $ne: userId } } },
    {
      $lookup: {
        from: "conversations",
        localField: "conversation",
        foreignField: "_id",
        as: "conv",
      },
    },
    { $unwind: "$conv" },
    { $match: { "conv.participants": userId, sender: { $ne: userId } } },
    { $count: "total" },
  ]);

// Returns users this role can message
export const findContacts = (user) => {
  const { role, institute, _id } = user;
  const instituteId = typeof institute === "object" ? institute._id : institute;

  if (role === "admin") {
    return User.find({ institute: instituteId, _id: { $ne: _id } })
      .select("fullName role profilePhoto email");
  }

  if (role === "lecturer") {
    return User.find({
      institute: instituteId,
      _id: { $ne: _id },
      role: { $in: ["student", "parent", "admin"] },
    }).select("fullName role profilePhoto email");
  }

  if (role === "student") {
    return User.find({
      institute: instituteId,
      _id: { $ne: _id },
      role: { $in: ["lecturer", "admin"] },
    }).select("fullName role profilePhoto email");
  }

  if (role === "parent") {
    return User.find({
      institute: instituteId,
      _id: { $ne: _id },
      role: { $in: ["lecturer", "admin"] },
    }).select("fullName role profilePhoto email");
  }

  return Promise.resolve([]);
};
