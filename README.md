# 🚀 Work Management System

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.14.0-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.18.2-green.svg)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-black.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

> A comprehensive full-stack work management system with AI integration, real-time chat, face recognition, and advanced task management features.

![Work Management System Preview](https://via.placeholder.com/800x400/2563EB/FFFFFF?text=Work+Management+System+Preview)

**👨‍💻 Developer:** [Hieushopee](mailto:hieutran6222@gmail.com)  
**🌐 Live Demo:** I don't have the official link yet.

## ✨ Features

### 🎯 Core Functionality
- **Multi-Role Authentication**: Owner and Employee roles with granular permissions
- **Advanced Task Management**: Multi-assignee tasks with individual status tracking
- **Team Collaboration**: Create and manage teams with automatic group chat creation
- **Calendar Integration**: Full calendar with event scheduling, attendance tracking, and shift logging
- **Real-time Messaging**: 1-on-1 and group chat with file sharing and typing indicators
- **AI-Powered Chat**: Integration with OpenRouter and local Ollama AI models
- **Face Recognition**: Automated attendance verification using facial recognition
- **Form & Polling**: Create polls with customizable options and voting features

### 🤖 AI Integration
- **OpenRouter API**: Cloud-based AI chat with Mistral model
- **Smart Conversations**: Automatic conversation title generation
- **Multi-language Support**: Optimized for Vietnamese language processing

### 📊 Advanced Features
- **Shift Tracking**: Detailed time logging with late arrival and overtime calculations
- **File Management**: Secure file uploads with ImageKit integration
- **Rich Text Editing**: TinyMCE integration for task descriptions and reports
- **Real-time Notifications**: Socket.io powered live updates
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **React 19.1.0** - Modern React with latest features
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **Socket.io Client** - Real-time communication
- **FullCalendar** - Advanced calendar component
- **TinyMCE** - Rich text editor
- **Face-api.js** - Facial recognition library

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
- **ImageKit** - Image hosting and optimization
- **Google Generative AI** - Alternative AI integrationStart frontend
   cd frontend && npm run dev
   ```

7. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📖 Usage Guide

### 👤 User Roles

#### Owner
- Full system administration
- Create and manage employees
- Create and assign tasks to anyone
- Manage all teams and calendar events
- Access all system features

#### Employee
- Manage personal profile
- View and update assigned tasks
- Participate in team chats
- View calendar events
- Use AI chat features

### 🎯 Key Workflows

#### Task Management
1. **Create Task**: Owner creates task with description, deadline, and assignees
2. **Assign Members**: Select multiple employees or entire teams
3. **Track Progress**: Each assignee updates their individual status
4. **Monitor Completion**: Aggregate status shows overall task progress

#### Team Collaboration
1. **Create Team**: Owner creates team with name and description
2. **Add Members**: Assign employees to teams
3. **Auto Chat Creation**: Group chat automatically created for team communication
4. **Real-time Updates**: All team members receive live notifications

#### Calendar & Attendance
1. **Schedule Events**: Create calendar events with time slots
2. **Face Recognition**: Employees check-in using facial verification
3. **Shift Tracking**: Automatic calculation of work hours, late arrivals, and overtime
4. **Report Generation**: Detailed attendance and time reports

## 🔧 API Documentation

### Authentication Endpoints
```http
POST /api/auth/create-new-access-code
POST /api/auth/validate-access-code
POST /api/auth/refresh-token
GET  /api/auth/profile
POST /api/auth/edit
POST /api/auth/logout
```

### Task Management
```http
GET  /api/tasks
POST /api/tasks/create/:userId
POST /api/tasks/:taskId
POST /api/tasks/:taskId/status
DELETE /api/tasks/:taskId
```

### Real-time Features
- **WebSocket Events**: `join`, `sendMessage`, `typing`, `markAsRead`
- **Online Status**: Automatic user presence tracking
- **File Sharing**: Real-time file upload and sharing in chats

## 🤖 AI Integration Setup

### OpenRouter Configuration
1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Get your API key
3. Add to `.env` file
4. Use Mistral model for Vietnamese language support



## 🎨 UI/UX Features

- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Dark/Light Theme**: Automatic theme detection
- **Smooth Animations**: Framer Motion powered transitions
- **Intuitive Navigation**: Clean sidebar navigation with icons
- **Toast Notifications**: Real-time feedback for user actions
- **Loading States**: Skeleton loaders and progress indicators

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions system
- **Input Validation**: Comprehensive server-side validation
- **File Upload Security**: Type and size restrictions
- **CORS Protection**: Cross-origin resource sharing controls
- **HTTP-Only Cookies**: Secure cookie storage for tokens

## 📊 Database Schema

### Core Collections
- **Users**: Authentication and profile data
- **Tasks**: Multi-assignee task management
- **Teams**: Team organization and membership
- **Calendar Events**: Scheduling and attendance
- **Conversations**: Chat history and metadata
- **Forms**: Polling and voting system
- **AI Chats**: AI conversation storage

## 🚀 Deployment

### Production Setup
1. **Environment Variables**: Configure production env vars
2. **Database**: Set up MongoDB Atlas or production MongoDB
3. **File Storage**: Configure ImageKit for production
4. **SSL/HTTPS**: Enable SSL certificates
5. **Process Manager**: Use PM2 for production deployment



## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing frontend framework
- **Socket.io** for real-time communication
- **MongoDB** for flexible document database
- **OpenRouter** for AI API access
- **ImageKit** for image management
- **Face-api.js** for facial recognition capabilities

## 📞 Support

For support, email hieutran6222@gmail.com or join our Discord community.

---

<div align="center">
  <p>Made with ❤️ by the Work Management Team</p>
  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#api-documentation">API Docs</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

**⭐ Star this repo if you find it useful!**

![GitHub stars](https://img.shields.io/github/stars/yourusername/work-management-system?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/work-management-system?style=social)
