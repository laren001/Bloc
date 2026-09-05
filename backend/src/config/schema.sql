-- Bloc v1 schema
-- Run this in the Supabase SQL editor after creating your project.
-- Supabase's built-in auth.users table handles login/signup — these tables extend it.

-- Profiles (extends auth.users with app-specific fields)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Follows
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Posts (photos only in v1)
create table posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  image_url text not null,
  caption text,
  location text,
  created_at timestamptz default now()
);

-- Likes
create table likes (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- Comments
create table comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- Stories (24hr expiry, photo only, with location/event tagging)
create table stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  image_url text not null,
  location text,
  event_tag text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- Direct messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  recipient_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index idx_posts_user on posts(user_id);
create index idx_posts_created on posts(created_at desc);
create index idx_stories_expires on stories(expires_at);
create index idx_stories_user on stories(user_id);
create index idx_messages_conversation on messages(sender_id, recipient_id);

-- Row Level Security (RLS) — enable and add basic policies
alter table profiles enable row level security;
alter table posts enable row level security;
alter table stories enable row level security;
alter table messages enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;

-- Everyone can read profiles and posts (public app)
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Public posts are viewable by everyone" on posts for select using (true);
create policy "Public stories are viewable by everyone" on stories for select using (true);
create policy "Public likes are viewable by everyone" on likes for select using (true);
create policy "Public comments are viewable by everyone" on comments for select using (true);
create policy "Public follows are viewable by everyone" on follows for select using (true);

-- Only the owner can insert/update/delete their own content
create policy "Users can insert their own posts" on posts for insert with check (auth.uid() = user_id);
create policy "Users can delete their own posts" on posts for delete using (auth.uid() = user_id);
create policy "Users can insert their own stories" on stories for insert with check (auth.uid() = user_id);
create policy "Users can insert their own comments" on comments for insert with check (auth.uid() = user_id);
create policy "Users can manage their own likes" on likes for insert with check (auth.uid() = user_id);
create policy "Users can remove their own likes" on likes for delete using (auth.uid() = user_id);
create policy "Users can manage their own follows" on follows for insert with check (auth.uid() = follower_id);
create policy "Users can remove their own follows" on follows for delete using (auth.uid() = follower_id);

-- Messages: only sender or recipient can read/write
create policy "Users can view their own messages" on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send messages" on messages for insert with check (auth.uid() = sender_id);
