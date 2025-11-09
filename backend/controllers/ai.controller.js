import OpenAI from "openai";
import { Chat } from '../models/chat.model.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const chatWithOpenAI = async (req, res) => {
  try {
    const { messages, userId, conversationId } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing valid messages' });
    }

    const aiResult = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    });

    const aiContent = aiResult.choices?.[0]?.message?.content?.trim() || "";
    if (aiContent) {
      const aiMessageForDb = {
        role: 'assistant',
        content: aiContent,
      };
      const userMessage = messages[messages.length - 1];
      let retConvId = conversationId, retTitle = undefined;
      if (conversationId) {
        const updatedConversation = await Chat.findByIdAndUpdate(
          conversationId,
          { $push: { messages: { $each: [userMessage, aiMessageForDb] } } },
          { new: true }
        );
        retConvId = updatedConversation.id;
      } else {
        const title = userMessage.content.length > 50 ? userMessage.content.substring(0, 50) + '...' : userMessage.content;
        const newConversation = await Chat.create({
          userId,
          title,
          messages: [userMessage, aiMessageForDb],
        });
        retConvId = newConversation.id;
        retTitle = newConversation.title;
      }
      return res.json({ ...aiResult, conversationId: retConvId, title: retTitle });
    } else {
      return res.json(aiResult);
    }
  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ error: 'AI is not responding' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const conversations = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .select('title updatedAt _id');
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Could not fetch conversations' });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Chat.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Could not fetch conversation' });
  }
};

export const renameConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body || {};

    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID format' });
    }

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) {
      return res.status(400).json({ error: 'Conversation title is required' });
    }

    const updatedConversation = await Chat.findByIdAndUpdate(
      conversationId,
      { title: trimmedTitle },
      { new: true }
    );

    if (!updatedConversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      id: updatedConversation.id,
      title: updatedConversation.title,
      updatedAt: updatedConversation.updatedAt,
    });
  } catch (error) {
    console.error('Error renaming conversation:', error);
    res.status(500).json({ error: 'Could not rename conversation' });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Validate conversationId
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    
    // Check if conversationId is a valid ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID format' });
    }
    
    const deletedConversation = await Chat.findByIdAndDelete(conversationId);
    
    if (!deletedConversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Could not delete conversation' });
  }
};
