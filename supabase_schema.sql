-- Supabase Database Schema

-- Chats Table
CREATE TABLE public.chats (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    messages JSONB DEFAULT '[]'::jsonb
);

-- User Preferences Table
CREATE TABLE public.user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'light',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Ensure you set up appropriate Row Level Security (RLS) policies 
-- in your Supabase dashboard depending on your authentication requirements.
-- For absolute beginners, you might temporarily disable RLS, but it's 
-- recommended to tie 'id' to user auth for production apps.
