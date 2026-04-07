import * as service from "../services/chat.service.js";

export const getContacts = async (req, res, next) => {
  try {
    const contacts = await service.getContacts(req.user);
    res.json({ data: contacts });
  } catch (err) { next(err); }
};

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await service.getConversations(req.user._id);
    res.json({ data: conversations });
  } catch (err) { next(err); }
};

export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const conv = await service.getOrCreateConversation(req.user, targetUserId);
    res.json({ data: conv });
  } catch (err) { next(err); }
};

export const createGroupConversation = async (req, res, next) => {
  try {
    const { name, participantIds } = req.body;
    const conv = await service.createGroupConversation(req.user, name, participantIds);
    res.status(201).json({ data: conv });
  } catch (err) { next(err); }
};

export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before || null;
    const messages = await service.getMessages(id, req.user._id, limit, before);
    res.json({ data: messages });
  } catch (err) { next(err); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const message = await service.sendMessage(id, req.user._id, content);
    res.status(201).json({ data: message });
  } catch (err) { next(err); }
};

export const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await service.markRead(id, req.user._id);
    res.json({ message: "Marked as read" });
  } catch (err) { next(err); }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await service.getUnreadCount(req.user._id);
    res.json({ data: { count } });
  } catch (err) { next(err); }
};
