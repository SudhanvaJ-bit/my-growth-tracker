# My Growth Tracker

A personal productivity tracker. Plan tasks for a day, give each one a number of
hours, log what you actually did, and watch your consistency over time on a
stock-style graph.

- **Frontend:** React, Tailwind CSS, Recharts (built with Vite)
- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Login:** bcrypt-hashed passwords and JWT tokens

---

## 1. How it works, in plain language

There are three pieces, and each has one job.

1. **The database (PostgreSQL)** remembers things. It has just two tables:
   `users` (who you are) and `tasks` (what you planned). Every task belongs to
   one user and one calendar date.
2. **The backend (FastAPI)** is the gatekeeper. The browser never talks to the
   database directly. It asks the backend ("give me today's tasks"), and the
   backend checks who is asking before it answers.
3. **The frontend (React)** is what you see. It draws the pages and sends your
   clicks to the backend.

**Logging in.** When you register, the backend stores a scrambled (bcrypt) version
of your password, never the password itself. When you log in it hands the
browser a signed token (a JWT) that is valid for 7 days. The browser attaches
that token to every request, and the backend uses it to work out which user is
asking. Every database query is filtered by that user's id, so one user can
never read or change another user's tasks.

**Why history is never lost.** Nothing is "reset" at midnight. A task simply
carries its date. "Today's dashboard" is the tasks dated today; "yesterday's
record" is the tasks dated yesterday. The daily record, the history page and
the graph are all calculated from the same task rows, so they always agree.

**Daily productivity percentage.** For each task on a day:

| Task state | Hours credited |
|---|---|
| Marked completed | Its full planned hours (finishing early still counts in full) |
| Not completed | The hours you logged, capped at the planned hours |

`score = credited hours ÷ planned hours × 100`

Example: three tasks planned for 2h, 1h and 0.5h. You complete the first and
log 0.5h on the second. Credited = 2 + 0.5 + 0 = 2.5 of 3.5 planned = **71.4%**.

**Task status.**

| Status | Meaning |
|---|---|
| Completed | Marked done |
| Partly done | Some hours logged, not marked done |
| Pending | Nothing logged yet, and the day is today or later |
| Missed | Nothing logged, and the day has passed |

**Streak.** The number of days in a row whose score reached your daily goal
(70% by default, adjustable in Settings). An unfinished *today* never breaks
the streak, because the day is still in progress.

**Rescheduling without rewriting the past.**
- A task for today or later that you haven't started is simply moved.
- A past task, or one with hours already logged, stays where it is. A new task
  for the *remaining* hours is created on the new date, and the old one is
  labelled "Rest moved to …". That past day's numbers do not change.

**The graph.** One point per day that had tasks (days with nothing planned are
skipped, the way a stock chart skips days the market is closed). The 1D view
shows today's tasks side by side instead, since one day is a single point.

**"Today" and time zones.** The server runs in UTC, so each user has a time
zone (picked up from the browser at registration, editable in Settings) and the
backend uses it to decide what "today" is.

---

## 2. Project layout

```
my-growth-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py          app entry point, CORS, routes
│   │   ├── config.py        settings from environment variables
│   │   ├── database.py      database connection
│   │   ├── models.py        the two tables (User, Task)
│   │   ├── schemas.py       input validation and response shapes
│   │   ├── security.py      password hashing and JWT
│   │   ├── deps.py          "who is the current user?" check
│   │   ├── progress.py      score, status, streak calculations
│   │   ├── messages.py      the short motivational messages
│   │   └── routers/         auth.py, tasks.py, progress.py (the API endpoints)
│   ├── tests/               automated tests (run against PostgreSQL)
│   ├── schema.sql           the database schema as plain SQL
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/           Login, Register, Dashboard, Tasks, History, Settings
│   │   ├── components/      Layout, GrowthChart, TaskItem, TaskForm, ...
│   │   └── lib/             api.js (talks to the backend), auth, theme, dates
│   ├── .env.example
│   └── vercel.json
├── docker-compose.yml       local PostgreSQL
├── render.yaml              backend deployment blueprint
└── README.md
```

---

## 3. Run it locally

You need **Python 3.11+**, **Node.js 18+**, and **PostgreSQL** (easiest through
Docker). Commands are shown for Windows PowerShell with macOS/Linux
alternatives where they differ.

### Step 1: start PostgreSQL

With Docker Desktop running, from the project folder:

```bash
docker compose up -d
```

That starts PostgreSQL on port 5433 with user `postgres`, password `postgres`
and a database called `growth_tracker`. (If you installed PostgreSQL yourself
instead, create an empty database and use its connection string in step 2.)

### Step 2: start the backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
uvicorn app.main:app --reload
```

The API is now at http://localhost:8000 and its interactive documentation is at
http://localhost:8000/docs. The tables are created automatically on first start.

### Step 3: start the frontend

In a second terminal:

```powershell
cd frontend
npm install
copy .env.example .env            # macOS/Linux: cp .env.example .env
npm run dev
```

Open http://localhost:5173, create an account, and add your first task.

### Running the tests

The tests use a real PostgreSQL database and **wipe it on every run**, so give
them their own empty database, never your real one:

```powershell
docker compose exec db createdb -U postgres growth_test
cd backend
pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/growth_test"
pytest
```

(macOS/Linux: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/growth_test pytest`)

---

## 4. Environment variables

**Backend (`backend/.env`)**

| Variable | What it is | Example |
|---|---|---|
| `ENVIRONMENT` | `development` or `production`. In production the app refuses to start with a weak `SECRET_KEY`. | `production` |
| `DATABASE_URL` | PostgreSQL connection string. `postgres://` and `postgresql://` both work. | `postgresql://user:pass@host/db?sslmode=require` |
| `SECRET_KEY` | Random string (32+ characters) that signs login tokens. Changing it logs everyone out. | output of `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long a login lasts. | `10080` (7 days) |
| `CORS_ORIGINS` | Frontend address(es) allowed to call the API, comma-separated, no trailing slash. | `https://my-growth-tracker.vercel.app` |

**Frontend (`frontend/.env`)**

| Variable | What it is | Example |
|---|---|---|
| `VITE_API_URL` | Address of the backend, no trailing slash. Read at **build** time. | `https://my-growth-tracker-api.onrender.com` |

---

## 5. Deployment

The three pieces are deployed separately. The steps below use **Neon**
(managed PostgreSQL), **Render** (backend) and **Vercel** (frontend). All three
offered a free tier when this was written; check their current pricing pages,
because free-tier limits change. Any equivalent host works: the app only needs
the environment variables above.

Push the project to a GitHub repository first.

### Step 1: database (Neon)

1. Create a project at neon.tech.
2. Copy the connection string it shows you (it starts with `postgresql://` and
   ends with `?sslmode=require`). That is your `DATABASE_URL`.

You don't need to create tables; the backend does it on first start. To create
them by hand instead: `psql "<connection string>" -f backend/schema.sql`.

### Step 2: backend (Render)

1. In Render choose **New > Blueprint** and select your repository. Render
   reads `render.yaml`.
2. When asked, fill in:
   - `DATABASE_URL`: the Neon connection string.
   - `CORS_ORIGINS`: a placeholder such as `http://localhost:5173` for now
     (you'll set the real one in step 4).
   - `SECRET_KEY` is generated for you.
3. Wait for the deploy, then open `https://<your-service>.onrender.com/api/health`.
   It should show `{"status":"ok"}`.

Without the blueprint, create a **Web Service** manually with root directory
`backend`, build command `pip install -r requirements.txt`, start command
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and add the environment
variables from section 4 (`ENVIRONMENT=production`).

### Step 3: frontend (Vercel)

1. Import the repository in Vercel.
2. Set **Root Directory** to `frontend`. Vercel detects Vite
   (build command `npm run build`, output directory `dist`).
3. Add the environment variable `VITE_API_URL` = your Render URL
   (no trailing slash).
4. Deploy and note the site URL.

`frontend/vercel.json` makes page refreshes on `/tasks`, `/history` and so on
work. (`public/_redirects` does the same job on Netlify and Cloudflare Pages.)

### Step 4: connect them

1. In Render, set `CORS_ORIGINS` to your Vercel URL exactly, for example
   `https://my-growth-tracker.vercel.app` (no trailing slash), and save. Render
   redeploys.
2. Open the Vercel URL, register, and add a task.

### If something doesn't work

| Symptom | Likely cause |
|---|---|
| "Can't reach the server" in the app | `VITE_API_URL` is wrong, or was changed without redeploying the frontend (it is baked in at build time). On a free Render plan the first request after idle time can also take a while as the service wakes up. |
| Browser console shows a CORS error | `CORS_ORIGINS` doesn't exactly match the frontend address (check `https`, and no trailing slash). |
| Backend fails to start with a `SECRET_KEY` error | `ENVIRONMENT=production` needs a `SECRET_KEY` of 32+ characters. |
| Backend fails with a connection error | `DATABASE_URL` is wrong, or is missing `?sslmode=require` for a provider that needs SSL. |

---

## 6. API reference

All routes except register, login and health need the header
`Authorization: Bearer <token>`. Full interactive docs: `/docs`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns a token |
| POST | `/api/auth/login` | Log in, returns a token |
| GET | `/api/users/me` | Current user |
| PATCH | `/api/users/me` | Update name, time zone, daily goal |
| POST | `/api/users/me/password` | Change password |
| GET | `/api/tasks?date=YYYY-MM-DD` | Tasks for a day (or `start` and `end` for a range) |
| POST | `/api/tasks` | Add a task |
| PATCH | `/api/tasks/{id}` | Edit, log hours (`actual_hours`), complete (`is_completed`) |
| DELETE | `/api/tasks/{id}` | Delete a task |
| POST | `/api/tasks/{id}/reschedule` | Move unfinished work to another day |
| GET | `/api/dashboard` | Today's tasks, numbers, streak, message, leftovers |
| GET | `/api/history?start=&end=` | Day-by-day record, newest first |
| GET | `/api/stats?range=1d\|1w\|1m\|6m\|1y\|all` | Graph data |
| GET | `/api/health` | Health check |

---

## 7. Things worth knowing

- **Deleting or editing a past task changes that day's record.** History is
  calculated from tasks, so the app protects the past in the automatic paths
  (new days, rescheduling) but still lets you correct a mistake yourself.
- **The login token is kept in the browser's localStorage.** That is simple and
  fine for a personal project. An app holding sensitive data would usually move
  to httpOnly cookies with refresh tokens.
- **There is no "forgot password" email and no login rate limiting**, to avoid
  paid services and extra moving parts. You can change your password in Settings
  while logged in.
- **Schema changes.** Tables are created automatically, but later changes to
  columns are not applied to an existing database. If you start evolving the
  schema, add Alembic migrations at that point.
