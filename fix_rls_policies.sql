-- Fix RLS (Row Level Security) policies for WebScrape Summarizer
-- This script addresses the security warnings in Supabase Security Advisor

-- Enable RLS on all user tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;

DROP POLICY IF EXISTS "Users can view own searches" ON public.searches;
DROP POLICY IF EXISTS "Users can insert own searches" ON public.searches;
DROP POLICY IF EXISTS "Users can update own searches" ON public.searches;
DROP POLICY IF EXISTS "Users can delete own searches" ON public.searches;
DROP POLICY IF EXISTS "Service role can manage all searches" ON public.searches;

DROP POLICY IF EXISTS "Users can view own search results" ON public.search_results;
DROP POLICY IF EXISTS "Users can insert own search results" ON public.search_results;
DROP POLICY IF EXISTS "Users can update own search results" ON public.search_results;
DROP POLICY IF EXISTS "Users can delete own search results" ON public.search_results;
DROP POLICY IF EXISTS "Service role can manage all search results" ON public.search_results;

-- USERS TABLE POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT 
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Service role (backend) can manage all users
CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- SEARCHES TABLE POLICIES
-- Users can view their own searches
CREATE POLICY "Users can view own searches" ON public.searches
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can create new searches
CREATE POLICY "Users can insert own searches" ON public.searches
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own searches (for status updates)
CREATE POLICY "Users can update own searches" ON public.searches
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own searches
CREATE POLICY "Users can delete own searches" ON public.searches
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Service role can manage all searches
CREATE POLICY "Service role can manage all searches" ON public.searches
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- SEARCH RESULTS TABLE POLICIES
-- Users can view results from their own searches
CREATE POLICY "Users can view own search results" ON public.search_results
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.searches 
            WHERE searches.id = search_results.search_id 
            AND searches.user_id = auth.uid()
        )
    );

-- Users can insert results for their own searches (via backend)
CREATE POLICY "Users can insert own search results" ON public.search_results
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.searches 
            WHERE searches.id = search_results.search_id 
            AND searches.user_id = auth.uid()
        )
    );

-- Users can update results from their own searches
CREATE POLICY "Users can update own search results" ON public.search_results
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.searches 
            WHERE searches.id = search_results.search_id 
            AND searches.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.searches 
            WHERE searches.id = search_results.search_id 
            AND searches.user_id = auth.uid()
        )
    );

-- Users can delete results from their own searches
CREATE POLICY "Users can delete own search results" ON public.search_results
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.searches 
            WHERE searches.id = search_results.search_id 
            AND searches.user_id = auth.uid()
        )
    );

-- Service role can manage all search results
CREATE POLICY "Service role can manage all search results" ON public.search_results
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Users table permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon;

-- Searches table permissions  
GRANT SELECT, INSERT, UPDATE, DELETE ON public.searches TO authenticated;

-- Search results table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_results TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Display confirmation
SELECT 'RLS policies have been successfully configured for all tables' as status;