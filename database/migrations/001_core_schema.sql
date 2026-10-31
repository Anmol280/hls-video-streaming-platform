-- Initial canonical schema for hls_platform.
-- Safe to run through the PostgreSQL image init hook or scripts/migrate.js.
-- Legacy columns are retained and backfilled; this migration does not drop data.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  bio TEXT,
  website VARCHAR(255),
  location VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
UPDATE users SET role = 'user' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'creator', 'moderator', 'admin'));

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_filename VARCHAR(255),
  s3_key TEXT,
  s3_url TEXT,
  duration INTEGER,
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  tags TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'uploaded',
  thumbnail_url TEXT,
  views_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE videos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS s3_key TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS s3_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS visibility VARCHAR(20);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS views_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'videos'
      AND column_name = 'creator_id'
  ) THEN
    EXECUTE 'UPDATE videos SET user_id = creator_id WHERE user_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'videos'
      AND column_name = 'is_public'
  ) THEN
    EXECUTE 'UPDATE videos SET visibility = CASE WHEN is_public THEN ''public'' ELSE ''private'' END WHERE visibility IS NULL';
  END IF;
END;
$$;

UPDATE videos SET visibility = 'private' WHERE visibility IS NULL;
UPDATE videos SET status = 'uploaded' WHERE status IS NULL;
ALTER TABLE videos ALTER COLUMN visibility SET DEFAULT 'private';
ALTER TABLE videos ALTER COLUMN visibility SET NOT NULL;
ALTER TABLE videos ALTER COLUMN status SET DEFAULT 'uploaded';
ALTER TABLE videos ALTER COLUMN status SET NOT NULL;
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos ADD CONSTRAINT videos_status_check
  CHECK (status IN ('uploaded', 'processing', 'ready', 'failed'));
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_visibility_check;
ALTER TABLE videos ADD CONSTRAINT videos_visibility_check
  CHECK (visibility IN ('public', 'private', 'unlisted'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'videos'::regclass
      AND conname = 'videos_user_id_fkey'
  ) THEN
    ALTER TABLE videos ADD CONSTRAINT videos_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS video_transcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  resolution VARCHAR(10) NOT NULL,
  bitrate INTEGER NOT NULL,
  codec VARCHAR(20) NOT NULL DEFAULT 'h264',
  hls_playlist_path TEXT,
  segment_duration INTEGER NOT NULL DEFAULT 10,
  total_segments INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT video_transcodes_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS thumbnails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  thumbnail_path TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transcoding_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  job_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  worker_id VARCHAR(50),
  priority INTEGER NOT NULL DEFAULT 5,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  job_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transcoding_jobs_type_check
    CHECK (job_type IN ('transcode', 'thumbnail', 'preview')),
  CONSTRAINT transcoding_jobs_status_check
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT transcoding_jobs_progress_check
    CHECK (progress_percentage BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(20) NOT NULL,
  timestamp_seconds INTEGER,
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  quality_level VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT video_analytics_event_type_check
    CHECK (event_type IN ('view', 'play', 'pause', 'seek', 'complete'))
);

CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT video_likes_user_video_unique UNIQUE (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT playlist_items_playlist_video_unique UNIQUE (playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_transcodes_video_id ON video_transcodes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_transcodes_status ON video_transcodes(status);
CREATE INDEX IF NOT EXISTS idx_transcoding_jobs_status ON transcoding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcoding_jobs_video_id ON transcoding_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_video_id ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_user_event ON video_analytics(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_video_analytics_created_at ON video_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_video_id ON playlist_items(video_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_video_transcodes_updated_at ON video_transcodes;
CREATE TRIGGER update_video_transcodes_updated_at BEFORE UPDATE ON video_transcodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_transcoding_jobs_updated_at ON transcoding_jobs;
CREATE TRIGGER update_transcoding_jobs_updated_at BEFORE UPDATE ON transcoding_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_video_comments_updated_at ON video_comments;
CREATE TRIGGER update_video_comments_updated_at BEFORE UPDATE ON video_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Let the migration runner skip this version when Docker initialized a fresh DB.
INSERT INTO schema_migrations (version)
VALUES ('001_core_schema')
ON CONFLICT (version) DO NOTHING;
