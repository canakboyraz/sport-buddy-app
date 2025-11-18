# Supabase Storage Setup

This document explains how to set up Supabase Storage buckets for the Sport Buddy application.

## Required Buckets

### 1. Avatars Bucket

The `avatars` bucket stores user profile photos.

#### Creating the Bucket

1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Name: `avatars`
4. Public: ✅ Enabled (for public profile photos)
5. Click "Create Bucket"

#### RLS Policies

Apply these Row Level Security policies to the `avatars` bucket:

**Policy 1: Anyone can view avatars**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
```

**Policy 2: Users can upload their own avatar**
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: Users can update their own avatar**
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 4: Users can delete their own avatar**
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Folder Structure

Avatars are stored with the following structure:
```
avatars/
  └── {user_id}/
      └── avatar.{jpg|png|jpeg}
```

Example: `avatars/123e4567-e89b-12d3-a456-426614174000/avatar.jpg`

#### File Limits

The imageService automatically:
- Compresses images to max 2MB
- Resizes to max 1920x1920px
- Converts to JPEG format
- Quality: 0.8 (80%)

## Verification

To verify the setup is working:

1. **Test Upload**: Try uploading a profile photo in the app
2. **Check Logs**: Look for `[imageService]` logs in console
3. **Verify Storage**: Check Supabase Dashboard → Storage → avatars
4. **Test Public URL**: The public URL should be accessible without auth

## Troubleshooting

### Error: "new row violates row-level security policy"
- Check that RLS policies are created correctly
- Verify user is authenticated (auth.uid() returns the user's ID)
- Ensure bucket_id in policy matches 'avatars'

### Error: "Bucket not found"
- Create the `avatars` bucket in Supabase Dashboard
- Ensure bucket name is exactly 'avatars' (lowercase)

### Error: "Upload error: 413 Payload Too Large"
- Image is too large even after compression
- Check file size limits in Supabase project settings
- Default limit is usually 50MB, but compression should keep files under 2MB

### Images not loading
- Check that bucket is set to "Public"
- Verify the public URL is correct format
- Check browser console for CORS errors
