-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships
-- Users can see their own friend requests (sent or received)
CREATE POLICY friendships_select_policy ON friendships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can send friend requests
CREATE POLICY friendships_insert_policy ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can accept/reject requests sent to them or cancel their own requests
CREATE POLICY friendships_update_policy ON friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete friendships they are part of
CREATE POLICY friendships_delete_policy ON friendships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friendship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendship_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendship_updated_at();

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (user_id = user_a AND friend_id = user_b)
      OR
      (user_id = user_b AND friend_id = user_a)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friendship status between two users
CREATE OR REPLACE FUNCTION get_friendship_status(user_a UUID, user_b UUID)
RETURNS TABLE (
  status VARCHAR(20),
  is_requester BOOLEAN,
  friendship_id BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.status,
    f.user_id = user_a as is_requester,
    f.id as friendship_id
  FROM friendships f
  WHERE
    (f.user_id = user_a AND f.friend_id = user_b)
    OR
    (f.user_id = user_b AND f.friend_id = user_a)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(requester_id UUID, target_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_friendship_id BIGINT;
  v_existing_status VARCHAR(20);
BEGIN
  -- Check if users are the same
  IF requester_id = target_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;

  -- Check if friendship already exists
  SELECT status INTO v_existing_status
  FROM friendships
  WHERE
    (user_id = requester_id AND friend_id = target_id)
    OR
    (user_id = target_id AND friend_id = requester_id);

  IF v_existing_status IS NOT NULL THEN
    IF v_existing_status = 'accepted' THEN
      RAISE EXCEPTION 'Already friends';
    ELSIF v_existing_status = 'pending' THEN
      RAISE EXCEPTION 'Friend request already pending';
    ELSIF v_existing_status = 'rejected' THEN
      -- Allow resending after rejection
      UPDATE friendships
      SET status = 'pending', updated_at = NOW()
      WHERE
        (user_id = requester_id AND friend_id = target_id)
        OR
        (user_id = target_id AND friend_id = requester_id)
      RETURNING id INTO v_friendship_id;
      RETURN v_friendship_id;
    END IF;
  END IF;

  -- Create new friend request
  INSERT INTO friendships (user_id, friend_id, status)
  VALUES (requester_id, target_id, 'pending')
  RETURNING id INTO v_friendship_id;

  RETURN v_friendship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(friendship_id BIGINT, accepter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_friend_id UUID;
BEGIN
  -- Verify the accepter is the target of the request
  SELECT friend_id INTO v_friend_id
  FROM friendships
  WHERE id = friendship_id AND friend_id = accepter_id AND status = 'pending';

  IF v_friend_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Accept the request
  UPDATE friendships
  SET status = 'accepted', updated_at = NOW()
  WHERE id = friendship_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject friend request
CREATE OR REPLACE FUNCTION reject_friend_request(friendship_id BIGINT, rejecter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_friend_id UUID;
BEGIN
  -- Verify the rejecter is the target of the request
  SELECT friend_id INTO v_friend_id
  FROM friendships
  WHERE id = friendship_id AND friend_id = rejecter_id AND status = 'pending';

  IF v_friend_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Reject the request
  UPDATE friendships
  SET status = 'rejected', updated_at = NOW()
  WHERE id = friendship_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove friend
CREATE OR REPLACE FUNCTION remove_friend(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM friendships
  WHERE
    status = 'accepted'
    AND (
      (user_id = user_a AND friend_id = user_b)
      OR
      (user_id = user_b AND friend_id = user_a)
    );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add friendship achievement
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points, color)
VALUES
  ('Sosyalleşen', '5 arkadaş edin', 'account-multiple-plus', 'social', 'friend_count', 5, 30, '#00BCD4')
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE friendships IS 'Friendship relationships between users';
COMMENT ON FUNCTION are_friends IS 'Check if two users are friends';
COMMENT ON FUNCTION get_friendship_status IS 'Get friendship status between two users';
COMMENT ON FUNCTION send_friend_request IS 'Send a friend request';
COMMENT ON FUNCTION accept_friend_request IS 'Accept a friend request';
COMMENT ON FUNCTION reject_friend_request IS 'Reject a friend request';
COMMENT ON FUNCTION remove_friend IS 'Remove a friend';
