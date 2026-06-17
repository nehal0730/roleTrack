# Task Manager — Role-Based Project & Task Management System

A full-stack application built with **Node.js + Express + TypeScript** (backend) and **React + TypeScript + Vite** (frontend), using **MySQL** as the database.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [Default Login](#default-login)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Role Permissions](#role-permissions)
- [Features](#features)

---

## Prerequisites

Make sure these are installed on your machine:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Comes with Node.js |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |
| Git | any | https://git-scm.com |

---

## Database Setup

### 1. Start MySQL

```bash
# macOS (Homebrew)
brew services start mysql

# Ubuntu/Debian
sudo systemctl start mysql

# Windows
# Start from Services panel or MySQL Workbench
```

### 2. Log in to MySQL

```bash
mysql -u root -p
```

### 3. Run the schema

```bash
mysql -u root -p < backend/src/database/schema.sql
```

This creates the `task_manager` database with all tables and seeds:
- 3 roles: `admin`, `project_manager`, `employee`
- 1 admin user: `admin@taskmanager.com`

### 4. Fix the admin password (important)

The seed file contains a placeholder hash. Run this inside the `backend` folder to generate the correct hash for `Admin@123`:

```bash
cd backend
node -e "const b=require('bcryptjs'); b.hash('Admin@123',12).then(h=>console.log(h))"
```

Copy the output hash, then run in MySQL:

```sql
USE task_manager;
UPDATE users
SET password_hash = '<paste_your_hash_here>'
WHERE email = 'admin@taskmanager.com';
```

---

## Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create `.env` file

Create `backend/.env` with the following content:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=task_manager
DB_USER=root
DB_PASSWORD=your_mysql_password

JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_key_minimum_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Task Manager <your_email@gmail.com>

CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
```

> **Gmail App Password**: Go to your Google Account → Security → 2-Step Verification → App Passwords. Generate a password for "Mail". Use that as `EMAIL_PASS`, not your regular Gmail password.

### 3. Create uploads folder

```bash
mkdir backend/uploads
```

### 4. Start the backend

```bash
cd backend
npm run dev
```

The server starts at **http://localhost:5000**

You should see:
```
Database connected
Scheduler started — deadline checks every 5 min, overdue checks every 10 min
Server on :5000
```

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the frontend

```bash
cd frontend
npm run dev
```

The app opens at **http://localhost:5173**

---

## Running the Application

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@taskmanager.com | Admin@123 |

> The Admin logs in first and creates Project Manager and Employee accounts from the **Users** page. There is no public signup — all accounts are created by the Admin.

### Workflow to get started:

1. Log in as Admin
2. Go to **Users** → Create a Project Manager (set role to "Project Manager")
3. Go to **Users** → Create an Employee (set role to "Employee")
4. Go to **Projects** → Create a project, assign the Project Manager
5. Go to **Tasks** → Create a task, assign to the Employee
6. Log out and log in as the Employee to see their assigned tasks
7. Log out and log in as the Project Manager to manage the project

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port for Express server | `5000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | Database name | `task_manager` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `yourpassword` |
| `JWT_SECRET` | Secret for access tokens (min 32 chars) | `long_random_string_here` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | `another_long_string` |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP email address | `you@gmail.com` |
| `EMAIL_PASS` | SMTP password or app password | `xxxx xxxx xxxx xxxx` |
| `EMAIL_FROM` | Sender display name + email | `Task Manager <you@gmail.com>` |
| `CLIENT_URL` | Frontend URL for CORS + email links | `http://localhost:5173` |

---

## API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login with email + password |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Auth | Logout |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| GET | `/api/auth/me` | Auth | Get current user |

### Projects
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/projects` | Auth | List projects (role-filtered). Query: `status`, `manager_id`, `from`, `to`, `page`, `limit` |
| GET | `/api/projects/:id` | Auth | Get project by ID |
| POST | `/api/projects` | Admin | Create project |
| PUT | `/api/projects/:id` | Admin, PM | Update project (PM: own only) |
| DELETE | `/api/projects/:id` | Admin | Delete project (soft) |

### Tasks
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/tasks` | Auth | List tasks (role-filtered). Query: `status`, `priority`, `assigned_to`, `project_id`, `deadline_from`, `deadline_to` |
| GET | `/api/tasks/:id` | Auth | Get task with history + assignments |
| GET | `/api/tasks/:id/history` | Auth | Get task change history |
| GET | `/api/tasks/:id/assignments` | Auth | Get task assignment trail |
| POST | `/api/tasks` | Admin, PM | Create task |
| PUT | `/api/tasks/:id` | Auth | Update task (Employee: status only, own tasks) |
| DELETE | `/api/tasks/:id` | Admin, PM | Delete task (soft) |

### Work Logs
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/work-logs` | Auth | List logs. Query: `project_id`, `user_id`, `from`, `to`, `page`, `limit` |
| GET | `/api/work-logs/task/:task_id` | Auth | Logs for a specific task |
| POST | `/api/work-logs` | Auth | Submit work log (with optional file attachment) |
| POST | `/api/work-logs/:log_id/reply` | Admin, PM | Reply to a work log |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin, PM | List users (PM sees employees only) |
| GET | `/api/users/:id` | Admin | Get user by ID |
| GET | `/api/users/:id/workload` | Admin, PM | Active task assignments for user |
| POST | `/api/users` | Admin | Create user |
| PUT | `/api/users/:id` | Admin | Update user (name, role, active status) |
| DELETE | `/api/users/:id` | Admin | Deactivate user (soft) |

### Notifications
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/notifications` | Auth | List notifications (own) |
| GET | `/api/notifications/unread-count` | Auth | Count unread notifications |
| PUT | `/api/notifications/:id/read` | Auth | Mark one as read |
| PUT | `/api/notifications/read-all` | Auth | Mark all as read |

### Reports
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/reports/overview` | Admin | System-wide stats |
| GET | `/api/reports/project/:id` | Admin, PM | Project completion %, task breakdown |
| GET | `/api/reports/employee/:id` | Admin, PM | Employee task stats, hours logged |

### Audit Logs
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/audit-logs` | Admin | Activity log. Query: `entity_type`, `user_id`, `page`, `limit` |

---

## Role Permissions

### Admin
- Full access to all projects, tasks, users
- Create / edit / delete projects, tasks, users
- Assign Project Managers to projects
- Assign Employees to tasks
- View activity log, all reports, all work logs
- Receive notifications for system events

### Project Manager
- View and manage **only assigned projects**
- Create, update, and assign tasks within assigned projects
- View team work logs and reply to them
- View project-level and employee reports (for own team)
- Cannot access other managers' projects
- Cannot create or delete users

### Employee
- View and update **only assigned tasks** (status change only)
- Submit work logs with hours and optional file attachments
- View Project Manager replies on their logs
- Receive deadline and assignment notifications
- Cannot create projects or tasks
- Cannot view other employees' tasks

---

## Features

### Implemented

- [x] JWT authentication with refresh tokens
- [x] Role-based access control (Admin / Project Manager / Employee)
- [x] Password reset via email
- [x] Role-specific dashboards with live stats
- [x] Project management (create, edit, archive, view details, progress tracking)
- [x] Task management (create, edit, assign, status change, timeline, history)
- [x] Task assignment history (`task_assignments` table)
- [x] Task field change history (`task_history` table — status, priority, deadline, title)
- [x] Work log system with file attachments
- [x] PM reply to work logs with full conversation thread
- [x] Background scheduler: 48h / 24h / 12h / 1h deadline email reminders
- [x] Overdue alerts to employee and project manager
- [x] In-app notifications with unread count badge
- [x] Activity audit log with previous/new value diff
- [x] Search and filters: projects (status, manager, date range), tasks (status, priority, employee, deadline), logs (employee, project, date range)
- [x] Project reports: completion %, total/completed/pending tasks, hours logged
- [x] Employee reports: assigned tasks, completed, avg completion time, total hours
- [x] Admin overview report
- [x] Soft delete on users, projects, tasks
- [x] DB indexes on all filter and FK columns
- [x] Unique constraint prevents duplicate deadline notifications

### Database Tables

| Table | Purpose |
|-------|---------|
| `roles` | Role definitions (admin, project_manager, employee) |
| `users` | User accounts with soft delete |
| `projects` | Projects with soft delete |
| `tasks` | Tasks with soft delete |
| `task_assignments` | Assignment history (who assigned to whom, from when to when) |
| `task_history` | Field change log for status, priority, deadline, title |
| `work_logs` | Employee progress submissions |
| `log_replies` | PM replies to work logs |
| `notifications` | In-app + email notification records |
| `audit_logs` | Full system audit trail with before/after values |

---

## Troubleshooting

**"Cannot connect to database"**
- Check MySQL is running: `mysql -u root -p`
- Verify `DB_PASSWORD` in `.env` matches your MySQL root password

**"Invalid credentials" on login**
- Re-run the password hash fix in the [Database Setup](#4-fix-the-admin-password-important) section

**Emails not sending**
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- For Gmail, use an App Password (not your regular password)
- Make sure 2-Step Verification is enabled on your Google account

**File uploads not working**
- Make sure `backend/uploads/` directory exists: `mkdir backend/uploads`

**Frontend can't reach backend**
- Confirm backend is running on port 5000
- Check `CLIENT_URL=http://localhost:5173` in backend `.env`

**TypeScript errors on build**
```bash
cd backend
npx tsc --noEmit
```