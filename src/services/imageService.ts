import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { Platform } from 'react-native';

/**
 * Galeri/fotoğraf izinlerini al
 */
export async function requestImagePermissions() {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Galeri erişimi için izin gereklidir!');
      return false;
    }
  }
  return true;
}

/**
 * Kamera izinlerini al
 */
export async function requestCameraPermissions() {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Kamera erişimi için izin gereklidir!');
      return false;
    }
  }
  return true;
}

/**
 * Galeriden fotoğraf seç
 */
export async function pickImageFromGallery() {
  const hasPermission = await requestImagePermissions();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled) {
    return result.assets[0];
  }
  return null;
}

/**
 * Kamera ile fotoğraf çek
 */
export async function takePhotoWithCamera() {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled) {
    return result.assets[0];
  }
  return null;
}

/**
 * Fotoğrafı Supabase Storage'a yükle
 */
export async function uploadImageToSupabase(
  uri: string,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    // Fetch the image
    const response = await fetch(uri);
    const blob = await response.blob();

    // Dosya uzantısını al
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `${path}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

/**
 * Profil fotoğrafını yükle
 */
export async function uploadProfilePhoto(userId: string, imageUri: string) {
  const publicUrl = await uploadImageToSupabase(
    imageUri,
    'avatars',
    `${userId}/avatar`
  );

  if (publicUrl) {
    // Profili güncelle
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (error) {
      console.error('Profile update error:', error);
      return null;
    }

    return publicUrl;
  }

  return null;
}

/**
 * Eski profil fotoğrafını sil
 */
export async function deleteProfilePhoto(userId: string) {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.jpeg`]);

    if (error) {
      console.error('Delete error:', error);
    }
  } catch (error) {
    console.error('Delete error:', error);
  }
}
