-- MeetSync Database Schema Migration
-- Run this once against your Neon (PostgreSQL) database

-- ============================================================
-- 1. USERS TABLE
--    Add password_hash column if upgrading from plaintext setup
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT,           -- legacy plaintext (will be ignored after migration)
  password_hash TEXT,        -- bcrypt hash — used for new auth
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. MEETINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  code         VARCHAR(8) UNIQUE NOT NULL,
  host_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status       TEXT DEFAULT 'scheduled',   -- scheduled | live | completed
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TRANSCRIPTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transcripts (
  id         SERIAL PRIMARY KEY,
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  text       TEXT NOT NULL,
  timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id         SERIAL PRIMARY KEY,
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
);

-- ============================================================
-- 5. SUMMARIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS summaries (
  id           SERIAL PRIMARY KEY,
  meeting_id   INTEGER REFERENCES meetings(id) ON DELETE CASCADE UNIQUE,
  raw_text     TEXT,
  key_points   JSONB DEFAULT '[]',
  decisions    JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  sentiment    TEXT DEFAULT 'neutral',
  duration     TEXT,
  ai_confidence INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. FACE EMBEDDINGS TABLE (keep existing, ensure it exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS face_embeddings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  embedding  FLOAT8[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendance_meeting ON attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meetings_code ON meetings(code);
CREATE INDEX IF NOT EXISTS idx_face_user ON face_embeddings(user_id);
