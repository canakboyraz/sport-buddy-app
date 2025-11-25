-- Create RPC functions for friendship operations

-- Drop existing functions first (with CASCADE to remove all overloaded versions)
DROP FUNCTION IF EXISTS send_friend_request CASCADE;
DROP FUNCTION IF EXISTS accept_friend_request CASCADE;
DROP FUNCTION IF EXISTS reject_friend_request CASCADE;
DROP FUNCTION IF EXISTS remove_friend CASCADE;
DROP FUNCTION IF EXISTS get_friendship_status CASCADE;

-- Function to send a friend request
CREATE OR REPLACE FUNCTION send_friend_request(requester_id UUID, target_id UUID)
RETURNS void AS $$
BEGIN
  -- Check if a friendship already exists in either direction
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id = requester_id AND friend_id = target_id)
       OR (user_id = target_id AND friend_id = requester_id)
  ) THEN
    RAISE EXCEPTION 'Friendship or request already exists';
  END IF;

  -- Insert the friend request
  INSERT INTO friendships (user_id, friend_id, status)
  VALUES (requester_id, target_id, 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept a friend request
CREATE OR REPLACE FUNCTION accept_friend_request(friendship_id BIGINT, accepter_id UUID)
RETURNS void AS $$
BEGIN
  -- Update the friendship status to accepted
  -- Only the target (friend_id) can accept the request
  UPDATE friendships
  SET status = 'accepted', updated_at = NOW()
  WHERE id = friendship_id
    AND friend_id = accepter_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or cannot be accepted';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a friend request
CREATE OR REPLACE FUNCTION reject_friend_request(friendship_id BIGINT, rejecter_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete the friendship request
  -- Only the target (friend_id) can reject the request
  DELETE FROM friendships
  WHERE id = friendship_id
    AND friend_id = rejecter_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or cannot be rejected';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a friend
CREATE OR REPLACE FUNCTION remove_friend(user_a UUID, user_b UUID)
RETURNS void AS $$
BEGIN
  -- Delete the friendship in either direction
  DELETE FROM friendships
  WHERE status = 'accepted'
    AND (
      (user_id = user_a AND friend_id = user_b)
      OR (user_id = user_b AND friend_id = user_a)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friendship not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_friendship_status function to return proper format
CREATE OR REPLACE FUNCTION get_friendship_status(user_a UUID, user_b UUID)
RETURNS TABLE(status TEXT, is_requester BOOLEAN, friendship_id BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.status::TEXT,
    (f.user_id = user_a) as is_requester,
    f.id as friendship_id
  FROM friendships f
  WHERE
    (f.user_id = user_a AND f.friend_id = user_b)
    OR (f.user_id = user_b AND f.friend_id = user_a)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_friend_request IS 'Send a friend request from requester_id to target_id';
COMMENT ON FUNCTION accept_friend_request IS 'Accept a friend request by friendship_id';
COMMENT ON FUNCTION reject_friend_request IS 'Reject a friend request by friendship_id';
COMMENT ON FUNCTION remove_friend IS 'Remove a friendship between user_a and user_b';
COMMENT ON FUNCTION get_friendship_status IS 'Get friendship status between two users';
