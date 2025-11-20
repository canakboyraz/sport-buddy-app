import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Card,
  Text,
  ActivityIndicator,
  Avatar,
  Button,
  Divider,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { friendService, FriendshipStatus } from '../../services/friendService';

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
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus | null>(null);

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
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select(`
          id,
          rating,
          comment,
          created_at,
          rater:profiles!ratings_rater_user_id_fkey(full_name, avatar_url)
        `)
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ratingsError) {
        console.error('[UserProfileScreen] Error loading ratings:', ratingsError);
      }
      setRatings(ratingsData || []);
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
});
