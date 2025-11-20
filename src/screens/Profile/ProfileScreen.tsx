import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, ActionSheetIOS, Platform, StatusBar } from 'react-native';
import { Card, Text, Button, Avatar, Divider, ActivityIndicator, Switch, Menu, List } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#6200ee', '#9c27b0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handlePhotoSelection} disabled={uploadingPhoto}>
            {profile.avatar_url ? (
              <Avatar.Image size={100} source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <Avatar.Text size={100} label={profile.full_name?.charAt(0) || 'U'} style={styles.avatar} />
            )}
            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            <View style={styles.cameraButton}>
              <MaterialCommunityIcons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          {profile.phone && <Text style={styles.phone}>{profile.phone}</Text>}

          {ratings.length > 0 && (
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)} ({ratings.length} değerlendirme)
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {profile.bio && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="information" size={20} color="#6200ee" /> Hakkında
              </Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account-cog" size={20} color="#6200ee" /> Profil İşlemleri
            </Text>

            <List.Item
              title="Profili Düzenle"
              description="Bilgilerinizi güncelleyin"
              left={props => <List.Icon {...props} icon="pencil" color="#6200ee" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('EditProfile')}
              style={styles.listItem}
            />

            <List.Item
              title="İstatistiklerim"
              description="Aktivite istatistiklerinizi görün"
              left={props => <List.Icon {...props} icon="chart-box" color="#6200ee" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ProfileStats')}
              style={styles.listItem}
            />

            <List.Item
              title="Başarılarım"
              description="Kazandığınız rozetler"
              left={props => <List.Icon {...props} icon="trophy" color="#6200ee" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Achievements')}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account-group" size={20} color="#6200ee" /> Sosyal
            </Text>

            <List.Item
              title="Arkadaşlarım"
              description="Arkadaş listenizi yönetin"
              left={props => <List.Icon {...props} icon="account-multiple" color="#6200ee" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Friends')}
              style={styles.listItem}
            />

            <List.Item
              title="Favorilerim"
              description="Favori etkinlikleriniz"
              left={props => <List.Icon {...props} icon="heart" color="#6200ee" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Favorites')}
              style={styles.listItem}
            />

            <List.Item
              title="Engellenenler"
              description="Engellenen kullanıcılar"
              left={props => <List.Icon {...props} icon="account-off" color="#9E9E9E" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('BlockedUsers')}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="cog" size={20} color="#6200ee" /> Ayarlar
            </Text>

            <List.Item
              title="Koyu Tema"
              description={isDarkMode ? "Koyu tema aktif" : "Açık tema aktif"}
              left={props => (
                <List.Icon
                  {...props}
                  icon={isDarkMode ? "weather-night" : "weather-sunny"}
                  color={isDarkMode ? "#bb86fc" : "#6200ee"}
                />
              )}
              right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="plus-circle"
          onPress={() => navigation.navigate('CreateSession')}
          style={styles.createButton}
          contentStyle={styles.createButtonContent}
        >
          Yeni Seans Oluştur
        </Button>

        {ratings.length > 0 && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="star-box" size={20} color="#6200ee" /> Değerlendirmeler
              </Text>
              {ratings.map((rating) => (
                <Card key={rating.id} style={styles.ratingCard} mode="outlined">
                  <Card.Content>
                    <View style={styles.ratingHeader}>
                      <View style={styles.raterInfo}>
                        <Avatar.Text
                          size={36}
                          label={rating.rater?.full_name?.charAt(0) || 'U'}
                        />
                        <View style={styles.raterDetails}>
                          <Text style={styles.raterName}>
                            {rating.rater?.full_name || 'Anonim'}
                          </Text>
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
                      </View>
                      <Text style={styles.ratingDate}>
                        {new Date(rating.created_at).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    {rating.comment && (
                      <Text style={styles.comment}>{rating.comment}</Text>
                    )}
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
          icon="logout"
          contentStyle={styles.logoutButtonContent}
        >
          Çıkış Yap
        </Button>
      </ScrollView>

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
    </View>
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
  headerGradient: {
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerContent: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  avatar: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6200ee',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderRadius: 16,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bio: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  listItem: {
    paddingVertical: 4,
  },
  createButton: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
  ratingCard: {
    marginBottom: 12,
    borderColor: '#e0e0e0',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  raterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  raterDetails: {
    marginLeft: 12,
    flex: 1,
  },
  raterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
});
