-- Admin Dashboard SQL Queries
-- Supabase Studio'da SQL Editor'de çalıştırabilirsiniz

-- 1. Genel İstatistikler
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE) as users_today,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as users_this_week,
  (SELECT COUNT(*) FROM sport_sessions) as total_sessions,
  (SELECT COUNT(*) FROM sport_sessions WHERE session_date >= NOW()) as active_sessions,
  (SELECT COUNT(*) FROM sport_sessions WHERE session_date < NOW()) as completed_sessions,
  (SELECT COUNT(*) FROM session_participants WHERE status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships;

-- 2. Günlük Kullanıcı Kayıtları (Son 30 gün)
CREATE OR REPLACE VIEW daily_user_registrations AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as count
FROM profiles
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 3. Popüler Spor Dalları
CREATE OR REPLACE VIEW popular_sports AS
SELECT
  s.name as sport_name,
  COUNT(ss.id) as session_count
FROM sports s
LEFT JOIN sport_sessions ss ON s.id = ss.sport_id
GROUP BY s.id, s.name
ORDER BY session_count DESC;

-- 4. Şehir Bazında Dağılım
CREATE OR REPLACE VIEW sessions_by_city AS
SELECT
  city,
  COUNT(*) as session_count,
  COUNT(DISTINCT creator_id) as unique_creators
FROM sport_sessions
WHERE city IS NOT NULL
GROUP BY city
ORDER BY session_count DESC
LIMIT 20;

-- 5. En Aktif Kullanıcılar
CREATE OR REPLACE VIEW most_active_users AS
SELECT
  p.id,
  p.full_name,
  p.email,
  COUNT(DISTINCT ss.id) as sessions_created,
  COUNT(DISTINCT sp.session_id) as sessions_joined,
  p.average_rating,
  p.total_ratings
FROM profiles p
LEFT JOIN sport_sessions ss ON p.id = ss.creator_id
LEFT JOIN session_participants sp ON p.id = sp.user_id AND sp.status = 'approved'
GROUP BY p.id, p.full_name, p.email, p.average_rating, p.total_ratings
ORDER BY (COUNT(DISTINCT ss.id) + COUNT(DISTINCT sp.session_id)) DESC
LIMIT 50;

-- 6. Son Kayıt Olan Kullanıcılar
CREATE OR REPLACE VIEW recent_users AS
SELECT
  id,
  full_name,
  email,
  created_at,
  (SELECT COUNT(*) FROM sport_sessions WHERE creator_id = p.id) as sessions_created
FROM profiles p
ORDER BY created_at DESC
LIMIT 50;

-- 7. Son Oluşturulan Seanslar
CREATE OR REPLACE VIEW recent_sessions AS
SELECT
  ss.id,
  ss.title,
  s.name as sport_name,
  p.full_name as creator_name,
  ss.session_date,
  ss.city,
  ss.created_at,
  (SELECT COUNT(*) FROM session_participants WHERE session_id = ss.id AND status = 'approved') as participants_count
FROM sport_sessions ss
LEFT JOIN sports s ON ss.sport_id = s.id
LEFT JOIN profiles p ON ss.creator_id = p.id
ORDER BY ss.created_at DESC
LIMIT 50;

-- 8. Haftalık Aktivite Özeti
CREATE OR REPLACE VIEW weekly_activity_summary AS
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as new_users,
  (SELECT COUNT(*) FROM sport_sessions WHERE DATE_TRUNC('week', created_at) = DATE_TRUNC('week', profiles.created_at)) as new_sessions
FROM profiles
WHERE created_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- Kullanım:
-- SELECT * FROM admin_stats;
-- SELECT * FROM daily_user_registrations;
-- SELECT * FROM popular_sports;
-- SELECT * FROM sessions_by_city;
-- SELECT * FROM most_active_users;
-- SELECT * FROM recent_users;
-- SELECT * FROM recent_sessions;
-- SELECT * FROM weekly_activity_summary;
