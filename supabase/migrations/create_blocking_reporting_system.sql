-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Create user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'harassment', 'spam', 'inappropriate', 'fake_profile', 'other'
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  CHECK (reporter_id != reported_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at DESC);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users
-- Users can see their own blocks
CREATE POLICY blocked_users_select_policy ON blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Users can block other users
CREATE POLICY blocked_users_insert_policy ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock users they blocked
CREATE POLICY blocked_users_delete_policy ON blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- RLS Policies for user_reports
-- Users can see their own reports
CREATE POLICY user_reports_select_policy ON user_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY user_reports_insert_policy ON user_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(checker_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = checker_id AND blocked_id = target_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users have blocked each other (bidirectional)
CREATE OR REPLACE FUNCTION are_users_blocking(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE
      (blocker_id = user_a AND blocked_id = user_b)
      OR
      (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block a user
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
    SELECT 1 FROM blocked_users
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  ) THEN
    RAISE EXCEPTION 'User already blocked';
  END IF;

  -- Create block
  INSERT INTO blocked_users (blocker_id, blocked_id, reason)
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

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM blocked_users
  WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to report a user
CREATE OR REPLACE FUNCTION report_user(
  p_reporter_id UUID,
  p_reported_user_id UUID,
  p_report_type VARCHAR(50),
  p_description TEXT
)
RETURNS BIGINT AS $$
DECLARE
  v_report_id BIGINT;
BEGIN
  -- Check if users are the same
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
    p.name as blocked_user_name,
    p.avatar_url as blocked_user_avatar,
    bu.reason,
    bu.created_at as blocked_at
  FROM blocked_users bu
  JOIN profiles p ON p.id = bu.blocked_id
  WHERE bu.blocker_id = p_user_id
  ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update report status (admin only - will be used in future admin panel)
CREATE OR REPLACE FUNCTION update_report_status(
  p_report_id BIGINT,
  p_status VARCHAR(20),
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_reports
  SET
    status = p_status,
    reviewed_at = NOW(),
    reviewed_by = p_admin_id,
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_report_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_reports_updated_at
  BEFORE UPDATE ON user_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reports_updated_at();

-- Add comments
COMMENT ON TABLE blocked_users IS 'User blocking relationships';
COMMENT ON TABLE user_reports IS 'User reports for inappropriate behavior';
COMMENT ON FUNCTION is_user_blocked IS 'Check if a user is blocked by another user';
COMMENT ON FUNCTION are_users_blocking IS 'Check if users have blocked each other';
COMMENT ON FUNCTION block_user IS 'Block a user and remove friendship';
COMMENT ON FUNCTION unblock_user IS 'Unblock a user';
COMMENT ON FUNCTION report_user IS 'Report a user for inappropriate behavior';
COMMENT ON FUNCTION get_blocked_users IS 'Get list of blocked users for a user';
COMMENT ON FUNCTION update_report_status IS 'Update report status (admin function)';
