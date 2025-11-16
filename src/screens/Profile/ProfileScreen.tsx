import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, ActionSheetIOS, Platform } from 'react-native';
import { Card, Text, Button, Avatar, Divider, ActivityIndicator, Switch, Menu } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Profile, Rating } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { pickImageFromGallery, takePhotoWithCamera, uploadProfilePhoto } from '../../services/imageService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadRatings(user.id);
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setLoading(false);

    if (!error && data) {
      setProfile(data);
    }
  };

  const loadRatings = async (userId: string) => {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        id,
        rating,
        comment,
        created_at,
        rater:profiles!ratings_rater_user_id_fkey(*)
      `)
      .eq('rated_user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRatings(data as any);

      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    }
  };

  const handlePhotoSelection = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['İptal', 'Fotoğraf Çek', 'Galeriden Seç'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickPhoto();
          }
        }
      );
    } else {
      setPhotoMenuVisible(true);
    }
  };

  const takePhoto = async () => {
    setPhotoMenuVisible(false);
    const result = await takePhotoWithCamera();
    if (result && user) {
      setUploadingPhoto(true);
      const url = await uploadProfilePhoto(user.id, result.uri);
      setUploadingPhoto(false);

      if (url) {
        Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
        loadProfile();
      } else {
        Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
      }
    }
  };

  const pickPhoto = async () => {
    setPhotoMenuVisible(false);
    const result = await pickImageFromGallery();
    if (result && user) {
      setUploadingPhoto(true);
      const url = await uploadProfilePhoto(user.id, result.uri);
      setUploadingPhoto(false);

      if (url) {
        Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
        loadProfile();
      } else {
        Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert('Çıkış', 'Çıkmak istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Profil bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View>
              <TouchableOpacity onPress={handlePhotoSelection} disabled={uploadingPhoto}>
                {profile.avatar_url ? (
                  <Avatar.Image size={80} source={{ uri: profile.avatar_url }} />
                ) : (
                  <Avatar.Text size={80} label={profile.full_name?.charAt(0) || 'U'} />
                )}
                {uploadingPhoto && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handlePhotoSelection}
                disabled={uploadingPhoto}
              >
                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.name}>{profile.full_name}</Text>
              <Text style={styles.email}>{profile.email}</Text>
              {profile.phone && <Text style={styles.phone}>{profile.phone}</Text>}
            </View>
          </View>

          {ratings.length > 0 && (
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={24} color="#FFD700" />
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)} ({ratings.length} değerlendirme)
              </Text>
            </View>
          )}

          {profile.bio && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.bioLabel}>Hakkında:</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </>
          )}

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            icon="calendar-check"
            onPress={() => navigation.navigate('MyEvents')}
            style={styles.actionButton}
          >
            Etkinliklerim
          </Button>

          <Button
            mode="contained"
            icon="plus-circle"
            onPress={() => navigation.navigate('CreateSession')}
            style={styles.actionButton}
          >
            Yeni Seans Oluştur
          </Button>

          <Divider style={styles.divider} />

          <View style={styles.settingsRow}>
            <View style={styles.settingItem}>
              <MaterialCommunityIcons
                name={isDarkMode ? "weather-night" : "weather-sunny"}
                size={24}
                color={isDarkMode ? "#bb86fc" : "#6200ee"}
              />
              <Text style={styles.settingLabel}>Koyu Tema</Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleTheme} />
          </View>
        </Card.Content>
      </Card>

      {ratings.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
            {ratings.map((rating) => (
              <Card key={rating.id} style={styles.ratingCard} mode="outlined">
                <Card.Content>
                  <View style={styles.ratingHeader}>
                    <View style={styles.raterInfo}>
                      <Avatar.Text
                        size={32}
                        label={rating.rater?.full_name?.charAt(0) || 'U'}
                      />
                      <Text style={styles.raterName}>
                        {rating.rater?.full_name || 'Anonim'}
                      </Text>
                    </View>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialCommunityIcons
                          key={star}
                          name={star <= rating.rating ? 'star' : 'star-outline'}
                          size={16}
                          color={star <= rating.rating ? '#FFD700' : '#ccc'}
                        />
                      ))}
                    </View>
                  </View>
                  {rating.comment && (
                    <Text style={styles.comment}>{rating.comment}</Text>
                  )}
                  <Text style={styles.ratingDate}>
                    {new Date(rating.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor="#d32f2f"
      >
        Çıkış Yap
      </Button>

      {/* Android Photo Menu */}
      {Platform.OS !== 'ios' && (
        <Menu
          visible={photoMenuVisible}
          onDismiss={() => setPhotoMenuVisible(false)}
          anchor={<View />}
        >
          <Menu.Item onPress={takePhoto} title="Fotoğraf Çek" leadingIcon="camera" />
          <Menu.Item onPress={pickPhoto} title="Galeriden Seç" leadingIcon="image" />
        </Menu>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  phone: {
    fontSize: 16,
    color: '#666',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6200ee',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff9e6',
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    marginVertical: 15,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bio: {
    fontSize: 16,
    color: '#666',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  ratingCard: {
    marginBottom: 10,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  raterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  raterName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  comment: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
  },
  logoutButton: {
    margin: 15,
    marginTop: 5,
  },
  actionButton: {
    marginTop: 10,
  },
});
