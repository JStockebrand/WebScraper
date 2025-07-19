-- Complete Supabase setup for WebScrape Summarizer
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Supabase auth user UUID
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  subscription_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'pro', 'premium'
  searches_used INTEGER DEFAULT 0,
  searches_limit INTEGER DEFAULT 10, -- per month
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create searches table
CREATE TABLE IF NOT EXISTS searches (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL, -- 'searching', 'completed', 'error'
  total_results INTEGER DEFAULT 0,
  search_time INTEGER, -- in milliseconds
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create search_results table
CREATE TABLE IF NOT EXISTS search_results (
  id SERIAL PRIMARY KEY,
  search_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  published_date TEXT,
  reading_time TEXT,
  scraping_status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  summary TEXT,
  confidence INTEGER, -- 0-100
  sources_count INTEGER DEFAULT 0,
  keywords TEXT, -- JSON array of keywords
  metadata TEXT, -- JSON object with topic, category, entities
  error_message TEXT,
  FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_confidence ON search_results(confidence);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

-- Users can only access their own records
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::TEXT = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::TEXT = id);

-- Users can only access their own searches
CREATE POLICY "Users can view their own searches" ON searches
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert their own searches" ON searches
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update their own searches" ON searches
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

-- Users can only access search results for their own searches
CREATE POLICY "Users can view their search results" ON search_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM searches 
      WHERE searches.id = search_results.search_id 
      AND searches.user_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Service can insert search results" ON search_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches 
      WHERE searches.id = search_results.search_id 
      AND searches.user_id = auth.uid()::TEXT
    )
  );

-- Function to automatically create user profile when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user's updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on users table
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;