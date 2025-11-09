import express from "express";
import {
  chatWithOpenAI,
  getConversations,
  getConversation,
  renameConversation,
  deleteConversation
} from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/chat", chatWithOpenAI);
router.get("/conversations/:userId", getConversations);
router.get("/conversation/:conversationId", getConversation);
router.patch("/conversation/:conversationId", renameConversation);
router.delete("/conversation/:conversationId", deleteConversation);

export default router;
