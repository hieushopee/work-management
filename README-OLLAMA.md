# Lobe Chat + Ollama Integration

This project now includes Lobe Chat integration with Ollama for free, local AI chat functionality.

## 🚀 Quick Setup

### 1. Install Ollama

**Windows:**
```bash
# Run the setup script
setup-ollama.bat
```

**Manual Installation:**
1. Download Ollama from [ollama.com](https://ollama.com)
2. Install the application
3. Open terminal and run: `ollama serve`

### 2. Install AI Models

```bash
# Install recommended models
ollama pull llama3.2:3b    # Best balance of speed and quality
ollama pull llama3.2:1b    # Faster, smaller model
ollama pull mistral:7b     # Good alternative
ollama pull phi3:mini      # Microsoft's model
ollama pull gemma:2b       # Google's model
```

### 3. Start the Application

```bash
# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm start
```

## 🎯 Features

### Lobe Chat Interface
- **Modern UI**: Clean, responsive design inspired by Lobe Chat
- **Model Selection**: Choose from multiple Ollama models
- **Parameter Control**: Adjust temperature and max tokens
- **Conversation History**: Save and manage chat conversations
- **Real-time Typing**: See when AI is responding

### Supported Models
- **Llama 3.2 3B**: Recommended for most users (good balance)
- **Llama 3.2 1B**: Faster, smaller model
- **Mistral 7B**: High-quality alternative
- **Phi-3 Mini**: Microsoft's efficient model
- **Gemma 2B**: Google's lightweight model
- **Qwen 2.5 3B**: Alibaba's model

### API Endpoints
- `POST /api/ai/chat-ollama` - Chat with Ollama
- `GET /api/ai/ollama/models` - Get available models
- `GET /api/ai/conversations/:userId` - Get user conversations
- `GET /api/ai/conversation/:conversationId` - Get specific conversation
- `DELETE /api/ai/conversation/:conversationId` - Delete conversation

## 🔧 Configuration

### Environment Variables
```env
# Ollama configuration (optional)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### Model Parameters
- **Temperature**: Controls randomness (0.0 - 2.0)
- **Max Tokens**: Maximum response length (512 - 4096)
- **Model**: Choose from installed Ollama models

## 📱 Usage

1. **Access Lobe Chat**: Click "Lobe Chat" in the sidebar
2. **Select Model**: Choose your preferred AI model
3. **Adjust Settings**: Set temperature and max tokens
4. **Start Chatting**: Type your message and press Enter
5. **Manage Conversations**: View, switch, or delete conversations

## 🛠️ Troubleshooting

### Ollama Not Running
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama service
ollama serve
```

### Model Not Found
```bash
# List installed models
ollama list

# Install missing model
ollama pull llama3.2:3b
```

### Connection Issues
- Ensure Ollama is running on port 11434
- Check firewall settings
- Verify backend can reach localhost:11434

## 🔄 Migration from OpenRouter

The system now supports both OpenRouter and Ollama:

- **OpenRouter**: `/api/ai/chat` (existing)
- **Ollama**: `/api/ai/chat-ollama` (new)

You can use both simultaneously or migrate completely to Ollama for free, local AI.

## 📊 Performance

### Model Comparison
| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| llama3.2:1b | ~1GB | Fast | Good | Quick responses |
| llama3.2:3b | ~2GB | Medium | Better | Balanced |
| mistral:7b | ~4GB | Slower | Best | High quality |

### System Requirements
- **RAM**: 4GB+ (8GB+ recommended)
- **Storage**: 10GB+ for models
- **CPU**: Modern multi-core processor
- **GPU**: Optional (CUDA support for faster inference)

## 🎨 Customization

### UI Themes
The Lobe Chat component supports customization:
- Modify colors in `LobeChat.jsx`
- Adjust layout and spacing
- Add new features and components

### Model Integration
Add new models by:
1. Installing with `ollama pull <model>`
2. Adding to model dropdown in `LobeChat.jsx`
3. Testing with the new model

## 📚 Resources

- [Ollama Documentation](https://ollama.com/docs)
- [Lobe Chat GitHub](https://github.com/lobehub/lobe-chat)
- [Model Library](https://ollama.com/library)
- [API Reference](https://ollama.com/docs/api)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with multiple models
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

