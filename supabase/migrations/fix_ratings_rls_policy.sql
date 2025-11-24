-- Fix Row Level Security policies for ratings table
-- This allows authenticated users to insert and view ratings

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert ratings" ON ratings;
DROP POLICY IF EXISTS "Users can view all ratings" ON ratings;
DROP POLICY IF EXISTS "Users can view ratings" ON ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON ratings;

-- Enable RLS on ratings table
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert ratings (as rater)
CREATE POLICY "Users can insert ratings"
  ON ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rater_user_id);

-- Policy 2: Users can view all ratings (needed for displaying ratings on profiles)
CREATE POLICY "Users can view all ratings"
  ON ratings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Users can update their own ratings (as rater) within 24 hours
CREATE POLICY "Users can update their own ratings"
  ON ratings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = rater_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
  )
  WITH CHECK (auth.uid() = rater_user_id);

-- Policy 4: Users can delete their own ratings (as rater) within 24 hours
CREATE POLICY "Users can delete their own ratings"
  ON ratings
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = rater_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'ratings';
