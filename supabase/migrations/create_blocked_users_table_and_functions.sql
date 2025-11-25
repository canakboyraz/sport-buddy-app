-- Drop existing functions first
DROP FUNCTION IF EXISTS block_user CASCADE;
DROP FUNCTION IF EXISTS unblock_user CASCADE;
DROP FUNCTION IF EXISTS get_blocked_users CASCADE;
DROP FUNCTION IF EXISTS is_user_blocked CASCADE;

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can't block the same person twice
  UNIQUE(blocker_id, blocked_id),

  -- Ensure a user can't block themselves
  CHECK (blocker_id != blocked_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own blocked list
CREATE POLICY "Users can view their blocks"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Users can block other users
CREATE POLICY "Users can block others"
  ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock users they blocked
CREATE POLICY "Users can unblock"
  ON blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Function to block a user
CREATE OR REPLACE FUNCTION block_user(
  p_blocker_id UUID,
  p_blocked_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check if already blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  ) THEN
    RAISE EXCEPTION 'User is already blocked';
  END IF;

  -- Insert the block
  INSERT INTO blocked_users (blocker_id, blocked_id, reason)
  VALUES (p_blocker_id, p_blocked_id, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(
  p_blocker_id UUID,
  p_blocked_id UUID
)
RETURNS void AS $$
BEGIN
  DELETE FROM blocked_users
  WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Block not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get blocked users list
CREATE OR REPLACE FUNCTION get_blocked_users(p_user_id UUID)
RETURNS TABLE(
  block_id BIGINT,
  blocked_user_id UUID,
  blocked_user_name TEXT,
  blocked_user_avatar TEXT,
  reason TEXT,
  blocked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bu.id as block_id,
    p.id as blocked_user_id,
    COALESCE(p.full_name, p.email) as blocked_user_name,
    p.avatar_url as blocked_user_avatar,
    bu.reason,
    bu.created_at as blocked_at
  FROM blocked_users bu
  JOIN profiles p ON bu.blocked_id = p.id
  WHERE bu.blocker_id = p_user_id
  ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
  p_blocker_id UUID,
  p_blocked_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE blocked_users IS 'Stores blocked users relationships';
COMMENT ON FUNCTION block_user IS 'Block a user';
COMMENT ON FUNCTION unblock_user IS 'Unblock a user';
COMMENT ON FUNCTION get_blocked_users IS 'Get list of blocked users for a user';
COMMENT ON FUNCTION is_user_blocked IS 'Check if a user is blocked by another user';
