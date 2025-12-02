-- Create user_blocks table (renamed from blocked_users for consistency)
CREATE TABLE IF NOT EXISTS user_blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_blocks
-- Users can see their own blocks
CREATE POLICY user_blocks_select_policy ON user_blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Users can block other users
CREATE POLICY user_blocks_insert_policy ON user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock users they blocked
CREATE POLICY user_blocks_delete_policy ON user_blocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(checker_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = checker_id AND blocked_id = target_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users have blocked each other (bidirectional)
CREATE OR REPLACE FUNCTION are_users_blocking(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE
      (blocker_id = user_a AND blocked_id = user_b)
      OR
      (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update block_user function to use user_blocks table
CREATE OR REPLACE FUNCTION block_user(p_blocker_id UUID, p_blocked_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BIGINT AS $$
DECLARE
  v_block_id BIGINT;
BEGIN
  -- Check if users are the same
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

  -- Create block
  INSERT INTO user_blocks (blocker_id, blocked_id, reason)
  VALUES (p_blocker_id, p_blocked_id, p_reason)
  RETURNING id INTO v_block_id;

  -- Remove friendship if exists
  DELETE FROM friendships
  WHERE
    (user_id = p_blocker_id AND friend_id = p_blocked_id)
    OR
    (user_id = p_blocked_id AND friend_id = p_blocker_id);

  -- Remove from session participants if blocked user is in blocker's sessions
  UPDATE session_participants
  SET status = 'rejected'
  WHERE user_id = p_blocked_id
  AND session_id IN (
    SELECT id FROM sport_sessions WHERE creator_id = p_blocker_id
  );

  RETURN v_block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update unblock_user function to use user_blocks table
CREATE OR REPLACE FUNCTION unblock_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM user_blocks
  WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get blocked users for a user
CREATE OR REPLACE FUNCTION get_blocked_users(p_user_id UUID)
RETURNS TABLE (
  block_id BIGINT,
  blocked_user_id UUID,
  blocked_user_name VARCHAR(100),
  blocked_user_avatar TEXT,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bu.id as block_id,
    p.id as blocked_user_id,
    p.full_name as blocked_user_name,
    p.avatar_url as blocked_user_avatar,
    bu.reason,
    bu.created_at as blocked_at
  FROM user_blocks bu
  JOIN profiles p ON p.id = bu.blocked_id
  WHERE bu.blocker_id = p_user_id
  ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE user_blocks IS 'User blocking relationships';
COMMENT ON FUNCTION is_user_blocked IS 'Check if a user is blocked by another user';
COMMENT ON FUNCTION are_users_blocking IS 'Check if users have blocked each other';
COMMENT ON FUNCTION block_user IS 'Block a user and remove friendship';
COMMENT ON FUNCTION unblock_user IS 'Unblock a user';
COMMENT ON FUNCTION get_blocked_users IS 'Get list of blocked users for a user';
