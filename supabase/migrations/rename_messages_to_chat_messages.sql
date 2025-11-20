-- Rename messages table to chat_messages for consistency
-- This migration renames the existing messages table to chat_messages

-- Rename the table
ALTER TABLE IF EXISTS messages RENAME TO chat_messages;

-- Rename the index
ALTER INDEX IF EXISTS idx_messages_session RENAME TO idx_chat_messages_session;

-- Update RLS policies (drop old ones and create new ones with correct table name)
DROP POLICY IF EXISTS "Anyone can view messages for their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Session participants can send messages" ON chat_messages;

-- Recreate RLS policies with new table name
CREATE POLICY "Anyone can view messages for their sessions"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT session_id FROM session_participants
      WHERE user_id = auth.uid() AND status = 'approved'
    )
    OR
    session_id IN (
      SELECT id FROM sport_sessions
      WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Session participants can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT session_id FROM session_participants
      WHERE user_id = auth.uid() AND status = 'approved'
    )
    OR
    session_id IN (
      SELECT id FROM sport_sessions
      WHERE creator_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE chat_messages IS 'Chat messages for sport sessions';
