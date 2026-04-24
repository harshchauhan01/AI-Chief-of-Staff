# AI Personal Chief of Staff

Monorepo starter for a Django API + React (JSX) app.

## Project Structure

- `backend/`: Django + DRF API
- `frontend/`: React app (Vite)

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

API base URL: `http://127.0.0.1:8000/api`

## Frontend Setup

### All platforms

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

## Included Starter Endpoints

- `GET /api/health/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `CRUD /api/goals/`
- `CRUD /api/tasks/`
- `GET /api/planning/daily/`
- `POST /api/assistant/coach/`

## Quick Usage

1. Start backend and create a superuser.
2. Start frontend.
3. Open `/login` in the frontend and sign in with Django credentials.
4. Add goals and tasks, then open Daily Plan.
