import express from "express";
import {
  chatWithOpenRouter as chatWithGemini,
  chatWithOllama,
  getConversations,
  getConversation,
  deleteConversation,
  getOllamaModels,
} from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/chat", chatWithGemini);
router.post("/chat-ollama", chatWithOllama);
router.get("/conversations/:userId", getConversations);
router.get("/conversation/:conversationId", getConversation);
router.delete("/conversation/:conversationId", deleteConversation);
router.get("/ollama/models", getOllamaModels);

export default router;
