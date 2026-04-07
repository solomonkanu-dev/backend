import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  getContacts,
  getConversations,
  getOrCreateConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  markRead,
  getUnreadCount,
} from "../controllers/chat.controller.js";

const router = Router();

router.use(auth);

router.get("/contacts", getContacts);
router.get("/conversations", getConversations);
router.post("/conversations", getOrCreateConversation);
router.post("/conversations/group", createGroupConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", sendMessage);
router.patch("/conversations/:id/read", markRead);
router.get("/unread-count", getUnreadCount);

export default router;
