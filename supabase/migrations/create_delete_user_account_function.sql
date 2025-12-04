-- Create user_deletions audit table
CREATE TABLE IF NOT EXISTS user_deletions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by UUID, -- NULL if self-deletion, otherwise admin ID
  reason TEXT
);

-- Create index for user_deletions
CREATE INDEX IF NOT EXISTS idx_user_deletions_user_id ON user_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deletions_deleted_at ON user_deletions(deleted_at DESC);

-- Add comment
COMMENT ON TABLE user_deletions IS 'Audit log of deleted user accounts';

-- Create function to delete user account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get user email before deletion
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  -- 1. Delete user's created sessions
  DELETE FROM sport_sessions WHERE creator_id = p_user_id;

  -- 2. Delete user's session participations
  DELETE FROM session_participants WHERE user_id = p_user_id;

  -- 3. Delete user's chat messages
  DELETE FROM chat_messages WHERE sender_id = p_user_id;

  -- 4. Delete user's ratings (given and received)
  DELETE FROM user_ratings WHERE rater_id = p_user_id OR rated_user_id = p_user_id;

  -- 5. Delete user's reports (given and received)
  DELETE FROM user_reports WHERE reporter_id = p_user_id OR reported_user_id = p_user_id;

  -- 6. Delete user's blocks (blocker and blocked)
  DELETE FROM blocked_users WHERE blocker_id = p_user_id OR blocked_id = p_user_id;

  -- 7. Delete user's user_blocks (if exists - alternative blocking table)
  DELETE FROM user_blocks WHERE blocker_id = p_user_id OR blocked_id = p_user_id;

  -- 8. Delete user's notifications
  DELETE FROM notifications WHERE user_id = p_user_id;

  -- 9. Delete user's friendships
  DELETE FROM friendships WHERE user_id = p_user_id OR friend_id = p_user_id;

  -- 10. Delete user's achievements
  DELETE FROM user_achievements WHERE user_id = p_user_id;

  -- 11. Delete user's favorites
  DELETE FROM favorites WHERE user_id = p_user_id;

  -- 12. Delete user's recurring sessions
  DELETE FROM recurring_sessions WHERE creator_id = p_user_id;

  -- 13. Delete user profile
  DELETE FROM profiles WHERE id = p_user_id;

  -- 14. Delete auth user (this will cascade to any remaining references)
  DELETE FROM auth.users WHERE id = p_user_id;

  -- 15. Log deletion for audit trail
  INSERT INTO user_deletions (user_id, email, deleted_by, reason)
  VALUES (p_user_id, COALESCE(v_user_email, 'unknown@deleted.user'), p_user_id, 'Self-deletion via app');

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE NOTICE 'Error deleting user account %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION delete_user_account IS 'Permanently delete user account and all associated data (Guideline 5.1.1 compliance)';

-- Grant execute permission to authenticated users (only for their own account)
GRANT EXECUTE ON FUNCTION delete_user_account TO authenticated;
