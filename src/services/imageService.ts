import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { Platform } from 'react-native';

// Image optimization constants
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const DEFAULT_COMPRESS_QUALITY = 0.8;

/**
 * Get image file size from URI
 */
async function getImageSize(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch (error) {
    console.error('Error getting image size:', error);
    return 0;
  }
}

/**
 * Compress and resize image
 */
export async function compressImage(
  uri: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<string> {
  try {
    const { maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT, quality = DEFAULT_COMPRESS_QUALITY } = options;

    // Get image dimensions to calculate proper resize
    const resizeOptions: ImageManipulator.Action[] = [];

    // Only resize if max dimensions are specified
    if (maxWidth || maxHeight) {
      resizeOptions.push({
        resize: {
          width: maxWidth,
          height: maxHeight,
        },
      });
    }

    // Manipulate image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      resizeOptions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    return uri; // Return original if compression fails
  }
}

/**
 * Optimize image for upload (compress if needed)
 */
export async function optimizeImageForUpload(uri: string): Promise<string> {
  try {
    const fileSize = await getImageSize(uri);

    // If image is already small enough, return as is
    if (fileSize <= MAX_IMAGE_SIZE) {
      return uri;
    }

    // Calculate compression quality based on file size
    const compressionRatio = MAX_IMAGE_SIZE / fileSize;
    const quality = Math.min(compressionRatio * DEFAULT_COMPRESS_QUALITY, DEFAULT_COMPRESS_QUALITY);

    return await compressImage(uri, { quality });
  } catch (error) {
    console.error('Error optimizing image:', error);
    return uri;
  }
}

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
  path: string,
  autoOptimize: boolean = true
): Promise<string | null> {
  try {
    // Optimize image before upload if enabled
    let uploadUri = uri;
    if (autoOptimize) {
      uploadUri = await optimizeImageForUpload(uri);
    }

    // Convert URI to ArrayBuffer for React Native
    const response = await fetch(uploadUri);
    const arrayBuffer = await response.arrayBuffer();

    // Dosya uzantısını al
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `${path}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) {
      console.error('[imageService] Upload error:', error);
      console.error('[imageService] Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        bucket,
        fileName
      });
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
