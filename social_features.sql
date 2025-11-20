-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own friendships"
    ON friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert friend requests"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friendships"
    ON friendships FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships"
    ON friendships FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RPC: Send Friend Request
DROP FUNCTION IF EXISTS send_friend_request(uuid, uuid);
CREATE OR REPLACE FUNCTION send_friend_request(requester_id UUID, target_id UUID)
RETURNS void AS $$
BEGIN
    -- Check if friendship already exists
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE (user_id = requester_id AND friend_id = target_id)
        OR (user_id = target_id AND friend_id = requester_id)
    ) THEN
        RAISE EXCEPTION 'Friendship already exists';
    END IF;

    -- Insert new request
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (requester_id, target_id, 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Accept Friend Request
DROP FUNCTION IF EXISTS accept_friend_request(integer, uuid);
CREATE OR REPLACE FUNCTION accept_friend_request(friendship_id INTEGER, accepter_id UUID)
RETURNS void AS $$
DECLARE
    f_record RECORD;
BEGIN
    SELECT * INTO f_record FROM friendships WHERE id = friendship_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friendship not found';
    END IF;

    IF f_record.friend_id != accepter_id THEN
        RAISE EXCEPTION 'Not authorized to accept this request';
    END IF;

    UPDATE friendships 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = friendship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Reject Friend Request
DROP FUNCTION IF EXISTS reject_friend_request(integer, uuid);
CREATE OR REPLACE FUNCTION reject_friend_request(friendship_id INTEGER, rejecter_id UUID)
RETURNS void AS $$
DECLARE
    f_record RECORD;
BEGIN
    SELECT * INTO f_record FROM friendships WHERE id = friendship_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friendship not found';
    END IF;

    IF f_record.friend_id != rejecter_id THEN
        RAISE EXCEPTION 'Not authorized to reject this request';
    END IF;

    DELETE FROM friendships WHERE id = friendship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Remove Friend
DROP FUNCTION IF EXISTS remove_friend(uuid, uuid);
CREATE OR REPLACE FUNCTION remove_friend(user_a UUID, user_b UUID)
RETURNS void AS $$
BEGIN
    DELETE FROM friendships 
    WHERE (user_id = user_a AND friend_id = user_b)
    OR (user_id = user_b AND friend_id = user_a);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get Friendship Status
DROP FUNCTION IF EXISTS get_friendship_status(uuid, uuid);
CREATE OR REPLACE FUNCTION get_friendship_status(user_a UUID, user_b UUID)
RETURNS TABLE (status TEXT, is_requester BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.status,
        (f.user_id = user_a) as is_requester
    FROM friendships f
    WHERE (f.user_id = user_a AND f.friend_id = user_b)
    OR (f.user_id = user_b AND f.friend_id = user_a);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
