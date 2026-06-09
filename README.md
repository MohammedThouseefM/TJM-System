# 🕌 Tableeghi Jamat Management System

A comprehensive full-stack web application for managing Tableeghi Jamat operations including member management, financial accounting, travel route planning, daily task assignment, and progress tracking.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | Node.js + Express.js |
| **Database** | TiDB Cloud (MySQL-compatible) |
| **Auth** | JWT (JSON Web Tokens) |
| **Charts** | Chart.js + react-chartjs-2 |

## 📋 Features

### Core Modules
- **👥 Member Management** – Add, edit, delete members with role assignment and search/filter
- **💰 Financial Accounting** – Track contributions, expenses, balances; CSV export
- **🗺️ Route Planning** – Record past trips, plan future destinations
- **📋 Task Management** – Daily task creation, assignment, status tracking with progress bar
- **📊 Dashboard** – Today's summary with charts, stats, announcements

### Additional Features
- **🔄 Duty Roster** – Auto-rotation for common duties (meal, cleaning, security)
- **📅 Attendance** – Bulk attendance marking with summary
- **🍽️ Meal Management** – Daily meal planning with ingredients and cook assignment
- **📢 Announcements** – Priority-based notifications for all members
- **🔐 Role-Based Access** – Admin, Member, Accountant, Route Planner roles

## 🛠️ Setup Instructions

### Prerequisites
- **Node.js** v18+ installed
- **npm** v9+ installed
- Internet connection (for TiDB Cloud database)

### Step 1: Clone / Navigate to Project
```bash
cd /home/mohammedthouseef/Documents/jamat
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Initialize Database
This creates the `jamat_db` database and all required tables in TiDB Cloud:
```bash
npm run init-db
```

### Step 4: Seed Initial Data
Creates admin user and sample members:
```bash
npm run seed
```

### Step 5: Start Backend Server
```bash
npm run dev
```
Backend runs on **http://localhost:5000**

### Step 6: Install Frontend Dependencies (new terminal)
```bash
cd frontend
npm install
```

### Step 7: Start Frontend Dev Server
```bash
npm run dev
```
Frontend runs on **http://localhost:5173**

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@jamat.com | admin123 |
| **Member** | ahmed@jamat.com | member123 |
| **Accountant** | farhan@jamat.com | member123 |
| **Route Planner** | hamza@jamat.com | member123 |

## 🏗️ Project Structure

```
jamat/
├── backend/
│   ├── config/db.js          # TiDB connection pool
│   ├── middleware/auth.js     # JWT auth & role authorization
│   ├── models/
│   │   ├── init.js            # Database schema creation
│   │   └── seed.js            # Initial data seeding
│   ├── controllers/           # Business logic (10 controllers)
│   ├── routes/                # API route definitions (10 routers)
│   ├── utils/helpers.js       # Shared utilities
│   ├── server.js              # Express app entry point
│   ├── .env                   # Environment configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/AuthContext.jsx  # Auth state management
│   │   ├── services/api.js          # Axios API client
│   │   ├── components/              # Reusable UI components
│   │   └── pages/                   # 11 page components
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 🔒 Environment Variables

Backend `.env` file (already configured):

| Variable | Description |
|----------|-------------|
| `DB_HOST` | TiDB Cloud hostname |
| `DB_PORT` | TiDB port (4000) |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name (jamat_db) |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry (7d) |
| `PORT` | Backend port (5000) |
| `FRONTEND_URL` | CORS origin (http://localhost:5173) |

## 📡 API Endpoints

| Module | Method | Endpoint | Auth |
|--------|--------|----------|------|
| Auth | POST | `/api/auth/register` | No |
| Auth | POST | `/api/auth/login` | No |
| Members | GET/POST/PUT/DELETE | `/api/members` | Yes (Admin for write) |
| Finance | GET/POST/DELETE | `/api/finance/transactions` | Yes |
| Finance | GET | `/api/finance/treasury` | Admin/Accountant |
| Finance | GET | `/api/finance/export` | Admin/Accountant |
| Routes | GET/POST/PUT/DELETE | `/api/routes` | Yes (Admin/Route Planner) |
| Tasks | GET/POST/PUT/DELETE | `/api/tasks` | Yes (Admin for write) |
| Duties | GET/POST/DELETE | `/api/duties` | Yes (Admin for write) |
| Attendance | GET/POST | `/api/attendance` | Yes (Admin for marking) |
| Meals | GET/POST/PUT/DELETE | `/api/meals` | Yes (Admin for write) |
| Announcements | GET/POST/DELETE | `/api/announcements` | Yes (Admin for write) |
| Dashboard | GET | `/api/dashboard` | Yes |

## 👤 User Roles & Permissions

| Permission | Admin | Member | Accountant | Route Planner |
|------------|-------|--------|------------|---------------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage Members | ✅ | ❌ | ❌ | ❌ |
| View Finance | ✅ | Own only | ✅ | ❌ |
| Add Transactions | ✅ | ❌ | ✅ | ❌ |
| Manage Routes | ✅ | ❌ | ❌ | ✅ |
| Create Tasks | ✅ | ❌ | ❌ | ❌ |
| Update Task Status | ✅ | Own tasks | ❌ | ❌ |
| Mark Attendance | ✅ | ❌ | ❌ | ❌ |
| Post Announcements | ✅ | ❌ | ❌ | ❌ |
