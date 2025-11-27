-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id BIGINT REFERENCES public.sport_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read/delete)
CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_sender_id UUID,
    p_session_id BIGINT,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id BIGINT;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        sender_id,
        session_id,
        type,
        title,
        message,
        data
    ) VALUES (
        p_user_id,
        p_sender_id,
        p_session_id,
        p_type,
        p_title,
        p_message,
        p_data
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Trigger function to create notification when friend request is created
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_name TEXT;
BEGIN
    -- Get sender's name
    SELECT full_name INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Create notification for the target user
    INSERT INTO public.notifications (
        user_id,
        sender_id,
        type,
        title,
        message,
        data
    ) VALUES (
        NEW.friend_id,
        NEW.user_id,
        'friend_request',
        'Yeni Arkadaşlık İsteği',
        v_sender_name || ' size arkadaşlık isteği gönderdi',
        jsonb_build_object('friendshipId', NEW.id)
    );

    RETURN NEW;
END;
$$;

-- Trigger for friend requests
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON public.friendships;
CREATE TRIGGER trigger_notify_friend_request
    AFTER INSERT ON public.friendships
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_friend_request();

-- Trigger function to create notification when friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_accepter_name TEXT;
BEGIN
    -- Get accepter's name
    SELECT full_name INTO v_accepter_name
    FROM public.profiles
    WHERE id = NEW.friend_id;

    -- Create notification for the requester
    INSERT INTO public.notifications (
        user_id,
        sender_id,
        type,
        title,
        message,
        data
    ) VALUES (
        NEW.user_id,
        NEW.friend_id,
        'friend_accepted',
        'Arkadaşlık İsteği Kabul Edildi',
        v_accepter_name || ' arkadaşlık isteğinizi kabul etti',
        jsonb_build_object('friendshipId', NEW.id)
    );

    RETURN NEW;
END;
$$;

-- Trigger for friend acceptance
DROP TRIGGER IF EXISTS trigger_notify_friend_accepted ON public.friendships;
CREATE TRIGGER trigger_notify_friend_accepted
    AFTER UPDATE ON public.friendships
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
    EXECUTE FUNCTION notify_friend_accepted();

-- Trigger function to create notification when session join request is created
CREATE OR REPLACE FUNCTION notify_session_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_requester_name TEXT;
    v_session_title TEXT;
    v_creator_id UUID;
BEGIN
    -- Get requester's name
    SELECT full_name INTO v_requester_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Get session title and creator
    SELECT title, creator_id INTO v_session_title, v_creator_id
    FROM public.sport_sessions
    WHERE id = NEW.session_id;

    -- Create notification for the session creator
    INSERT INTO public.notifications (
        user_id,
        sender_id,
        session_id,
        type,
        title,
        message,
        data
    ) VALUES (
        v_creator_id,
        NEW.user_id,
        NEW.session_id,
        'session_join_request',
        'Yeni Katılım Talebi',
        v_requester_name || ' "' || v_session_title || '" seansına katılmak istiyor',
        jsonb_build_object('participantId', NEW.id, 'sessionId', NEW.session_id)
    );

    RETURN NEW;
END;
$$;

-- Trigger for session join requests
DROP TRIGGER IF EXISTS trigger_notify_session_join_request ON public.session_participants;
CREATE TRIGGER trigger_notify_session_join_request
    AFTER INSERT ON public.session_participants
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_session_join_request();

-- Trigger function to create notification when session join is approved
CREATE OR REPLACE FUNCTION notify_session_join_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_title TEXT;
BEGIN
    -- Get session title
    SELECT title INTO v_session_title
    FROM public.sport_sessions
    WHERE id = NEW.session_id;

    -- Create notification for the participant
    INSERT INTO public.notifications (
        user_id,
        session_id,
        type,
        title,
        message,
        data
    ) VALUES (
        NEW.user_id,
        NEW.session_id,
        'session_join_approved',
        'Katılımınız Onaylandı',
        '"' || v_session_title || '" seansına katılımınız onaylandı',
        jsonb_build_object('participantId', NEW.id, 'sessionId', NEW.session_id)
    );

    RETURN NEW;
END;
$$;

-- Trigger for session join approval
DROP TRIGGER IF EXISTS trigger_notify_session_join_approved ON public.session_participants;
CREATE TRIGGER trigger_notify_session_join_approved
    AFTER UPDATE ON public.session_participants
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
    EXECUTE FUNCTION notify_session_join_approved();

-- Comment on table
COMMENT ON TABLE public.notifications IS 'Stores in-app notifications for users';
