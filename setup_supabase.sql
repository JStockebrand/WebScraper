-- Create tables for WebScrape Summarizer in Supabase

-- Create searches table
CREATE TABLE IF NOT EXISTS searches (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  status TEXT NOT NULL,
  total_results INTEGER DEFAULT 0,
  search_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
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
  scraping_status TEXT NOT NULL,
  summary TEXT,
  confidence INTEGER,
  sources_count INTEGER DEFAULT 0,
  keywords TEXT,
  metadata TEXT,
  error_message TEXT,
  FOREIGN KEY (search_id) REFERENCES searches(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_searches_status ON searches(status);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_confidence ON search_results(confidence);