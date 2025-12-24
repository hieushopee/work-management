import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Bot, CircleUserRoundIcon, History, SquarePen, Trash2Icon, Settings, MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import axios from "../../../libs/axios";
import useUserStore from "../../../stores/useUserStore";
import { format } from 'date-fns';

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [model, setModel] = useState('anthropic/claude-3-haiku'); // Default model via OpenRouter
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [showSettings, setShowSettings] = useState(false);
  const fetchRef = useRef({ loading: false, last: 0 });

  const currentUser = useUserStore((state) => state.user);
  const messagesEndRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }
    if (fetchRef.current.loading) return;
    const now = Date.now();
    if (now - fetchRef.current.last < 1000) return; // throttle 1s
    fetchRef.current.loading = true;
    fetchRef.current.last = now;

    try {
      const res = await axios.get(`/ai/conversations/${currentUser.id}`);
      
      // Filter out conversations with invalid IDs
      const validConversations = (res.data || []).filter(conv => 
        (conv._id || conv.id) && (conv._id || conv.id) !== 'undefined' && (conv._id || conv.id) !== 'null'
      );
      
      setConversations(validConversations);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      fetchRef.current.loading = false;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load conversation from URL query param
  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl && conversationIdFromUrl === selectedConversationId) return;
    if (conversationIdFromUrl) {
      handleSelectConversation(conversationIdFromUrl);
    } else if (!conversationIdFromUrl && selectedConversationId) {
      // Clear if URL param is removed
      setSelectedConversationId(null);
      setMessages([]);
    }
  }, [searchParams, selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const handleSelectConversation = async (conversationId) => {
    if (isAiTyping) return;
    if (!conversationId || conversationId === selectedConversationId) {
      return;
    }
    setSelectedConversationId(conversationId);
    const currentParam = searchParams.get('conversationId');
    if (currentParam !== conversationId) {
      setSearchParams({ conversationId });
    }
    try {
      const res = await axios.get(`/ai/conversation/${conversationId}`);
      setMessages(res.data.messages || []);
      setShowHistory(false);
    } catch (err) {
      console.error("Failed to fetch conversation details:", err);
    }
  };

  const handleNewChat = () => {
    if (isAiTyping) return;
    setSelectedConversationId(null);
    setMessages([]);
    setInput("");
    setShowHistory(false);
    setSearchParams({});
  };

  const handleDeleteConversation = async (e, conversationId) => {
    e.stopPropagation();
    
    // Validate conversationId
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      console.error("Invalid conversation ID:", conversationId);
      return;
    }
    
    try {
      await axios.delete(`/ai/conversation/${conversationId}`);
      fetchConversations();
      if (selectedConversationId === conversationId) {
        handleNewChat();
      }
      // Notify parent to refresh AI conversations list
      window.dispatchEvent(new CustomEvent('aiConversationDeleted'));
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      // Show user-friendly error message
      alert("Cannot delete conversation. Please try again.");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentUser || isAiTyping) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsAiTyping(true);

    try {
      const res = await axios.post("/ai/chat", {
        messages: [...messages, userMessage],
        userId: currentUser.id,
        conversationId: selectedConversationId,
        model,
        temperature,
        maxTokens,
      });

      const aiMessageContent =
        res.data.choices?.[0]?.message?.content ||
        res.data.response ||
        "No response from AI";

      setMessages((prev) => [...prev, { role: "assistant", content: aiMessageContent }]);

      if (!selectedConversationId && res.data.conversationId) {
        setSelectedConversationId(res.data.conversationId);
        fetchConversations();
        // Notify parent to refresh AI conversations list
        window.dispatchEvent(new CustomEvent('aiConversationCreated'));
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Cannot connect to AI or the AI system is busy, please try again later." }
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderUserAvatar = (avatar) =>
    avatar ? (
      <img
        src={avatar}
        alt="User avatar"
        className="w-9 h-9 rounded-full object-cover border-2 border-white"
      />
    ) : (
      <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">
        <CircleUserRoundIcon className="h-8 w-8 text-primary" />
      </div>
    );

  const renderAiAvatar = () => (
    <div className="w-10 h-10 flex items-center justify-center">
      <Bot className="w-7 h-7 text-purple-500" />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl shadow overflow-hidden border border-border-light">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border-light h-20 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-purple-500" />
          <div>
            <h2 className="text-lg font-semibold text-text-main">
              {selectedConversationId ? 'Chat' : 'New Chat'}
            </h2>
            <p className="text-sm text-text-secondary">
              Model: {model}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-text-secondary" />
          </button>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
            title="New Chat"
          >
            <SquarePen className="w-5 h-5 text-text-secondary" />
          </button>
          <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide">
            AI Chat
          </span>
        </div>
      </div>

      {/* Middle Content */}
      <div className="flex flex-1 min-h-0">
        {/* Settings Panel */}
        {showSettings && (
          <div className="w-[320px] shrink-0 border-r border-border-light flex flex-col bg-bg-secondary">
            <div className="p-4 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-main">Model Settings</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                  <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="openai/gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
                  <option value="openai/gpt-4o-mini">OpenAI GPT-4o mini</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Chat Window */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Block hiển thị tin nhắn dạng bubble chuẩn */}
          <div
            className={`flex-1 min-h-0 px-5 py-6 space-y-5 ${
              messages.length > 0 ? "overflow-y-auto" : "overflow-hidden"
            } bg-white`}
            style={{ borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-secondary mb-2">Start a conversation</h3>
                  <p className="text-text-muted">Ask me anything! I'm powered by Claude.</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-end gap-2 max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        {isUser ? renderUserAvatar(currentUser?.avatar) : renderAiAvatar()}
                        <div className={`px-4 py-2 rounded-2xl whitespace-pre-wrap shadow-sm ${isUser ? "bg-blue-500 text-white" : "bg-gray-200 text-text-main"}`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2 max-w-[80%] flex-row">
                      {renderAiAvatar()}
                      <div className="px-4 py-2 rounded-2xl whitespace-pre-wrap shadow-sm bg-gray-200 text-text-main">
                        <div className="flex items-center justify-center gap-2 h-5">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input field */}
          <form
            onSubmit={handleSubmit}
            className="px-5 py-4 flex gap-2 border-t border-border-light bg-white shrink-0"
          >
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows="1"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={isAiTyping}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isAiTyping}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
