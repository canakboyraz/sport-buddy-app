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
      {/* Modern Profile Header */}
      <LinearGradient
        colors={
          isDarkMode
            ? ['#6200ee', '#9c27b0']
            : ['#6200ee', '#9c27b0']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
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
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handlePhotoSelection}
              disabled={uploadingPhoto}
            >
              <MaterialCommunityIcons name="camera" size={18} color="#6200ee" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{profile.email}</Text>

          {/* Rating Badge */}
          {ratings.length > 0 && (
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingBadgeText}>
                {averageRating.toFixed(1)} ({ratings.length} {t('rating.reviews')})
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Bio Section */}
      {profile.bio && (
        <Surface style={[styles.bioCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={styles.bioHeader}>
            <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary} />
            <Text style={[styles.bioLabel, { color: theme.colors.primary }]}>{t('profile.bio')}</Text>
          </View>
          <Text style={[styles.bio, { color: theme.colors.onSurface }]}>{profile.bio}</Text>
        </Surface>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: theme.colors.primaryContainer }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <MaterialCommunityIcons name="pencil" size={26} color={theme.colors.primary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.colors.onSurface }]}>{t('common.edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: theme.colors.tertiaryContainer }]}
          onPress={() => navigation.navigate('Favorites')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.tertiary + '20' }]}>
            <MaterialCommunityIcons name="heart" size={26} color={theme.colors.tertiary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.colors.onSurface }]}>{t('navigation.favorites')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: theme.colors.secondaryContainer }]}
          onPress={() => navigation.navigate('ProfileStats')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.secondary + '20' }]}>
            <MaterialCommunityIcons name="chart-line" size={26} color={theme.colors.secondary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.colors.onSurface }]}>{t('profile.myStats')}</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics & Achievements */}
      <Surface style={[styles.menuCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="trophy-variant" size={22} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{t('profile.statsAndAchievements')}</Text>
        </View>
        <TouchableOpacity
          style={styles.modernMenuItem}
          onPress={() => navigation.navigate('ProfileStats')}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="chart-box" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuItemTitle, { color: theme.colors.onSurface }]}>{t('profile.myStats')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: theme.colors.onSurfaceVariant }]}>{t('profile.viewActivityHistory')}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Divider style={styles.divider} />
        <TouchableOpacity
          style={styles.modernMenuItem}
          onPress={() => navigation.navigate('Achievements')}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#FFD70020' }]}>
              <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuItemTitle, { color: theme.colors.onSurface }]}>{t('profile.myAchievements')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: theme.colors.onSurfaceVariant }]}>{t('profile.discoverBadges')}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </Surface>

      {/* Social */}
      <Surface style={[styles.menuCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="account-group" size={22} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{t('profile.social')}</Text>
        </View>
        <TouchableOpacity
          style={styles.modernMenuItem}
          onPress={() => navigation.navigate('Friends')}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="account-multiple" size={24} color={theme.colors.secondary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuItemTitle, { color: theme.colors.onSurface }]}>{t('friends.myFriends')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: theme.colors.onSurfaceVariant }]}>{t('profile.manageFriendsList')}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Divider style={styles.divider} />
        <TouchableOpacity
          style={styles.modernMenuItem}
          onPress={() => navigation.navigate('BlockedUsers')}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#F4433620' }]}>
              <MaterialCommunityIcons name="account-off" size={24} color="#F44336" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuItemTitle, { color: theme.colors.onSurface }]}>{t('profile.blockedUsers')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: theme.colors.onSurfaceVariant }]}>{t('profile.blockedUsersDesc')}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </Surface>

      {/* Settings */}
      <Surface style={[styles.menuCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="cog" size={22} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{t('navigation.settings')}</Text>
        </View>
        <View style={styles.modernMenuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.tertiaryContainer }]}>
              <MaterialCommunityIcons name={isDarkMode ? "weather-night" : "weather-sunny"} size={24} color={theme.colors.tertiary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuItemTitle, { color: theme.colors.onSurface }]}>{t('settings.darkMode')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {isDarkMode ? t('profile.themeOn') : t('profile.themeOff')}
              </Text>
            </View>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} />
        </View>
        <Divider style={styles.divider} />
        <TouchableOpacity
          style={styles.modernMenuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="tune" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuItemTitle, { color: theme.colors.onSurface }]}>{t('profile.generalSettings')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: theme.colors.onSurfaceVariant }]}>{t('profile.editAppPreferences')}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </Surface>

      {/* Ratings */}
      {ratings.length > 0 && (
        <Surface style={[styles.ratingsCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="star-box" size={22} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{t('rating.ratingsAndReviews')}</Text>
          </View>
          {ratings.map((rating, index) => (
            <View key={rating.id}>
              {index > 0 && <Divider style={styles.ratingDivider} />}
              <View style={styles.ratingItem}>
                <View style={styles.ratingHeader}>
                  <View style={styles.raterInfo}>
                    <Avatar.Text
                      size={36}
                      label={rating.rater?.full_name?.charAt(0) || 'U'}
                      style={{ backgroundColor: theme.colors.primaryContainer }}
                      color={theme.colors.primary}
                    />
                    <View style={styles.raterDetails}>
                      <Text style={[styles.raterName, { color: theme.colors.onSurface }]}>
                        {rating.rater?.full_name || t('profile.anonymous')}
                      </Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialCommunityIcons
                            key={star}
                            name={star <= rating.rating ? 'star' : 'star-outline'}
                            size={14}
                            color={star <= rating.rating ? '#FFD700' : theme.colors.outlineVariant}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.ratingDate, { color: theme.colors.onSurfaceVariant }]}>
                    {new Date(rating.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                {rating.comment && (
                  <Text style={[styles.comment, { color: theme.colors.onSurface }]}>{rating.comment}</Text>
                )}
              </View>
            </View>
          ))}
        </Surface>
      )}

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor={theme.colors.error}
        icon="logout"
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
  gradientHeader: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6200ee',
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
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  ratingBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  bioCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  bioLabel: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  menuCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
  },
  divider: {
    marginVertical: 8,
  },
  ratingsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  ratingItem: {
    paddingVertical: 12,
  },
  ratingDivider: {
    marginVertical: 0,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  ratingDate: {
    fontSize: 12,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 12,
  },
});
