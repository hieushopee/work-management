# 🚀 Enterprise Internal Work Management System

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.14.0-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.18.2-green.svg)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-black.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

> Comprehensive enterprise internal work management system integrating AI, real-time chat, facial recognition, and advanced task management. Digitizes workflows, optimizes performance, and enhances collaboration.

**👨‍💻 Developer:** [Hieushopee](mailto:hieutran6222@gmail.com)  
**🌐 Live Demo:** Not available yet

## ✨ Features

### 🎯 Core Functionality
- **Multi-Role Authentication**: Owner and Employee roles with granular permissions
- **Advanced Task Management**: Multi-assignee tasks with individual status tracking
- **Team Collaboration**: Teams with automatic group chat creation
- **Calendar Integration**: Event scheduling, attendance tracking, shift logging
- **Real-time Messaging**: 1-on-1 and group chat with file sharing
- **AI-Powered Chat**: Anthropic Claude-3 and OpenAI GPT models
- **Face Recognition**: Automated attendance verification
- **Form & Polling**: Customizable polls and voting

### 🤖 AI Integration
- **Anthropic Claude-3**: Haiku and Sonnet models for advanced AI chat
- **OpenAI GPT**: GPT-3.5-turbo and GPT-4o-mini models
- **Smart Conversations**: Auto-generated titles
- **Multi-language Support**: Optimized for Vietnamese

### 📊 Advanced Features
- **Shift Tracking**: Time logging with late/overtime calculations
- **File Management**: Secure uploads with ImageKit
- **Rich Text Editing**: TinyMCE for descriptions
- **Real-time Notifications**: Socket.io updates
- **Responsive Design**: Mobile-first with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **React 19.1.0** - Modern React framework
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Socket.io Client** - Real-time communication
- **FullCalendar** - Calendar component
- **TinyMCE** - Rich text editor
- **Face-api.js** - Facial recognition

### Backend
- **Node.js 22.14.0** - Server runtime
- **Express.js 5.1.0** - Web framework
- **MongoDB 8.18.2** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Authentication tokens
- **ImageKit** - Cloud image management
- **Nodemailer** - Email service

### AI & External Services
- **OpenRouter API** - AI chat service
- **ImageKit** - Image hosting
- **Google Generative AI** - Alternative AI

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hieushopee/work-management.git
   cd work-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Environment Setup**
   ```bash
   cp backend/.env.example backend/.env
   ```

4. **Configure Environment Variables**
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/work_mgmt
   CLIENT_URL=http://localhost:5173
   ACCESS_TOKEN_SECRET=your_access_token_secret
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   APP_PASSWORD=your_email_app_password
   MY_EMAIL=your_email@gmail.com
   IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

5. **Start MongoDB**
   ```bash
   mongod
   ```

6. **Start the Application**
   ```bash
   # Backend
   npm start or npm run dev

   # Frontend (new terminal)
   cd frontend && npm run dev
   ```

7. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📖 Usage Guide

### 👤 User Roles

#### Owner
- Full system administration
- Create/manage employees and tasks
- Manage teams and calendar events

#### Employee
- Manage profile
- View/update assigned tasks
- Participate in team chats
- Use AI chat features

### 🎯 Key Workflows

#### Task Management
1. Create task with description, deadline, assignees
2. Assign to employees or teams
3. Track individual progress
4. Monitor overall completion

#### Team Collaboration
1. Create team with name and description
2. Add members
3. Auto-generated group chat
4. Real-time notifications

#### Calendar & Attendance
1. Schedule events with time slots
2. Face recognition check-in
3. Automatic shift tracking
4. Attendance reports


## 🤖 AI Integration Setup

### Anthropic Claude-3 Configuration
1. Sign up at [Anthropic](https://anthropic.com)
2. Get API key for Claude-3 Haiku/Sonnet
3. Add to `.env` as `ANTHROPIC_API_KEY`

### OpenAI GPT Configuration
1. Sign up at [OpenAI](https://openai.com)
2. Get API key for GPT models
3. Add to `.env` as `OPENAI_API_KEY`
4. Supports GPT-3.5-turbo and GPT-4o-mini

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the frontend framework
- **Socket.io** for real-time communication
- **MongoDB** for the database
- **OpenRouter** for AI API
- **ImageKit** for image management
- **Face-api.js** for facial recognition

## 📞 Support

For support, email hieutran6222@gmail.com

---

<div align="center">
  <p>Made with ❤️ by Hieushopee</p>
</div>
