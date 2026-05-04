# Orion

Orion is a Django + React productivity workspace for planning goals, tracking tasks and routines, reviewing daily progress, and getting lightweight decision support.

## What's Included

- JWT-based authentication with protected app routes
- Guest mode for trying the app without creating a backend account
- Goals, tasks, daily planning, routine tracking, and progress views
- Decision helper and bill calculator tools
- Insights and assistant APIs for higher-level planning support
- PWA support with installable mobile experience, offline-friendly reads, and local reminder handling

## Project Structure

- `backend/`: Django REST API and SQLite database
- `frontend/`: React app built with Vite

## Backend Setup

### Windows (PowerShell)

```powershell
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py createsuperuser
..\.venv\Scripts\python.exe manage.py runserver
```

### macOS/Linux

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py runserver
```

Backend API base URL: `http://127.0.0.1:8000/api`

## Frontend Setup

### All platforms

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

## Main Routes

- `/login`
- `/register`
- `/`
- `/goals`
- `/tasks`
- `/routine`
- `/routine-progress`
- `/daily-plan`
- `/decision-helper`
- `/bill-calculator`

## API Overview

- `GET /api/health/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `POST /api/users/register/`
- Goals, tasks, planning, insights, routine, and assistant endpoints under `/api/`

## Quick Start

1. Start the backend and run migrations.
2. Create a user or use guest mode from the login screen.
3. Start the frontend.
4. Open the app, add goals and tasks, then use Daily Plan and Routine Tracking to review your day.
