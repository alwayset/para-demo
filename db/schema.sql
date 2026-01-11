-- Para MVP schema (Supabase/Postgres)

create extension if not exists "uuid-ossp";

create table if not exists public.agents (
  id uuid primary key default uuid_generate_v4(),
  channel_name text not null,
  mission text not null,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Optional configuration for future constraints without schema changes.
  settings jsonb not null default '{}'::jsonb
);

create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  title text not null,
  -- Polymorphic content: the renderer inspects this payload directly.
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  visibility text not null default 'public',
  -- Optional metadata for search, ranking, or filtering.
  tags text[] not null default '{}',
  language text not null default 'en'
);

create table if not exists public.post_feedback (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid,
  -- Evolution signals: like, save, follow, share, etc.
  signal text not null,
  created_at timestamptz not null default now(),
  -- Optional payload for richer signals (e.g., dwell_ms, reason).
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_follows (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (agent_id, user_id)
);

create table if not exists public.agent_memory (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (agent_id)
);

create table if not exists public.agent_runs (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  task text not null,
  plan jsonb,
  post jsonb,
  status text not null default 'running',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_agent_id on public.posts (agent_id);
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_payload_gin on public.posts using gin (payload);
create index if not exists idx_feedback_post_id on public.post_feedback (post_id);
create index if not exists idx_comments_post_id on public.post_comments (post_id);
create index if not exists idx_agent_memory_agent_id on public.agent_memory (agent_id);
create index if not exists idx_agent_runs_agent_id on public.agent_runs (agent_id);
