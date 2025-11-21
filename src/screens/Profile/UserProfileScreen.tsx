import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, Animated, Easing } from 'react-native';
import {
  Card,
  Text,
  ActivityIndicator,
  Avatar,
  Button,
  Divider,
  Chip,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { friendService, FriendshipStatus } from '../../services/friendService';
import { getBadgeLevel, getUserRatingStats } from '../../services/ratingService';
import { getUserAchievements } from '../../services/achievementService';
import { Achievement, UserAchievement } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'UserProfile'>;
  route: RouteProp<RootStackParamList, 'UserProfile'>;
};

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  date_of_birth: string | null;
  gender: string | null;
  created_at: string;
}

interface Rating {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  rater: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function UserProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    totalRatings: 0,
    positiveReviewsCount: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  // Animations
  const badgePulseAnim = useRef(new Animated.Value(1)).current;
  const badgeRotateAnim = useRef(new Animated.Value(0)).current;
  const statsCardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulseAnim, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation for badge
    Animated.loop(
      Animated.timing(badgeRotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.spring(statsCardAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  useEffect(() => {
    if (user && userId) {
      loadUserProfile();
      checkBlockStatus();
      checkFriendship();
    }
  }, [user, userId]);

  const loadUserProfile = async () => {
    setLoading(true);

    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        Alert.alert('Hata', 'Profil yüklenirken bir hata oluştu.');
        navigation.goBack();
        return;
      }

      setProfile(profileData);

      // Get user ratings
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select(`
          id,
          rating,
          comment,
          created_at,
          is_positive,
          rater:profiles!ratings_rater_user_id_fkey(full_name, avatar_url)
        `)
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setRatings(ratingsData || []);

      // Get user achievements
      const userAchievements = await getUserAchievements(userId);
      setAchievements(userAchievements);

      // Get rating statistics
      const stats = await getUserRatingStats(userId);
      setRatingStats(stats);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }

    setLoading(false);
  };

  const checkBlockStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase.rpc('is_user_blocked', {
        checker_id: user.id,
        target_id: userId,
      });

      setIsBlocked(data || false);
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const checkFriendship = async () => {
    if (!user) return;
    try {
      const status = await friendService.checkFriendshipStatus(userId, user.id);
      setFriendshipStatus(status);
    } catch (error) {
      console.error('Error checking friendship:', error);
    }
  };

  const handleFriendAction = async () => {
    if (!user) return;
    setActionLoading(true);

    try {
      if (!friendshipStatus) {
        // Send request
        await friendService.sendFriendRequest(userId, user.id);
        Alert.alert('Başarılı', 'Arkadaşlık isteği gönderildi');
      } else if (friendshipStatus.status === 'pending') {
        if (friendshipStatus.is_requester) {
          // Cancel request (need friendship ID, but for now we can use remove logic or fetch ID)
          // Simplification: Use remove_friend which handles deletion regardless of status
          await friendService.removeFriend(userId, user.id);
          Alert.alert('Başarılı', 'İstek iptal edildi');
        } else {
          // Accept request (need friendship ID)
          // We need to fetch the friendship ID first or use a different RPC. 
          // For now, let's assume we can't easily accept without ID from this screen unless we fetch it.
          // Let's re-fetch requests to get ID or use a more robust service method.
          // Actually, let's just use the Friends screen for accepting for now to keep it simple, 
          // OR implement a specific acceptByUserId RPC if needed.
          // But wait, I can just fetch the friendship ID.
          const requests = await friendService.getFriendRequests(user.id);
          const request = requests.find((r: any) => r.requester.id === userId);
          if (request) {
            await friendService.acceptFriendRequest(request.id, user.id);
            Alert.alert('Başarılı', 'Arkadaşlık isteği kabul edildi');
          }
        }
      } else if (friendshipStatus.status === 'accepted') {
        // Remove friend
        Alert.alert('Arkadaşı Sil', 'Arkadaş listenden çıkarmak istiyor musun?', [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              await friendService.removeFriend(userId, user.id);
              checkFriendship();
            }
          }
        ]);
        setActionLoading(false);
        return;
      }

      await checkFriendship();
    } catch (error: any) {
      console.error('Friend action error:', error);
      Alert.alert('Hata', error.message || 'İşlem gerçekleştirilemedi');
    }

    setActionLoading(false);
  };

  const handleBlock = async () => {
    if (!user || !profile) return;

    Alert.alert(
      'Kullanıcıyı Engelle',
      `${profile.full_name} kullanıcısını engellemek istediğinizden emin misiniz? Bu kullanıcı size mesaj gönderemeyecek ve etkinliklerinize katılamayacak.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);

            try {
              const { error } = await supabase.rpc('block_user', {
                p_blocker_id: user.id,
                p_blocked_id: userId,
                p_reason: 'Kullanıcı tarafından engellendi',
              });

              if (error) {
                console.error('Error blocking user:', error);
                Alert.alert('Hata', 'Kullanıcı engellenirken bir hata oluştu.');
              } else {
                Alert.alert('Başarılı', `${profile.full_name} engellendi.`, [
                  {
                    text: 'Tamam',
                    onPress: () => navigation.goBack(),
                  },
                ]);
                setIsBlocked(true);
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Hata', 'Kullanıcı engellenirken bir hata oluştu.');
            }

            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleUnblock = async () => {
    if (!user || !profile) return;

    Alert.alert(
      'Engeli Kaldır',
      `${profile.full_name} kullanıcısının engelini kaldırmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Engeli Kaldır',
          onPress: async () => {
            setActionLoading(true);

            try {
              const { error } = await supabase.rpc('unblock_user', {
                p_blocker_id: user.id,
                p_blocked_id: userId,
              });

              if (error) {
                console.error('Error unblocking user:', error);
                Alert.alert('Hata', 'Engel kaldırılırken bir hata oluştu.');
              } else {
                Alert.alert('Başarılı', `${profile.full_name} engeliniz kaldırıldı.`);
                setIsBlocked(false);
              }
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Hata', 'Engel kaldırılırken bir hata oluştu.');
            }

            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleReport = () => {
    if (!profile) return;
    navigation.navigate('ReportUser', {
      userId: userId,
      userName: profile.full_name,
    });
  };

  const renderFriendButton = () => {
    if (isBlocked) return null;

    let icon = 'account-plus';
    let label = 'Arkadaş Ekle';
    let mode: 'contained' | 'outlined' = 'contained';
    let color = undefined;

    if (friendshipStatus) {
      if (friendshipStatus.status === 'accepted') {
        icon = 'account-check';
        label = 'Arkadaş';
        mode = 'outlined';
        color = '#4CAF50';
      } else if (friendshipStatus.status === 'pending') {
        if (friendshipStatus.is_requester) {
          icon = 'account-clock';
          label = 'İstek Gönderildi';
          mode = 'outlined';
        } else {
          icon = 'account-question';
          label = 'İsteği Kabul Et';
          mode = 'contained';
          color = '#2196F3';
        }
      }
    }

    return (
      <Button
        mode={mode}
        icon={icon}
        onPress={handleFriendAction}
        loading={actionLoading}
        disabled={actionLoading}
        style={styles.actionButton}
        textColor={color}
      >
        {label}
      </Button>
    );
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

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  const memberSince = new Date(profile.created_at).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            {profile.avatar_url ? (
              <Avatar.Image size={80} source={{ uri: profile.avatar_url }} />
            ) : (
              <Avatar.Text size={80} label={profile.full_name?.charAt(0) || 'U'} />
            )}

            <View style={styles.headerInfo}>
              <Text style={styles.name}>{profile.full_name}</Text>
              <Text style={styles.memberSince}>Üye: {memberSince}</Text>
              {profile.location && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
                  <Text style={styles.location}>{profile.location}</Text>
                </View>
              )}
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
            <View style={styles.bioContainer}>
              <Text style={styles.bioLabel}>Hakkında</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.actions}>
            {renderFriendButton()}

            {isBlocked ? (
              <Button
                mode="outlined"
                icon="account-check"
                onPress={handleUnblock}
                disabled={actionLoading}
                style={styles.actionButton}
              >
                Engeli Kaldır
              </Button>
            ) : (
              <Button
                mode="outlined"
                icon="block-helper"
                onPress={handleBlock}
                disabled={actionLoading}
                style={styles.actionButton}
                textColor="#f44336"
              >
                Engelle
              </Button>
            )}

            <Button
              mode="outlined"
              icon="flag"
              onPress={handleReport}
              style={styles.actionButton}
              textColor="#ff9800"
            >
              Şikayet Et
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Rating Stats Card */}
      {ratingStats.totalRatings > 0 && (
        <Animated.View
          style={{
            opacity: statsCardAnim,
            transform: [
              {
                scale: statsCardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          }}
        >
          <Surface style={styles.statsCard} elevation={3}>
            <LinearGradient
              colors={[theme.colors.primary + '08', theme.colors.primary + '03']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsGradient}
            >
              <View style={styles.statsTitleRow}>
                <MaterialCommunityIcons name="chart-box" size={24} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>İstatistikler</Text>
              </View>

              <View style={styles.statsGrid}>
                <Surface style={styles.statItem} elevation={1}>
                  <LinearGradient
                    colors={['#FFD70015', '#FFD70008']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statGradient}
                  >
                    <View style={styles.statIconContainer}>
                      <MaterialCommunityIcons name="star" size={36} color="#FFD700" />
                    </View>
                    <Text style={styles.statValue}>{ratingStats.averageRating.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Ortalama</Text>
                  </LinearGradient>
                </Surface>

                <Surface style={styles.statItem} elevation={1}>
                  <LinearGradient
                    colors={[theme.colors.primary + '15', theme.colors.primary + '08']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statGradient}
                  >
                    <View style={styles.statIconContainer}>
                      <MaterialCommunityIcons name="account-star" size={36} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{ratingStats.totalRatings}</Text>
                    <Text style={styles.statLabel}>Toplam</Text>
                  </LinearGradient>
                </Surface>

                <Surface style={styles.statItem} elevation={1}>
                  <LinearGradient
                    colors={['#4CAF5015', '#4CAF5008']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statGradient}
                  >
                    <View style={styles.statIconContainer}>
                      <MaterialCommunityIcons name="thumb-up" size={36} color="#4CAF50" />
                    </View>
                    <Text style={styles.statValue}>{ratingStats.positiveReviewsCount}</Text>
                    <Text style={styles.statLabel}>Olumlu</Text>
                  </LinearGradient>
                </Surface>
              </View>

            {/* Rating Distribution */}
            <View style={styles.distributionContainer}>
              <Text style={styles.distributionTitle}>Puan Dağılımı</Text>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingStats.ratingDistribution[star] || 0;
                const percentage = ratingStats.totalRatings > 0
                  ? (count / ratingStats.totalRatings) * 100
                  : 0;
                return (
                  <View key={star} style={styles.distributionRow}>
                    <Text style={styles.starLabel}>{star}</Text>
                    <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          { width: `${percentage}%`, backgroundColor: theme.colors.primary }
                        ]}
                      />
                    </View>
                    <Text style={styles.countLabel}>{count}</Text>
                  </View>
                );
              })}
            </View>
            </LinearGradient>
          </Surface>
        </Animated.View>
      )}

      {/* Badges Card */}
      {ratingStats.positiveReviewsCount > 0 && (
        <Surface style={styles.badgesCard} elevation={3}>
          <LinearGradient
            colors={[theme.colors.primary + '05', theme.colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.badgesGradient}
          >
            <View style={styles.badgesTitleRow}>
              <MaterialCommunityIcons name="trophy-award" size={24} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Rozetler</Text>
            </View>

            <View style={styles.badgeContainer}>
              {(() => {
                const badgeInfo = getBadgeLevel(ratingStats.positiveReviewsCount);
                const rotate = badgeRotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                });

                return (
                  <View style={styles.mainBadge}>
                    {/* Glow effect background */}
                    <Animated.View
                      style={[
                        styles.badgeGlowEffect,
                        {
                          backgroundColor: badgeInfo.color + '30',
                          transform: [{ scale: badgePulseAnim }],
                        },
                      ]}
                    />

                    {/* Rotating border */}
                    <Animated.View style={[styles.badgeRotatingBorder, { transform: [{ rotate }] }]}>
                      <LinearGradient
                        colors={[badgeInfo.color + '80', badgeInfo.color + '20', badgeInfo.color + '80']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeRotatingGradient}
                      />
                    </Animated.View>

                    {/* Badge Circle */}
                    <Animated.View
                      style={[
                        styles.badgeCircle,
                        { transform: [{ scale: badgePulseAnim }] },
                      ]}
                    >
                      <LinearGradient
                        colors={[badgeInfo.color, badgeInfo.color + 'DD']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeGradient}
                      >
                        <MaterialCommunityIcons
                          name={badgeInfo.icon}
                          size={52}
                          color="#FFFFFF"
                          style={styles.badgeIcon}
                        />
                      </LinearGradient>
                    </Animated.View>

                    <Text style={[styles.badgeTitle, { color: badgeInfo.color }]}>
                      {badgeInfo.level}
                    </Text>
                    <View style={styles.badgeSubtitleRow}>
                      <MaterialCommunityIcons name="thumb-up" size={16} color={badgeInfo.color} />
                      <Text style={[styles.badgeSubtitle, { color: badgeInfo.color + 'CC' }]}>
                        {ratingStats.positiveReviewsCount} Olumlu Değerlendirme
                      </Text>
                    </View>

                    {badgeInfo.nextMilestone && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBarContainer}>
                          <LinearGradient
                            colors={['#e0e0e0', '#f5f5f5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.progressBar}
                          >
                            <LinearGradient
                              colors={[badgeInfo.color, badgeInfo.color + 'CC']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[
                                styles.progressFill,
                                {
                                  width: `${(ratingStats.positiveReviewsCount / badgeInfo.nextMilestone) * 100}%`,
                                },
                              ]}
                            />
                          </LinearGradient>
                        </View>
                        <Text style={styles.progressText}>
                          <Text style={styles.progressTextBold}>
                            {badgeInfo.nextMilestone - ratingStats.positiveReviewsCount}
                          </Text>
                          {' '}değerlendirme sonraki seviye!
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>

            {/* Other Achievements */}
            {achievements.length > 0 && (
              <>
                <Divider style={styles.achievementDivider} />
                <View style={styles.achievementTitleRow}>
                  <MaterialCommunityIcons name="medal" size={20} color={theme.colors.primary} />
                  <Text style={styles.achievementTitle}>Kazanılan Başarılar</Text>
                </View>
                <View style={styles.achievementsGrid}>
                  {achievements.slice(0, 6).map((userAchievement) => {
                    const achievement = userAchievement.achievement;
                    if (!achievement) return null;
                    return (
                      <Surface key={userAchievement.id} style={styles.achievementItem} elevation={1}>
                        <LinearGradient
                          colors={[achievement.color + '20' || theme.colors.primary + '20', achievement.color + '10' || theme.colors.primary + '10']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.achievementGradient}
                        >
                          <View style={[styles.achievementIcon, { backgroundColor: achievement.color || theme.colors.primary }]}>
                            <MaterialCommunityIcons
                              name={achievement.icon || 'trophy'}
                              size={26}
                              color="#FFFFFF"
                            />
                          </View>
                          <Text style={styles.achievementName} numberOfLines={2}>
                            {achievement.name}
                          </Text>
                        </LinearGradient>
                      </Surface>
                    );
                  })}
                </View>
                {achievements.length > 6 && (
                  <View style={styles.moreAchievementsContainer}>
                    <MaterialCommunityIcons name="dots-horizontal" size={18} color={theme.colors.primary} />
                    <Text style={[styles.moreAchievements, { color: theme.colors.primary }]}>
                      +{achievements.length - 6} başarı daha
                    </Text>
                  </View>
                )}
              </>
            )}
          </LinearGradient>
        </Surface>
      )}

      {ratings.length > 0 && (
        <Card style={styles.ratingsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
            {ratings.map((rating) => (
              <View key={rating.id} style={styles.ratingItem}>
                <View style={styles.ratingHeader}>
                  {rating.rater.avatar_url ? (
                    <Avatar.Image size={40} source={{ uri: rating.rater.avatar_url }} />
                  ) : (
                    <Avatar.Text size={40} label={rating.rater.full_name?.charAt(0) || 'U'} />
                  )}
                  <View style={styles.ratingInfo}>
                    <Text style={styles.raterName}>{rating.rater.full_name}</Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialCommunityIcons
                          key={star}
                          name={star <= rating.rating ? 'star' : 'star-outline'}
                          size={16}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.ratingDate}>
                    {new Date(rating.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                {rating.comment && <Text style={styles.ratingComment}>{rating.comment}</Text>}
                <Divider style={styles.ratingDivider} />
              </View>
            ))}
          </Card.Content>
        </Card>
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bioContainer: {
    marginVertical: 10,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  ratingsCard: {
    margin: 15,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  ratingItem: {
    marginBottom: 10,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingInfo: {
    marginLeft: 10,
    flex: 1,
  },
  raterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stars: {
    flexDirection: 'row',
    marginTop: 4,
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
  },
  ratingComment: {
    fontSize: 14,
    color: '#666',
    marginLeft: 50,
    marginTop: 4,
    lineHeight: 20,
  },
  ratingDivider: {
    marginTop: 10,
  },
  statsCard: {
    margin: 15,
    marginTop: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
  },
  statsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    alignItems: 'center',
    padding: 16,
    paddingVertical: 20,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  distributionContainer: {
    marginTop: 10,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starLabel: {
    fontSize: 14,
    color: '#333',
    width: 20,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginLeft: 8,
    marginRight: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  countLabel: {
    fontSize: 12,
    color: '#666',
    width: 30,
    textAlign: 'right',
  },
  badgesCard: {
    margin: 15,
    marginTop: 0,
    borderRadius: 24,
    overflow: 'hidden',
  },
  badgesGradient: {
    padding: 20,
  },
  badgesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  badgeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  mainBadge: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  badgeGlowEffect: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 0,
  },
  badgeRotatingBorder: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: 10,
  },
  badgeRotatingGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  badgeCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  badgeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badgeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  badgeSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  badgeSubtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 19,
  },
  progressTextBold: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  achievementDivider: {
    marginVertical: 24,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.3,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementItem: {
    width: '30%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  achievementGradient: {
    alignItems: 'center',
    padding: 12,
    paddingVertical: 16,
  },
  achievementIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  achievementName: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '600',
  },
  moreAchievementsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  moreAchievements: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});
