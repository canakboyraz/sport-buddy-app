-- =====================================================
-- COMPLETE USER BLOCKS & REPORTING SYSTEM SETUP
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop existing functions and policies to avoid conflicts
DROP FUNCTION IF EXISTS is_user_blocked(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS are_users_blocking(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS block_user(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS unblock_user(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_blocked_users(uuid) CASCADE;
DROP FUNCTION IF EXISTS report_user(uuid, uuid, varchar, text) CASCADE;

DROP POLICY IF EXISTS user_blocks_select_policy ON user_blocks;
DROP POLICY IF EXISTS user_blocks_insert_policy ON user_blocks;
DROP POLICY IF EXISTS user_blocks_delete_policy ON user_blocks;
DROP POLICY IF EXISTS user_reports_select_policy ON user_reports;
DROP POLICY IF EXISTS user_reports_insert_policy ON user_reports;

-- Step 2: Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_created ON user_blocks(created_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies for user_blocks
CREATE POLICY user_blocks_select_policy ON user_blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY user_blocks_insert_policy ON user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY user_blocks_delete_policy ON user_blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- Step 5: Create user_reports table (if not exists)
CREATE TABLE IF NOT EXISTS user_reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  CHECK (reporter_id != reported_user_id)
);

-- Create indexes for user_reports
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at DESC);

-- Enable RLS for user_reports
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for user_reports
CREATE POLICY user_reports_select_policy ON user_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY user_reports_insert_policy ON user_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Step 6: Create all functions

-- Function: Check if a user is blocked
CREATE FUNCTION is_user_blocked(checker_id UUID, target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = checker_id AND blocked_id = target_id
  );
END;
$$;

-- Function: Check if users have blocked each other (bidirectional)
CREATE FUNCTION are_users_blocking(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$;

-- Function: Block a user
CREATE FUNCTION block_user(p_blocker_id UUID, p_blocked_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_block_id BIGINT;
BEGIN
  -- Validation: Cannot block yourself
  IF p_blocker_id = p_blocked_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Check if already blocked
  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  ) THEN
    RAISE EXCEPTION 'User already blocked';
  END IF;

  -- Create block record
  INSERT INTO user_blocks (blocker_id, blocked_id, reason)
  VALUES (p_blocker_id, p_blocked_id, p_reason)
  RETURNING id INTO v_block_id;

  -- Remove friendship if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friendships') THEN
    DELETE FROM friendships
    WHERE (user_id = p_blocker_id AND friend_id = p_blocked_id)
       OR (user_id = p_blocked_id AND friend_id = p_blocker_id);
  END IF;

  -- Remove blocked user from blocker's sessions
  UPDATE session_participants SET status = 'rejected'
  WHERE user_id = p_blocked_id
  AND session_id IN (SELECT id FROM sport_sessions WHERE creator_id = p_blocker_id);

  RETURN v_block_id;
END;
$$;

-- Function: Unblock a user
CREATE FUNCTION unblock_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_blocks
  WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;

  RETURN FOUND;
END;
$$;

-- Function: Get blocked users list
CREATE FUNCTION get_blocked_users(p_user_id UUID)
RETURNS TABLE (
  block_id BIGINT,
  blocked_user_id UUID,
  blocked_user_name VARCHAR(100),
  blocked_user_avatar TEXT,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bu.id,
    p.id,
    p.full_name,
    p.avatar_url,
    bu.reason,
    bu.created_at
  FROM user_blocks bu
  JOIN profiles p ON p.id = bu.blocked_id
  WHERE bu.blocker_id = p_user_id
  ORDER BY bu.created_at DESC;
END;
$$;

-- Function: Report a user
CREATE FUNCTION report_user(
  p_reporter_id UUID,
  p_reported_user_id UUID,
  p_report_type VARCHAR(50),
  p_description TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id BIGINT;
BEGIN
  -- Validation: Cannot report yourself
  IF p_reporter_id = p_reported_user_id THEN
    RAISE EXCEPTION 'Cannot report yourself';
  END IF;

  -- Check for duplicate recent reports (within 24 hours)
  IF EXISTS (
    SELECT 1 FROM user_reports
    WHERE reporter_id = p_reporter_id
    AND reported_user_id = p_reported_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'You have already reported this user recently';
  END IF;

  -- Create report
  INSERT INTO user_reports (reporter_id, reported_user_id, report_type, description)
  VALUES (p_reporter_id, p_reported_user_id, p_report_type, p_description)
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- Step 7: Add helpful comments
COMMENT ON TABLE user_blocks IS 'User blocking relationships for safety features';
COMMENT ON TABLE user_reports IS 'User reports for inappropriate behavior and content moderation';
COMMENT ON FUNCTION is_user_blocked IS 'Check if a specific user is blocked by another user';
COMMENT ON FUNCTION are_users_blocking IS 'Check if users have any block relationship (bidirectional)';
COMMENT ON FUNCTION block_user IS 'Block a user, remove friendship, and update session participants';
COMMENT ON FUNCTION unblock_user IS 'Remove block relationship between users';
COMMENT ON FUNCTION get_blocked_users IS 'Get list of users blocked by the current user';
COMMENT ON FUNCTION report_user IS 'Report a user for inappropriate behavior';

-- Step 8: Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON user_blocks TO authenticated;
GRANT SELECT, INSERT ON user_reports TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User blocks and reporting system setup completed successfully!';
  RAISE NOTICE '📊 Tables created: user_blocks, user_reports';
  RAISE NOTICE '⚡ Functions created: block_user, unblock_user, report_user, is_user_blocked, are_users_blocking, get_blocked_users';
  RAISE NOTICE '🔒 RLS policies enabled for data security';
END $$;
