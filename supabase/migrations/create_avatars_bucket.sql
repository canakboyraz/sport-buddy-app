-- Create avatars storage bucket for profile photos
-- Bu migration profil fotoğrafları için avatars bucket'ını oluşturur

-- 1. Avatars bucket'ını oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket (herkes erişebilir)
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policy'leri oluştur

-- Herkes avatarları görebilir (public bucket)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Kullanıcılar kendi avatarlarını yükleyebilir
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Kullanıcılar kendi avatarlarını güncelleyebilir
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Kullanıcılar kendi avatarlarını silebilir
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Session images bucket'ını da oluştur (gelecek için)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-images',
  'session-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Session images policies
CREATE POLICY "Session images are publicly accessible" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'session-images');

CREATE POLICY "Authenticated users can upload session images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'session-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their session images" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'session-images');

CREATE POLICY "Users can delete their session images" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'session-images');

-- 4. Yorum ekle
COMMENT ON TABLE storage.buckets IS 'Avatars bucket stores user profile photos. Session-images bucket stores sport session related images.';
