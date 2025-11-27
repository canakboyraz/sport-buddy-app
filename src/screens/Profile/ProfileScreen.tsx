import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, ActionSheetIOS, Platform } from 'react-native';
import { Card, Text, Button, Avatar, Divider, ActivityIndicator, Switch, Menu, useTheme as usePaperTheme, List, Surface } from 'react-native-paper';
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
import { useTranslation } from 'react-i18next';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = usePaperTheme();
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
          options: [t('common.cancel'), t('profile.takePhoto'), t('profile.selectFromGallery')],
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
        Alert.alert(t('common.success'), t('profile.photoUpdateSuccess'));
        loadProfile();
      } else {
        Alert.alert(t('common.error'), t('profile.photoUploadError'));
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
        Alert.alert(t('common.success'), t('profile.photoUpdateSuccess'));
        loadProfile();
      } else {
        Alert.alert(t('common.error'), t('profile.photoUploadError'));
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('auth.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onBackground }}>{t('profile.profileNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        {/* Gradient Header */}
        <LinearGradient
          colors={
            isDarkMode
              ? [theme.colors.primaryContainer, theme.colors.secondaryContainer]
              : ['#6200ee', '#9c27b0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientHeader}
        >
          <View style={styles.header}>
            <View>
              <TouchableOpacity onPress={handlePhotoSelection} disabled={uploadingPhoto}>
                {profile.avatar_url ? (
                  <Avatar.Image size={90} source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <Avatar.Text size={90} label={profile.full_name?.charAt(0) || 'U'} style={styles.avatar} />
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

              {/* Rating Badge */}
              {ratings.length > 0 && (
                <View style={styles.ratingBadge}>
                  <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingBadgeText}>
                    {averageRating.toFixed(1)} ({ratings.length})
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <Card.Content style={styles.cardContent}>
          {profile.bio && (
            <>
              <Text style={[styles.bioLabel, { color: theme.colors.onSurface }]}>{t('profile.bio')}</Text>
              <Text style={[styles.bio, { color: theme.colors.onSurfaceVariant }]}>{profile.bio}</Text>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <MaterialCommunityIcons name="pencil" size={24} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, { color: theme.colors.onSurface }]}>{t('common.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.colors.secondaryContainer }]}
              onPress={() => navigation.navigate('CreateSession')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={theme.colors.secondary} />
              <Text style={[styles.quickActionText, { color: theme.colors.onSurface }]}>{t('profile.newSession')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.colors.tertiaryContainer }]}
              onPress={() => navigation.navigate('Favorites')}
            >
              <MaterialCommunityIcons name="heart" size={24} color={theme.colors.tertiary} />
              <Text style={[styles.quickActionText, { color: theme.colors.onSurface }]}>{t('navigation.favorites')}</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Statistics & Achievements */}
      <Surface style={[styles.menuCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.menuTitle, { color: theme.colors.onSurface }]}>{t('profile.statsAndAchievements')}</Text>
        <List.Item
          title={t('profile.myStats')}
          description={t('profile.viewActivityHistory')}
          left={props => <List.Icon {...props} icon="chart-box" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ProfileStats')}
          style={styles.menuItem}
        />
        <Divider />
        <List.Item
          title={t('profile.myAchievements')}
          description={t('profile.discoverBadges')}
          left={props => <List.Icon {...props} icon="trophy" color="#FFD700" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Achievements')}
          style={styles.menuItem}
        />
      </Surface>

      {/* Social */}
      <Surface style={[styles.menuCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.menuTitle, { color: theme.colors.onSurface }]}>{t('profile.social')}</Text>
        <List.Item
          title={t('friends.myFriends')}
          description={t('profile.manageFriendsList')}
          left={props => <List.Icon {...props} icon="account-multiple" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Friends')}
          style={styles.menuItem}
        />
        <Divider />
        <List.Item
          title={t('profile.blockedUsers')}
          description={t('profile.blockedUsersDesc')}
          left={props => <List.Icon {...props} icon="account-off" color="#F44336" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('BlockedUsers')}
          style={styles.menuItem}
        />
      </Surface>

      {/* Settings */}
      <Surface style={[styles.menuCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.menuTitle, { color: theme.colors.onSurface }]}>{t('navigation.settings')}</Text>
        <List.Item
          title={t('settings.darkMode')}
          description={isDarkMode ? t('profile.themeOn') : t('profile.themeOff')}
          left={props => <List.Icon {...props} icon={isDarkMode ? "weather-night" : "weather-sunny"} color={theme.colors.primary} />}
          right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
          style={styles.menuItem}
        />
        <Divider />
        <List.Item
          title={t('profile.generalSettings')}
          description={t('profile.editAppPreferences')}
          left={props => <List.Icon {...props} icon="cog" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Settings')}
          style={styles.menuItem}
        />
      </Surface>

      {/* Ratings */}
      {ratings.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('rating.ratingsAndReviews')}</Text>
            {ratings.map((rating) => (
              <Card key={rating.id} style={styles.ratingCard} mode="outlined">
                <Card.Content>
                  <View style={styles.ratingHeader}>
                    <View style={styles.raterInfo}>
                      <Avatar.Text
                        size={32}
                        label={rating.rater?.full_name?.charAt(0) || 'U'}
                      />
                      <Text style={[styles.raterName, { color: theme.colors.onSurface }]}>
                        {rating.rater?.full_name || t('profile.anonymous')}
                      </Text>
                    </View>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialCommunityIcons
                          key={star}
                          name={star <= rating.rating ? 'star' : 'star-outline'}
                          size={16}
                          color={star <= rating.rating ? '#FFD700' : theme.colors.outlineVariant}
                        />
                      ))}
                    </View>
                  </View>
                  {rating.comment && (
                    <Text style={[styles.comment, { color: theme.colors.onSurface }]}>{rating.comment}</Text>
                  )}
                  <Text style={[styles.ratingDate, { color: theme.colors.onSurfaceVariant }]}>
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
        {t('auth.logout')}
      </Button>

      {/* Android Photo Menu */}
      {Platform.OS !== 'ios' && (
        <Menu
          visible={photoMenuVisible}
          onDismiss={() => setPhotoMenuVisible(false)}
          anchor={<View />}
        >
          <Menu.Item onPress={takePhoto} title={t('profile.takePhoto')} leadingIcon="camera" />
          <Menu.Item onPress={pickPhoto} title={t('profile.selectFromGallery')} leadingIcon="image" />
        </Menu>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientHeader: {
    padding: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    paddingTop: 16,
  },
  divider: {
    marginVertical: 15,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuCard: {
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    opacity: 0.6,
  },
  menuItem: {
    paddingVertical: 4,
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
    marginBottom: 8,
  },
  ratingDate: {
    fontSize: 12,
  },
  logoutButton: {
    margin: 15,
    marginTop: 5,
  },
});
