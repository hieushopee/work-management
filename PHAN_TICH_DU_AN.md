# 📊 PHÂN TÍCH CHI TIẾT DỰ ÁN - WORK MANAGEMENT SYSTEM

## 🎯 TỔNG QUAN DỰ ÁN

**Tên dự án:** Enterprise Internal Work Management System (Hệ thống Quản lý Công việc Nội bộ Doanh nghiệp)  
**Mô tả:** Hệ thống quản lý công việc nội bộ doanh nghiệp với tích hợp AI chat, nhận diện khuôn mặt, và các tính năng quản lý nhân viên, team, lịch làm việc  
**Kiến trúc:** Full-stack (Backend Node.js + Frontend React)

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

### **BACKEND (Node.js/Express)**

#### **Core Framework & Runtime**
- **Node.js** - Runtime environment
- **Express.js v5.1.0** - Web framework
- **ES6 Modules** - Module system (import/export)

#### **Database & ORM**
- **MongoDB** - NoSQL database
- **Mongoose v8.18.2** - ODM (Object Data Modeling)
- **Database Name:** `mgmt` (mặc định)

#### **Authentication & Security**
- **JSON Web Token (JWT) v9.0.2** - Authentication tokens
  - Access Token (15 phút)
  - Refresh Token (lưu trong cookie)
- **Cookie Parser v1.4.7** - Xử lý cookies
- **Express Validator v7.2.1** - Validation middleware

#### **Real-time Communication**
- **Socket.io v4.8.1** - WebSocket cho real-time messaging
  - Chat 1-1 và nhóm
  - Typing indicators
  - Online/offline status
  - Message read receipts

#### **File Upload & Storage**
- **Multer v2.0.2** - File upload middleware
- **ImageKit v6.0.0** - CDN và image hosting service
  - Upload ảnh khuôn mặt
  - Upload ảnh tin nhắn
  - Upload file calendar events

#### **Email Service**
- **Nodemailer v7.0.5** - Gửi email
  - Gửi mã truy cập (6 số)
  - Email xác thực
  - Email chào mừng nhân viên mới

#### **AI Integration**
- **OpenRouter** - Cổng AI chat thống nhất (OpenAI SDK)
  - Default model: `openai/gpt-4o-mini`
  - Configurable qua biến môi trường `OPENROUTER_MODEL`
  - Hỗ trợ Claude 3 Haiku/Sonnet, GPT-3.5 Turbo, GPT-4o mini...
  - Tạo tiêu đề hội thoại tự động, tối ưu tiếng Việt

#### **Date Handling**
- **Date-fns v4.1.0** - Thư viện xử lý ngày tháng

#### **Utilities**
- **dotenv v17.2.0** - Quản lý biến môi trường
- **CORS v2.8.5** - Cross-Origin Resource Sharing

#### **Dev Tools**
- **Nodemon v3.1.10** - Auto-reload server khi development

---

### **FRONTEND (React)**

#### **Core Framework**
- **React v19.1.0** - UI library
- **React DOM v19.1.0** - React renderer
- **React Router DOM v7.7.0** - Client-side routing

#### **Build Tool**
- **Vite v7.0.5** - Build tool và dev server
- **@vitejs/plugin-react v4.7.0** - Vite plugin cho React

#### **State Management**
- **Zustand v5.0.6** - Lightweight state management
  - `useUserStore` - Quản lý user state
  - `useTaskStore` - Quản lý task state
  - `useTeamStore` - Quản lý team state
  - `useEmployeeStore` - Quản lý employee state

#### **HTTP Client**
- **Axios v1.10.0** - HTTP client
  - Interceptors cho auto-refresh token
  - Base URL configuration

#### **UI Libraries & Components**
- **Tailwind CSS v4.1.11** - Utility-first CSS framework
- **PostCSS v8.5.6** - CSS processor
- **Autoprefixer v10.4.21** - CSS vendor prefixes
- **Lucide React v0.525.0** - Icon library
- **Framer Motion v12.23.12** - Animation library
- **React Hot Toast v2.5.2** - Toast notifications

#### **Rich Text Editor**
- **TinyMCE v8.1.2** - WYSIWYG editor
- **@tinymce/tinymce-react v6.3.0** - React wrapper cho TinyMCE

#### **Calendar Components**
- **FullCalendar v6.1.19** - Calendar component
  - `@fullcalendar/react` - React adapter
  - `@fullcalendar/timegrid` - Time grid view
  - `@fullcalendar/resource-timegrid` - Resource time grid
  - `@fullcalendar/interaction` - Interaction plugins
- **React Calendar v6.0.0** - Calendar picker component

#### **Face Recognition**
- **@vladmandic/face-api v1.7.15** - Face recognition library
  - Tiny Face Detector
  - Face Landmark Detection
  - Face Recognition

#### **Scrollbar**
- **tailwind-scrollbar v4.0.2** - Custom scrollbar styling

#### **TypeScript Support**
- **@types/react v19.1.8** - TypeScript types
- **@types/react-dom v19.1.6** - TypeScript types
- **tslib v2.8.1** - TypeScript helper library

#### **Linting & Code Quality**
- **ESLint v9.31.0** - Linter
- **@eslint/js v9.30.1** - ESLint core
- **eslint-plugin-react-hooks v5.2.0** - React Hooks linting
- **eslint-plugin-react-refresh v0.4.20** - React Refresh linting

---

### **DATABASE SCHEMA**

#### **User Model**
```javascript
{
  email: String (unique, required),
  accessCode: String,
  role: String (default: 'employee'), // 'owner' | 'employee'
  isVerified: Boolean,
  name: String,
  phoneNumber: String,
  department: String,
  faceUrl: String, // URL từ ImageKit
  avatar: String, // Base64 hoặc URL
  createdBy: ObjectId (ref: User),
  teams: [ObjectId] (ref: Team),
  timestamps: true
}
```

#### **Task Model**
```javascript
{
  assignedTo: [ObjectId] (ref: User),
  assigneeStatuses: [{
    user: ObjectId (ref: User),
    status: String, // 'todo' | 'doing' | 'done'
    role: String,
    updatedAt: Date
  }],
  name: String (required),
  description: String,
  status: String (default: 'todo'), // Aggregate status
  deadline: Date,
  priority: String (default: 'Normal'),
  isPinned: Boolean,
  timestamps: true
}
```

#### **Team Model**
```javascript
{
  name: String (required, unique),
  description: String,
  department: String,
  members: [ObjectId] (ref: User),
  createdBy: ObjectId (ref: User, required),
  timestamps: true
}
```

#### **Form Model** (Voting/Polling)
```javascript
{
  title: String (required),
  options: [{
    id: String,
    text: String,
    votes: Number,
    voters: [{
      id: ObjectId (ref: User),
      name: String,
      email: String
    }]
  }],
  duration: String (default: 'forever'),
  settings: Mixed, // { allowMultiple, allowAddOptions, pinToTop }
  ownerId: ObjectId (ref: User),
  isPinned: Boolean,
  pinnedAt: Number,
  timestamps: true
}
```

#### **CalendarEvent Model**
```javascript
{
  title: String (required),
  startDate: Date (required),
  endDate: Date (required),
  assignedTo: [ObjectId] (ref: User),
  createdById: ObjectId (ref: User),
  createdByName: String,
  createdByEmail: String,
  attendance: [{
    userId: ObjectId (ref: User),
    success: Boolean,
    imageUrl: String,
    at: Date
  }],
  taskDescription: String,
  reportNotes: String,
  shiftLogs: [{
    userId: ObjectId (ref: User),
    startedAt: Date,
    endedAt: Date,
    totalMinutes: Number,
    lateMinutes: Number,
    overtimeMinutes: Number
  }],
  reportAttachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  timestamps: true
}
```

#### **Conversation Model** (Chat)
```javascript
{
  conversationId: String (unique, indexed),
  participants: [ObjectId] (ref: User),
  participantDetails: [{
    userId: ObjectId,
    name: String,
    role: String,
    avatar: String
  }],
  participantStates: [{
    userId: ObjectId,
    lastReadAt: Date
  }],
  messages: [{
    senderId: String,
    receiverId: String,
    senderName: String,
    receiverName: String,
    message: String,
    messageType: String, // 'text' | 'image' | 'file' | 'mixed'
    attachments: [{
      kind: String, // 'image' | 'file'
      url: String,
      fileId: String,
      name: String,
      mimeType: String,
      size: Number,
      width: Number,
      height: Number,
      thumbnailUrl: String
    }],
    timestamp: Date,
    isGroup: Boolean,
    groupMembers: [String]
  }],
  groupName: String,
  groupAvatar: String,
  groupMembers: [String],
  lastMessageAt: Date,
  timestamps: true
}
```

#### **Chat Model** (AI Conversations)
```javascript
{
  userId: ObjectId (ref: User),
  title: String,
  messages: [{
    role: String, // 'user' | 'assistant'
    content: String
  }],
  timestamps: true
}
```

#### **Message Model** (Legacy - có thể không dùng)
```javascript
{
  senderId: ObjectId (ref: User),
  receiverId: ObjectId (ref: User),
  senderName: String,
  receiverName: String,
  senderRole: String,
  senderAvatar: String,
  receiverAvatar: String,
  message: String (required),
  conversationId: String (indexed),
  participants: [ObjectId] (ref: User),
  read: Boolean,
  readAt: Date,
  timestamp: Date,
  timestamps: true
}
```

---

## 🎨 CHỨC NĂNG HỆ THỐNG

### **1. AUTHENTICATION & AUTHORIZATION**

#### **Đăng nhập/Đăng ký**
- **Access Code System:**
  - Tạo mã truy cập 6 số ngẫu nhiên
  - Gửi mã qua email bằng Nodemailer
  - User đầu tiên tự động trở thành `owner`
  - User sau phải đã được đăng ký trước đó

- **Xác thực:**
  - Validate access code
  - Tạo JWT tokens (access + refresh)
  - Lưu tokens trong HTTP-only cookies
  - Auto refresh token khi hết hạn

- **Roles:**
  - **Owner:** Quyền quản trị toàn bộ hệ thống
  - **Employee:** Quyền hạn chế, chỉ quản lý task của mình

#### **Quản lý Profile**
- Xem thông tin cá nhân
- Cập nhật: tên, email, số điện thoại, phòng ban, role
- Upload avatar (base64 hoặc URL)
- Upload ảnh khuôn mặt (ImageKit)
- Thay đổi email → yêu cầu xác thực lại

---

### **2. QUẢN LÝ NHÂN VIÊN (Employee Management)**

#### **Chức năng Owner:**
- **Tạo nhân viên mới:**
  - Thông tin: tên, email, số điện thoại, phòng ban, role
  - Gán vào teams (nhiều team)
  - Upload ảnh khuôn mặt (face recognition)
  - Gửi email chào mừng tự động

- **Xem danh sách nhân viên:**
  - Tất cả users hoặc chỉ employees
  - Hiển thị thông tin teams
  - Sắp xếp theo ngày tạo

- **Cập nhật nhân viên:**
  - Sửa thông tin cá nhân
  - Thêm/xóa khỏi teams
  - Cập nhật ảnh khuôn mặt

- **Xóa nhân viên:**
  - Tự động xóa khỏi tất cả teams
  - Xóa các tham chiếu liên quan

---

### **3. QUẢN LÝ CÔNG VIỆC (Task Management)**

#### **Tạo Task:**
- Tên task (bắt buộc)
- Mô tả (rich text editor)
- Deadline (ngày giờ)
- Gán cho nhiều người (employees hoặc teams)
- Priority (mặc định: Normal)
- Trạng thái ban đầu: `todo`

#### **Theo dõi Task:**
- **Multi-assignee Support:**
  - Mỗi người được gán có trạng thái riêng
  - Aggregate status: `todo` | `doing` | `done`
  - Logic: Nếu có người `todo` → aggregate = `todo`
  - Nếu tất cả `done` → aggregate = `done`

- **Status Tracking:**
  - `todo` - Chưa bắt đầu
  - `doing` - Đang làm
  - `done` - Hoàn thành
  - Mỗi assignee có thể cập nhật status riêng

- **Pin Task:**
  - Ghim task quan trọng lên đầu danh sách

#### **Xem Task:**
- **Owner:**
  - Xem tất cả tasks
  - Filter theo employee
  - Quản lý tasks của mọi người

- **Employee:**
  - Chỉ xem tasks được gán cho mình
  - Cập nhật status của mình
  - Xem thông tin chi tiết task

#### **Cập nhật Task:**
- Sửa tên, mô tả, deadline
- Thêm/xóa assignees
- Cập nhật priority
- Toggle pin status

#### **Xóa Task:**
- Chỉ owner có quyền xóa

---

### **4. QUẢN LÝ TEAM**

#### **Tạo Team:**
- Tên team (unique, tối thiểu 3 ký tự)
- Mô tả
- Phòng ban
- Owner tự động trở thành creator
- Tự động tạo group conversation cho team

#### **Quản lý Members:**
- **Thêm members:**
  - Chỉ creator có quyền thêm
  - Tự động cập nhật user.teams
  - Tự động cập nhật conversation participants

- **Xóa members:**
  - Xóa khỏi team
  - Xóa khỏi user.teams
  - Cập nhật conversation

#### **Cập nhật Team:**
- Sửa tên, mô tả, phòng ban
- Chỉ creator có quyền
- Tự động sync với conversation

#### **Xóa Team:**
- Xóa team
- Xóa tất cả tham chiếu từ users
- Xóa conversation liên quan

---

### **5. LỊCH LÀM VIỆC (Calendar)**

#### **Tạo Event:**
- Tiêu đề (bắt buộc)
- Thời gian bắt đầu/kết thúc
- Gán cho nhiều nhân viên
- Mô tả công việc (rich text)
- Upload file đính kèm (report attachments)

#### **Quản lý Event:**
- **Attendance (Điểm danh):**
  - Sử dụng face recognition
  - Upload ảnh và verify
  - Lưu kết quả: success/failed
  - Lưu ảnh đã upload

- **Shift Logs (Chấm công):**
  - **Start Shift:**
    - Bắt đầu ca làm việc
    - Tính toán late minutes (đi muộn)
    - Phải đã điểm danh trước đó

  - **End Shift:**
    - Kết thúc ca làm việc
    - Tính toán:
      - Total minutes (tổng thời gian)
      - Overtime minutes (làm thêm)
    - Lưu thông tin vào shiftLogs

- **Report Notes:**
  - Ghi chú báo cáo công việc
  - Upload file đính kèm
  - Xóa file đính kèm

#### **Xem Calendar:**
- FullCalendar integration
- Time grid view
- Resource view (theo nhân viên)
- Filter theo nhân viên
- Filter theo khoảng thời gian

#### **Cập nhật/Xóa Event:**
- Sửa thông tin event
- Thêm/xóa file đính kèm
- Xóa event và tất cả attachments

---

### **6. FORM/POLLING (Bình chọn)**

#### **Tạo Form:**
- Tiêu đề form
- Tạo nhiều options (lựa chọn)
- Cài đặt:
  - `allowMultiple`: Cho phép chọn nhiều
  - `allowAddOptions`: Cho phép thêm option mới
  - `pinToTop`: Ghim form lên đầu

- Duration: `forever` (mặc định)

#### **Vote:**
- User có thể vote cho options
- Nếu `allowMultiple = false`: Chỉ vote 1 option (thay thế vote cũ)
- Nếu `allowMultiple = true`: Có thể vote nhiều options
- Lưu thông tin voter (id, name, email)

#### **Quản lý Options:**
- **Thêm option:**
  - Nếu `allowAddOptions = true`
  - Bất kỳ user nào cũng có thể thêm

- **Sửa option:**
  - Chỉ owner có quyền

- **Xóa option:**
  - Chỉ owner có quyền

#### **Xem Results:**
- Hiển thị số lượng votes
- Hiển thị danh sách voters
- Sắp xếp theo số votes

#### **Xóa Form:**
- Chỉ owner có quyền

---

### **7. CHAT & MESSAGING**

#### **Real-time Chat:**
- **1-1 Chat:**
  - Chat giữa 2 người
  - Conversation ID tự động tạo
  - Lưu lịch sử tin nhắn

- **Group Chat:**
  - Chat nhóm (từ team)
  - Tự động tạo khi tạo team
  - Thêm/xóa members tự động sync

#### **Tin nhắn:**
- **Text Messages:**
  - Gửi nhận text
  - Hỗ trợ rich text

- **File Attachments:**
  - Upload ảnh
  - Upload file
  - Preview ảnh
  - Download file
  - Lưu vào ImageKit hoặc local storage

#### **Real-time Features:**
- **Typing Indicators:**
  - Hiển thị "đang gõ..."
  - Socket.io events

- **Online/Offline Status:**
  - Hiển thị trạng thái online
  - Broadcast khi user online/offline

- **Read Receipts:**
  - Đánh dấu đã đọc
  - Hiển thị số tin nhắn chưa đọc
  - Last read timestamp

#### **Message History:**
- Lưu tất cả tin nhắn vào database
- Load tin nhắn cũ khi scroll
- Tìm kiếm tin nhắn

---

### **8. AI CHAT**

#### **OpenRouter Integration:**
- **Default model:** `openai/gpt-4o-mini` (có thể cấu hình)
- **Features:**
  - Chat tiếng Việt với đa model (Claude, GPT, v.v.)
  - Tạo tiêu đề cuộc hội thoại tự động
  - Lưu lịch sử conversation + chỉnh sửa tiêu đề
  - Tùy chỉnh temperature và max tokens từ frontend

#### **Conversation Management:**
- Tạo conversation mới
- Lưu lịch sử messages
- Xem danh sách conversations
- Xóa conversation
- Tự động tạo tiêu đề từ message đầu tiên

---

### **9. FACE RECOGNITION**

#### **Thư viện:**
- **@vladmandic/face-api**
  - Tiny Face Detector
  - 68 Face Landmarks Detection
  - Face Recognition

#### **Models:**
- `tiny_face_detector_model.bin`
- `face_landmark_68_model.bin`
- `face_recognition_model.bin`

#### **Chức năng:**
- **Upload ảnh khuôn mặt:**
  - Chụp ảnh từ webcam
  - Upload file
  - Lưu vào ImageKit
  - Lưu URL vào user.faceUrl

- **Face Verification (Điểm danh):**
  - So sánh ảnh hiện tại với ảnh đã lưu
  - Verify trong calendar attendance
  - Lưu kết quả: success/failed

---

### **10. REPORT & ANALYTICS**

#### **Calendar Reports:**
- Xem báo cáo theo event
- Ghi chú báo cáo công việc
- Upload file đính kèm
- Xem lịch sử chấm công:
  - Thời gian bắt đầu/kết thúc
  - Tổng thời gian làm việc
  - Thời gian đi muộn
  - Thời gian làm thêm

---

## 📁 CẤU TRÚC DỰ ÁN

```
work_mgmt3/
├── backend/
│   ├── app/
│   │   └── createApp.js          # Express app setup
│   ├── config/
│   │   ├── database.js           # MongoDB connection
│   │   ├── env.js                # Environment variables
│   │   ├── imagekit.js           # ImageKit configuration
│   │   ├── nodemailer.js         # Email service config
│   │   └── openai.js             # AI service config
│   ├── controllers/
│   │   ├── ai.controller.js      # AI chat endpoints
│   │   ├── auth.controller.js    # Authentication
│   │   ├── calendar.controller.js # Calendar events
│   │   ├── employee.controller.js # Employee CRUD
│   │   ├── form.controller.js    # Form/Polling
│   │   ├── task.controller.js    # Task management
│   │   └── team.controller.js    # Team management
│   ├── middlewares/
│   │   └── auth.middleware.js    # JWT authentication
│   ├── models/
│   │   ├── calendar.model.js     # Calendar schema
│   │   ├── chat.model.js         # AI conversations
│   │   ├── conversation.model.js # Chat conversations
│   │   ├── form.model.js         # Form/Poll schema
│   │   ├── message.model.js      # Message schema
│   │   ├── task.model.js         # Task schema
│   │   ├── team.model.js         # Team schema
│   │   └── user.model.js         # User schema
│   ├── realtime/
│   │   └── socketServer.js       # Socket.io server
│   ├── routes/
│   │   ├── ai.route.js           # AI routes
│   │   ├── auth.route.js         # Auth routes
│   │   ├── calendar.route.js     # Calendar routes
│   │   ├── employee.route.js     # Employee routes
│   │   ├── form.route.js         # Form routes
│   │   ├── message.route.js      # Message routes
│   │   ├── task.route.js         # Task routes
│   │   └── team.route.js         # Team routes
│   ├── utils/
│   │   ├── conversation.js       # Conversation helpers
│   │   ├── handleTokens.js       # JWT token utils
│   │   ├── identifiers.js        # ID normalization
│   │   └── mailOptions.js        # Email templates
│   ├── uploads/
│   │   └── calendar/             # Calendar file uploads
│   └── server.js                 # Server entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   │   ├── CameraBox.jsx     # Face recognition camera
│   │   │   ├── CreateFormModal.jsx
│   │   │   ├── EmployeeForm.jsx
│   │   │   ├── EventModal.jsx
│   │   │   ├── FormDetail.jsx
│   │   │   ├── FormList.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── MultiSelectDropdown.jsx
│   │   │   ├── TaskForm.jsx
│   │   │   ├── TeamForm.jsx
│   │   │   └── ...
│   │   ├── features/
│   │   │   └── chat/             # Chat feature
│   │   │       ├── components/
│   │   │       │   ├── AIChat.jsx
│   │   │       │   ├── ChatWindow.jsx
│   │   │       │   ├── CreateGroupModal.jsx
│   │   │       │   └── GroupMembersModal.jsx
│   │   │       ├── pages/
│   │   │       │   └── MessagePage.jsx
│   │   │       └── utils/
│   │   │           └── chatUtils.js
│   │   ├── pages/                # Page components
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── VerificationPage.jsx
│   │   │   ├── employee/
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   └── TaskPage.jsx
│   │   │   ├── owner/
│   │   │   │   ├── ManageEmployeePage.jsx
│   │   │   │   └── ManageTaskPage.jsx
│   │   │   ├── CalendarPage.jsx
│   │   │   ├── FormPage.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── ReportPage.jsx
│   │   ├── stores/               # Zustand stores
│   │   │   ├── useEmployeeStore.js
│   │   │   ├── useTaskStore.js
│   │   │   ├── useTeamStore.js
│   │   │   └── useUserStore.js
│   │   ├── hooks/
│   │   │   └── useSocket.jsx     # Socket.io hook
│   │   ├── libs/
│   │   │   ├── axios.js          # Axios config
│   │   │   └── face.js           # Face recognition setup
│   │   ├── constants/
│   │   │   ├── departments.js
│   │   │   ├── roles.js
│   │   │   ├── sideBar.jsx
│   │   │   └── taskStatus.js
│   │   ├── utils/
│   │   │   └── formatDate.js
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   ├── public/
│   │   └── models/               # Face recognition models
│   ├── dist/                     # Build output
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── package.json                  # Root package.json
└── README files
```

---

## 🔌 API ENDPOINTS

### **Authentication**
- `POST /api/auth/create-new-access-code` - Tạo mã truy cập
- `POST /api/auth/validate-access-code` - Xác thực mã
- `POST /api/auth/refresh-token` - Refresh token
- `GET /api/auth/profile` - Lấy thông tin user
- `POST /api/auth/edit` - Cập nhật profile
- `POST /api/auth/logout` - Đăng xuất

### **Employees**
- `GET /api/employees` - Lấy tất cả employees
- `GET /api/employees/all` - Lấy tất cả users
- `GET /api/employees/:id` - Lấy employee theo ID
- `POST /api/employees` - Tạo employee mới
- `POST /api/employees/:id` - Cập nhật employee
- `DELETE /api/employees/:id` - Xóa employee
- `POST /api/employees/:id/face` - Upload ảnh khuôn mặt

### **Tasks**
- `GET /api/tasks` - Lấy tất cả tasks
- `GET /api/tasks/:id` - Lấy tasks theo user ID
- `POST /api/tasks/create/:id` - Tạo task
- `POST /api/tasks/:id` - Cập nhật task
- `POST /api/tasks/:id/status` - Cập nhật status
- `POST /api/tasks/:id/pin` - Toggle pin
- `DELETE /api/tasks/:id` - Xóa task

### **Teams**
- `GET /api/teams` - Lấy tất cả teams
- `POST /api/teams` - Tạo team
- `POST /api/teams/:id` - Cập nhật team
- `DELETE /api/teams/:id` - Xóa team
- `POST /api/teams/:id/members` - Thêm member
- `DELETE /api/teams/:id/members` - Xóa member

### **Calendar**
- `GET /api/calendar/events` - Lấy events (query: start, end, members)
- `POST /api/calendar/events` - Tạo event
- `POST /api/calendar/events/:id` - Cập nhật event
- `DELETE /api/calendar/events/:id` - Xóa event
- `POST /api/calendar/events/:id/attendance` - Điểm danh
- `POST /api/calendar/events/:id/shift/start` - Bắt đầu ca
- `POST /api/calendar/events/:id/shift/end` - Kết thúc ca

### **Forms**
- `GET /api/forms` - Lấy tất cả forms
- `GET /api/forms/:formId` - Lấy form theo ID
- `POST /api/forms` - Tạo form
- `DELETE /api/forms/:formId` - Xóa form
- `POST /api/forms/:formId/options` - Thêm option
- `POST /api/forms/:formId/options/update` - Cập nhật options
- `DELETE /api/forms/:formId/options/:optionId` - Xóa option
- `POST /api/forms/:formId/vote` - Vote

### **AI Chat**
- `POST /api/ai/chat` - Chat với OpenRouter (Claude/GPT theo cấu hình)
- `GET /api/ai/conversations/:userId` - Lấy conversations
- `GET /api/ai/conversation/:conversationId` - Lấy conversation chi tiết
- `PATCH /api/ai/conversation/:conversationId` - Đổi tiêu đề conversation
- `DELETE /api/ai/conversation/:conversationId` - Xóa conversation

### **Messages** (Socket.io)
- `join` - Join room
- `sendMessage` - Gửi tin nhắn
- `receiveMessage` - Nhận tin nhắn
- `typing` - Typing indicator
- `stopTyping` - Stop typing
- `markAsRead` - Đánh dấu đã đọc
- `userOnline` - User online
- `userOffline` - User offline

---

## 🔐 BẢO MẬT

### **Authentication:**
- JWT tokens (access + refresh)
- HTTP-only cookies
- Auto-refresh token
- Role-based access control (RBAC)

### **Authorization:**
- Owner: Full access
- Employee: Limited access
- Middleware kiểm tra quyền trước mỗi request

### **Data Validation:**
- Express Validator
- Input sanitization
- Email validation
- ObjectId validation

### **File Upload:**
- Multer file size limits
- ImageKit secure upload
- File type validation

---

## 🌐 ENVIRONMENT VARIABLES

### **Backend (.env)**
```env
PORT=5000
NODE_ENV=development|production
MONGODB_URI=mongodb://localhost:27017/mgmt
CLIENT_URL=http://localhost:5173
CLIENT_LOGIN_URL=http://localhost:5173/login
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
APP_PASSWORD=your_email_password
MY_EMAIL=your_email@example.com
IMAGEKIT_PUBLIC_KEY=your_key
IMAGEKIT_PRIVATE_KEY=your_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
IMAGEKIT_FACE_FOLDER=/Face
IMAGEKIT_MESSAGE_FOLDER=/Messages
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

---

## 🚀 DEPLOYMENT

### **Backend:**
- Node.js server
- MongoDB database
- Socket.io server
- File uploads (local hoặc ImageKit)

### **Frontend:**
- Vite build
- Static files
- React Router (client-side routing)
- Environment variables

## 📝 GHI CHÚ

### **Tính năng đặc biệt:**
1. **Multi-assignee Tasks:** Mỗi người có status riêng, aggregate status tự động tính
2. **Face Recognition:** Điểm danh bằng nhận diện khuôn mặt
3. **Real-time Chat:** Socket.io cho chat 1-1 và nhóm
4. **AI Integration:** Hỗ trợ OpenRouter đa model (Claude, GPT, v.v.)
5. **Team Conversations:** Tự động tạo group chat khi tạo team
6. **Shift Logging:** Theo dõi chấm công chi tiết (late, overtime, total time)

### **Hạn chế:**
- Chưa có notification system
- Chưa có file storage riêng (dùng ImageKit)
- Chưa có email templates đẹp
- Chưa có export/import data

---

## 📚 TÀI LIỆU THAM KHẢO

- **Express.js:** https://expressjs.com/
- **Mongoose:** https://mongoosejs.com/
- **Socket.io:** https://socket.io/
- **React:** https://react.dev/
- **Vite:** https://vitejs.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **ImageKit:** https://imagekit.io/
- **OpenRouter:** https://openrouter.ai/
- **Face-api.js:** https://github.com/vladmandic/face-api

---

**Tạo bởi:** AI Assistant  
**Ngày:** 2024  
**Version:** 1.0.0

