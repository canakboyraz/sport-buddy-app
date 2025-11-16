-- Enhance chat_messages table for advanced chat features
-- Add support for image messages, read receipts, and typing indicators

-- Add columns for image support and read status
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index on is_read for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(session_id, is_read);

-- Create a table for typing indicators (ephemeral data)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES sport_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create index on typing_indicators for realtime queries
CREATE INDEX IF NOT EXISTS idx_typing_indicators_session ON typing_indicators(session_id);

-- Enable Row Level Security on typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only insert/update their own typing status
CREATE POLICY typing_indicators_insert_policy ON typing_indicators
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY typing_indicators_update_policy ON typing_indicators
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can view typing indicators for sessions they're part of
CREATE POLICY typing_indicators_select_policy ON typing_indicators
  FOR SELECT
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

-- RLS Policy: Users can delete their own typing indicators
CREATE POLICY typing_indicators_delete_policy ON typing_indicators
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-delete old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN chat_messages.image_url IS 'URL of the image if message contains an image';
COMMENT ON COLUMN chat_messages.is_read IS 'Whether the message has been read';
COMMENT ON COLUMN chat_messages.read_at IS 'Timestamp when the message was read';
COMMENT ON TABLE typing_indicators IS 'Stores real-time typing status for chat participants';
