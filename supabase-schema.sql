-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Sports Table
CREATE TABLE IF NOT EXISTS sports (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Sport Sessions Table
CREATE TABLE IF NOT EXISTS sport_sessions (
    id SERIAL PRIMARY KEY,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    city TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER NOT NULL,
    skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'any')) NOT NULL,
    status TEXT CHECK (status IN ('open', 'full', 'completed', 'cancelled')) DEFAULT 'open' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Session Participants Table
CREATE TABLE IF NOT EXISTS session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sport_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(session_id, user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sport_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sport_sessions(id) ON DELETE CASCADE NOT NULL,
    rated_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rater_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(session_id, rated_user_id, rater_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sport_sessions_creator ON sport_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_sport_sessions_sport ON sport_sessions(sport_id);
CREATE INDEX IF NOT EXISTS idx_sport_sessions_date ON sport_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sport_sessions_city ON sport_sessions(city);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_session ON ratings(session_id);

-- RLS Policies

-- Profiles: Anyone can view, users can update their own
CREATE POLICY "Anyone can view profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Sports: Anyone can view
CREATE POLICY "Anyone can view sports"
    ON sports FOR SELECT
    USING (true);

-- Sport Sessions: Anyone can view, authenticated users can create, creators can update
CREATE POLICY "Anyone can view sport sessions"
    ON sport_sessions FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create sport sessions"
    ON sport_sessions FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their sport sessions"
    ON sport_sessions FOR UPDATE
    USING (auth.uid() = creator_id);

-- Session Participants: Anyone can view, authenticated users can join, creators can manage
CREATE POLICY "Anyone can view session participants"
    ON session_participants FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can join sessions"
    ON session_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Session creators can manage participants"
    ON session_participants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM sport_sessions
            WHERE sport_sessions.id = session_participants.session_id
            AND sport_sessions.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own participation"
    ON session_participants FOR DELETE
    USING (auth.uid() = user_id);

-- Messages: Session participants can view and create
CREATE POLICY "Session participants can view messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM session_participants
            WHERE session_participants.session_id = messages.session_id
            AND session_participants.user_id = auth.uid()
            AND session_participants.status = 'approved'
        )
        OR
        EXISTS (
            SELECT 1 FROM sport_sessions
            WHERE sport_sessions.id = messages.session_id
            AND sport_sessions.creator_id = auth.uid()
        )
    );

CREATE POLICY "Session participants can create messages"
    ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            EXISTS (
                SELECT 1 FROM session_participants
                WHERE session_participants.session_id = messages.session_id
                AND session_participants.user_id = auth.uid()
                AND session_participants.status = 'approved'
            )
            OR
            EXISTS (
                SELECT 1 FROM sport_sessions
                WHERE sport_sessions.id = messages.session_id
                AND sport_sessions.creator_id = auth.uid()
            )
        )
    );

-- Ratings: Anyone can view, session participants can rate each other
CREATE POLICY "Anyone can view ratings"
    ON ratings FOR SELECT
    USING (true);

CREATE POLICY "Session participants can rate each other"
    ON ratings FOR INSERT
    WITH CHECK (
        auth.uid() = rater_user_id
        AND EXISTS (
            SELECT 1 FROM session_participants
            WHERE session_participants.session_id = ratings.session_id
            AND session_participants.user_id = auth.uid()
            AND session_participants.status = 'approved'
        )
        AND EXISTS (
            SELECT 1 FROM sport_sessions
            WHERE sport_sessions.id = ratings.session_id
            AND sport_sessions.status = 'completed'
        )
    );

-- Enable RLS on ratings table
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Insert some sample sports
INSERT INTO sports (name, icon) VALUES
    ('Futbol', 'soccer'),
    ('Basketbol', 'basketball'),
    ('Tenis', 'tennis'),
    ('Voleybol', 'volleyball'),
    ('Yüzme', 'swim'),
    ('Koşu', 'run'),
    ('Bisiklet', 'bike')
ON CONFLICT DO NOTHING;
