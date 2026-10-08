# EduPulse AI

EduPulse AI is a campus information app for students and teachers. It brings
notices, academic deadlines, shared documents, and an AI assistant into one
web experience.

## Features

- Role-based student and teacher dashboards
- Campus notices and upcoming deadlines
- Student document workspace with PDF upload and viewing
- Chat assistant for questions about campus information
- Demo users, notices, and documents seeded when the backend starts

## Project layout

```text
.
├── backend/       FastAPI API, SQLite database, and backend tests
├── frontend/      React and Vite web application
├── demo_seed_data.json
└── demo_notice_seed_data.json
```

## Requirements

- Python 3.10 or newer
- Node.js and npm

## Setup

### Backend

From the repository root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

On Windows, activate the environment with
`.venv\Scripts\activate` instead of `source .venv/bin/activate`.

The backend reads configuration from `backend/.env`. The example configures
SQLite at `backend/edupulse.db` and local frontend CORS origins. Set
`GEMINI_API_KEY` to enable Gemini-powered chat; the default model is
`gemini-1.5-flash`.

Start the API from `backend/`:

```bash
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive API documentation is
available at `http://localhost:8000/docs`, and the health endpoint is
`http://localhost:8000/api/health`.

### Frontend

In another terminal, from the repository root:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The Vite development server prints its local URL (normally
`http://localhost:5173`). `VITE_API_URL` can be set in `frontend/.env` to point
the frontend at a different backend; it defaults to `http://localhost:8000`.

Use a demo account defined in `demo_seed_data.json` to sign in. Demo data is
loaded into the backend database on startup.

## Development checks

Build the frontend:

```bash
cd frontend
npm run build
```

Run the backend tests from `backend/` (with `pytest` installed in the active
environment):

```bash
python -m pytest
```

## Local data and configuration

The root `.gitignore` excludes virtual environments, installed frontend
dependencies, build output, local `.env` files, SQLite database files, Python
cache files, and uploaded documents. Keep credentials and other secrets in
local `.env` files; the checked-in `.env.example` files are templates.
