import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Bot, CircleUserIcon, History, SquarePen, Trash2Icon, Settings, MessageSquare } from "lucide-react";
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
  const [model, setModel] = useState('llama3.2:3b'); // Default Ollama model
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [showSettings, setShowSettings] = useState(false);

  const currentUser = useUserStore((state) => state.user);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }
    
    try {
      const res = await axios.get(`/ai/conversations/${currentUser.id}`);
      
      // Filter out conversations with invalid IDs
      const validConversations = (res.data || []).filter(conv => 
        (conv._id || conv.id) && (conv._id || conv.id) !== 'undefined' && (conv._id || conv.id) !== 'null'
      );
      
      setConversations(validConversations);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const handleSelectConversation = async (conversationId) => {
    if (isAiTyping) return;
    setSelectedConversationId(conversationId);
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
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      // Show user-friendly error message
      alert("Không thể xóa cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentUser || isAiTyping) return;

    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsAiTyping(true);


    try {
      const res = await axios.post("/ai/chat-ollama", {
        messages: updatedMessages,
        userId: currentUser.id,
        conversationId: selectedConversationId,
        model,
        temperature,
        maxTokens,
      });

      const aiMessage = {
        role: "assistant",
        content: res.data.response || "No response from AI",
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (!selectedConversationId && res.data.conversationId) {
        setSelectedConversationId(res.data.conversationId);
        fetchConversations();
      }

    } catch (err) {
      console.error("Ollama error:", err);
      const errorMessage = {
        role: "assistant",
        content: "❌ Ollama is not running. Please install and start Ollama to use ChatAI.\n\n📋 Quick Setup:\n1. Download Ollama from https://ollama.com\n2. Install and run: ollama serve\n3. Install model: ollama pull llama3.2:3b\n4. Refresh this page\n\n💡 Check OLLAMA-MANUAL-SETUP.md for detailed instructions.\n\n🔧 Alternative: Use Docker if you have it installed.",
      };
      setMessages((prev) => [...prev, errorMessage]);
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
        className="w-9 h-9 rounded-full object-cover border border-gray-200"
      />
    ) : (
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center border border-gray-200">
        <CircleUserIcon className="w-5 h-5 text-gray-500" />
      </div>
    );

  const renderAiAvatar = () => (
    <div className="w-10 h-10 flex items-center justify-center">
      <Bot className="w-7 h-7 text-purple-500" />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded shadow overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 h-20 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-purple-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedConversationId ? 'Chat' : 'New Chat'}
            </h2>
            <p className="text-sm text-gray-500">
              Model: {model} | Temperature: {temperature} | Backend: Ollama
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
          <SquarePen
            className="w-6 h-6 text-gray-500 cursor-pointer hover:text-blue-500"
            onClick={handleNewChat}
            title="New Chat"
          />
          <History
            className="w-6 h-6 text-gray-500 cursor-pointer hover:text-blue-500"
            onClick={() => setShowHistory(!showHistory)}
            title="History"
          />
          <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide">
            Lobe Chat
          </span>
        </div>
      </div>

      {/* Middle Content */}
      <div className="flex flex-1 min-h-0">
        {/* Settings Panel */}
        {showSettings && (
          <div className="w-[320px] shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Model Settings</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="llama3.2:3b">Llama 3.2 3B</option>
                  <option value="llama3.2:1b">Llama 3.2 1B</option>
                  <option value="mistral:7b">Mistral 7B</option>
                  <option value="phi3:mini">Phi-3 Mini</option>
                  <option value="gemma:2b">Gemma 2B</option>
                  <option value="qwen2.5:3b">Qwen 2.5 3B</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="512"
                  max="4096"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Short</span>
                  <span>Long</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="w-[320px] shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const convId = conv._id || conv.id;
                  return (
                  <div
                    key={convId}
                    onClick={() => handleSelectConversation(convId)}
                    className={`p-3 m-1 rounded-lg cursor-pointer hover:bg-gray-200 flex items-center gap-3 transition-colors ${
                      selectedConversationId === convId
                        ? "bg-purple-100 hover:bg-purple-200"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate whitespace-nowrap overflow-hidden text-ellipsis">
                        {conv.title || "New Conversation"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(conv.updatedAt), "MMM d, HH:mm")}
                      </p>
                    </div>
                    <button
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100"
                      onClick={(e) => handleDeleteConversation(e, convId)}
                      aria-label="Delete conversation"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Chat Window */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Messages list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 space-y-5">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-gray-400">
                    Ask me anything! I'm powered by Ollama.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={i}
                      className={`flex ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex items-end gap-2 max-w-[80%] ${
                          isUser ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {isUser
                          ? renderUserAvatar(currentUser.avatar)
                          : renderAiAvatar()}
                        <div
                          className={`px-4 py-2 rounded-2xl whitespace-pre-wrap shadow-sm ${
                            isUser
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-900"
                          }`}
                        >
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
                      <div className="px-4 py-2 rounded-2xl whitespace-pre-wrap shadow-sm bg-gray-200 text-gray-900">
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
        </div>
      </div>

      {/* Input field */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-4 flex gap-2 border-t border-gray-200 bg-white shrink-0"
      >
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
  );

};

export default AIChat;
