import fetch from 'node-fetch';
import { Chat } from '../models/chat.model.js';

const generateTitle = async (userMessageContent) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'You are a title generator. Create a short, concise title in Vietnamese (5-10 words) for the following user query. Do not add any introductory text or quotes.',
          },
          {
            role: 'user',
            content: userMessageContent,
          },
        ],
        temperature: 0.2,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('Title generation failed:', await response.text());
      return 'New Conversation';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content.trim() || 'New Conversation';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Conversation';
  }
};

export const chatWithOpenRouter = async (req, res) => {
  try {
    const { messages, userId, conversationId } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing valid messages' });
    }

    const systemMessage = {
      role: 'system',
      content: 'You are a helpful and concise assistant. Respond in Vietnamese.',
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct-v0.1',
        messages: [systemMessage, ...messages],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API Error:', errorData);
      return res.status(response.status).json({ error: 'Error from AI service', details: errorData });
    }

    const data = await response.json();
    const rawAiMessage = data.choices?.[0]?.message;
    const cleanedContent = (rawAiMessage?.content || '').replace(/<s>|<\/s>|\[\/s\]/g, '').trim();

    if (cleanedContent) {
      const aiMessageForDb = {
        role: 'assistant',
        content: cleanedContent,
      };

      const userMessage = messages[messages.length - 1];

      if (data.choices?.[0]?.message) {
        data.choices[0].message.content = cleanedContent;
      }

      if (conversationId) {
        // Existing conversation
        const updatedConversation = await Chat.findByIdAndUpdate(
          conversationId,
          {
            $push: {
              messages: { $each: [userMessage, aiMessageForDb] },
            },
          },
          { new: true }
        );
        return res.json({ ...data, conversationId: updatedConversation.id });
      } else {
        // New conversation - use first user message as title
        const title = userMessage.content.length > 50 
          ? userMessage.content.substring(0, 50) + '...' 
          : userMessage.content;
        
        const newConversation = await Chat.create({
          userId,
          title,
          messages: [userMessage, aiMessageForDb],
        });
        return res.json({ ...data, conversationId: newConversation.id, title: newConversation.title });
      }
    } else {
      console.log('AI response was empty after cleaning. Not saving conversation.');
      return res.json(data);
    }
  } catch (error) {
    console.error('OpenRouter error:', error.response?.data || error.message);
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

// Ollama integration functions
const generateTitleWithOllama = async (userMessageContent) => {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: `You are a title generator. Create a short, concise title in Vietnamese (5-10 words) for the following user query. Do not add any introductory text or quotes.

User query: ${userMessageContent}

Title:`,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 50,
        },
      }),
    });

    if (!response.ok) {
      console.error('Ollama title generation failed:', await response.text());
      return 'New Conversation';
    }

    const data = await response.json();
    return data.response?.trim() || 'New Conversation';
  } catch (error) {
    console.error('Error generating title with Ollama:', error);
    return 'New Conversation';
  }
};

export const chatWithOllama = async (req, res) => {
  try {
    const { messages, userId, conversationId, model = 'llama3.2:3b', temperature = 0.7, maxTokens = 2048 } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing valid messages' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Convert messages to Ollama format
    const systemPrompt = 'You are a helpful and concise assistant. Respond in Vietnamese.';
    const conversationHistory = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const prompt = `${systemPrompt}\n\n${conversationHistory}\n\nassistant:`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Ollama API Error:', errorData);
      return res.status(response.status).json({ error: 'Error from Ollama service', details: errorData });
    }

    const data = await response.json();
    const aiResponse = data.response?.trim() || 'No response from AI';

    if (aiResponse) {
      const aiMessageForDb = {
        role: 'assistant',
        content: aiResponse,
      };

      const userMessage = messages[messages.length - 1];

      if (conversationId) {
        // Existing conversation
        const updatedConversation = await Chat.findByIdAndUpdate(
          conversationId,
          {
            $push: {
              messages: { $each: [userMessage, aiMessageForDb] },
            },
          },
          { new: true }
        );
        return res.json({ 
          response: aiResponse, 
          conversationId: updatedConversation._id,
          model,
          temperature,
          maxTokens
        });
      } else {
        // New conversation - use first user message as title
        const title = userMessage.content.length > 50 
          ? userMessage.content.substring(0, 50) + '...' 
          : userMessage.content;
        
        const newConversation = await Chat.create({
          userId,
          title,
          messages: [userMessage, aiMessageForDb],
        });
        return res.json({ 
          response: aiResponse, 
          conversationId: newConversation._id, 
          title: newConversation.title,
          model,
          temperature,
          maxTokens
        });
      }
    } else {
      console.log('Ollama response was empty. Not saving conversation.');
      return res.json({ response: 'No response from AI' });
    }
  } catch (error) {
    console.error('Ollama error:', error.message);
    res.status(500).json({ error: 'AI is not responding' });
  }
};

// Get available Ollama models
export const getOllamaModels = async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Could not fetch Ollama models' });
    }

    const data = await response.json();
    res.json(data.models || []);
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    res.status(500).json({ error: 'Could not fetch Ollama models' });
  }
};
