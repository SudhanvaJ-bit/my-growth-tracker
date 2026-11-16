-- PostgreSQL schema for My Growth Tracker.
-- The backend creates these tables automatically on first start
-- (Base.metadata.create_all). This file is the same schema as plain SQL,
-- for reference or for creating the tables by hand:  psql "$DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS users (
    id                 SERIAL PRIMARY KEY,
    email              VARCHAR(255) NOT NULL,
    name               VARCHAR(80)  NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    timezone           VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
    daily_goal_percent INTEGER      NOT NULL DEFAULT 70,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_goal_range CHECK (daily_goal_percent BETWEEN 10 AND 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE TABLE IF NOT EXISTS tasks (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title          VARCHAR(120) NOT NULL,
    description    TEXT         NOT NULL DEFAULT '',
    task_date      DATE         NOT NULL,
    planned_hours  NUMERIC(4,2) NOT NULL,
    actual_hours   NUMERIC(4,2) NOT NULL DEFAULT 0,
    priority       VARCHAR(10)  NOT NULL DEFAULT 'medium',
    is_completed   BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at   TIMESTAMPTZ,
    rescheduled_to DATE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_tasks_planned_range CHECK (planned_hours > 0 AND planned_hours <= 24),
    CONSTRAINT ck_tasks_actual_range  CHECK (actual_hours >= 0 AND actual_hours <= 24),
    CONSTRAINT ck_tasks_priority      CHECK (priority IN ('low', 'medium', 'high'))
);
CREATE INDEX IF NOT EXISTS ix_tasks_user_date ON tasks (user_id, task_date);
