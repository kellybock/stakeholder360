CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS test;

-- LinkedIn profiles table (public schema)
CREATE TABLE IF NOT EXISTS linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE,
  linkedin_url VARCHAR(500) NOT NULL DEFAULT '',
  headline VARCHAR(500),
  summary TEXT,
  location VARCHAR(255),
  education JSONB,
  experiences JSONB,
  posts JSONB,
  skills JSONB,
  raw_response JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LinkedIn profiles table (test schema)
CREATE TABLE IF NOT EXISTS test.linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE,
  linkedin_url VARCHAR(500) NOT NULL DEFAULT '',
  headline VARCHAR(500),
  summary TEXT,
  location VARCHAR(255),
  education JSONB,
  experiences JSONB,
  posts JSONB,
  skills JSONB,
  raw_response JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
