-- Create friendships table for managing friend requests and friendships
CREATE TABLE IF NOT EXISTS friendships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can't send multiple requests to the same person
  UNIQUE(user_id, friend_id),

  -- Ensure a user can't be friends with themselves
  CHECK (user_id != friend_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend ON friendships(user_id, friend_id);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own friendships (sent and received)
CREATE POLICY "Users can view their friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Users can accept/reject friend requests sent to them
CREATE POLICY "Users can respond to friend requests"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

-- Users can delete their own friendship requests or accepted friendships
CREATE POLICY "Users can delete friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Drop existing function if it exists with different return type
DROP FUNCTION IF EXISTS get_friendship_status(UUID, UUID);

-- Create a function to check friendship status
CREATE OR REPLACE FUNCTION get_friendship_status(current_user_id UUID, other_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  friendship_status TEXT;
BEGIN
  -- Check if there's a friendship in either direction
  SELECT status INTO friendship_status
  FROM friendships
  WHERE
    (user_id = current_user_id AND friend_id = other_user_id)
    OR (user_id = other_user_id AND friend_id = current_user_id)
  LIMIT 1;

  RETURN COALESCE(friendship_status, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_friendships_updated_at ON friendships;
CREATE TRIGGER trigger_update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

COMMENT ON TABLE friendships IS 'Stores friend requests and friendships between users';
COMMENT ON COLUMN friendships.status IS 'Status: pending (request sent), accepted (friends), rejected (request declined)';
