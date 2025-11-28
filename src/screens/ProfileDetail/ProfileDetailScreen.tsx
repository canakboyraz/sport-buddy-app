import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, Surface, ActivityIndicator, Card, Divider, Chip, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { format } from 'date-fns';
import { getDateLocale } from '../../utils/dateLocale';

const { width } = Dimensions.get('window');

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  average_rating: number | null;
  total_ratings: number;
  positive_reviews_count: number;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  rater: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export default function ProfileDetailScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [stats, setStats] = useState({
    sessionsCreated: 0,
    sessionsAttended: 0,
  });

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        setProfile(profileData);
      }

      // Load ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select(`
          id,
          rating,
          comment,
          created_at,
          rater:profiles!ratings_rater_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!ratingsError && ratingsData) {
        setRatings(ratingsData as any);
      }

      // Load statistics
      const { count: createdCount } = await supabase
        .from('sport_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId);

      const { count: attendedCount } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'approved');

      setStats({
        sessionsCreated: createdCount || 0,
        sessionsAttended: attendedCount || 0,
      });

      // Load friendship status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status, user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .single();

        if (friendship) {
          setFriendshipStatus(friendship.status as any);
        } else {
          setFriendshipStatus('none');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async () => {
    setFriendshipLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: userId,
          status: 'pending',
        });

      if (error) {
        console.error('Error sending friend request:', error);
        alert('Arkadaşlık isteği gönderilemedi');
      } else {
        setFriendshipStatus('pending');

        // Send notification to the friend
        try {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', userId)
            .single();

          if (receiverProfile?.push_token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: receiverProfile.push_token,
                title: 'Yeni Arkadaşlık İsteği',
                body: `${senderProfile?.full_name || 'Bir kullanıcı'} size arkadaşlık isteği gönderdi`,
                data: {
                  type: 'friend_request',
                  userId: user.id,
                },
              }),
            });
          }
        } catch (notifError) {
          console.error('Error sending friend request notification:', notifError);
        }

        alert('Arkadaşlık isteği gönderildi!');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setFriendshipLoading(false);
    }
  };

  const renderRatingStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color="#FFC107"
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
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
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6200ee', '#9c27b0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={60} color="white" />
            </View>
          )}
        </View>

        {/* User Name */}
        <Text style={styles.userName}>
          {profile.full_name || profile.email}
        </Text>

        {/* Member Since */}
        <Text style={styles.memberSince}>
          Üyelik: {format(new Date(profile.created_at), 'MMM yyyy', { locale: getDateLocale() })}
        </Text>

        {/* Friend Request Button */}
        {friendshipStatus === 'none' && (
          <Button
            mode="contained"
            icon="account-plus"
            onPress={handleFriendRequest}
            loading={friendshipLoading}
            disabled={friendshipLoading}
            style={styles.friendButton}
            labelStyle={{ color: '#fff' }}
          >
            Arkadaş Ekle
          </Button>
        )}
        {friendshipStatus === 'pending' && (
          <Chip icon="clock-outline" style={styles.pendingChip}>
            İstek Gönderildi
          </Chip>
        )}
        {friendshipStatus === 'accepted' && (
          <Chip icon="check" style={styles.acceptedChip}>
            Arkadaş
          </Chip>
        )}

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <MaterialCommunityIcons name="star" size={28} color="#FFC107" />
          <Text style={styles.ratingText}>
            {profile.average_rating ? profile.average_rating.toFixed(1) : 'N/A'}
          </Text>
          <Text style={styles.ratingCount}>
            ({profile.total_ratings} değerlendirme)
          </Text>
        </View>
      </LinearGradient>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <Surface style={styles.statCard} elevation={2}>
          <MaterialCommunityIcons name="trophy" size={32} color="#6200ee" />
          <Text style={styles.statValue}>{stats.sessionsCreated}</Text>
          <Text style={styles.statLabel}>Oluşturulan</Text>
          <Text style={styles.statLabel}>Etkinlik</Text>
        </Surface>

        <Surface style={styles.statCard} elevation={2}>
          <MaterialCommunityIcons name="account-group" size={32} color="#6200ee" />
          <Text style={styles.statValue}>{stats.sessionsAttended}</Text>
          <Text style={styles.statLabel}>Katılınan</Text>
          <Text style={styles.statLabel}>Etkinlik</Text>
        </Surface>

        <Surface style={styles.statCard} elevation={2}>
          <MaterialCommunityIcons name="thumb-up" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{profile.positive_reviews_count}</Text>
          <Text style={styles.statLabel}>Olumlu</Text>
          <Text style={styles.statLabel}>Yorum</Text>
        </Surface>
      </View>

      {/* Bio Section */}
      {profile.bio && (
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={24} color="#6200ee" />
            <Text style={styles.sectionTitle}>Hakkında</Text>
          </View>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </Surface>
      )}

      {/* Ratings & Reviews */}
      <Surface style={styles.section} elevation={1}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="star-box-multiple" size={24} color="#6200ee" />
          <Text style={styles.sectionTitle}>
            Değerlendirmeler ({ratings.length})
          </Text>
        </View>

        {ratings.length === 0 ? (
          <Text style={styles.emptyText}>Henüz değerlendirme yapılmamış</Text>
        ) : (
          ratings.map((rating) => (
            <Card key={rating.id} style={styles.ratingCard}>
              <Card.Content>
                <View style={styles.ratingHeader}>
                  <View style={styles.raterInfo}>
                    {rating.rater.avatar_url ? (
                      <Image
                        source={{ uri: rating.rater.avatar_url }}
                        style={styles.raterAvatar}
                      />
                    ) : (
                      <View style={styles.raterAvatarPlaceholder}>
                        <MaterialCommunityIcons name="account" size={20} color="#666" />
                      </View>
                    )}
                    <View style={styles.raterDetails}>
                      <Text style={styles.raterName}>
                        {rating.rater.full_name || rating.rater.email}
                      </Text>
                      <Text style={styles.ratingDate}>
                        {format(new Date(rating.created_at), 'dd MMM yyyy', { locale: getDateLocale() })}
                      </Text>
                    </View>
                  </View>
                  {renderRatingStars(rating.rating)}
                </View>

                {rating.comment && (
                  <>
                    <Divider style={styles.ratingDivider} />
                    <Text style={styles.ratingComment}>{rating.comment}</Text>
                  </>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </Surface>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  friendButton: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 24,
  },
  pendingChip: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#FFC107',
  },
  acceptedChip: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#4CAF50',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -30,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  bioText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ratingCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  raterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  raterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  raterAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  raterDetails: {
    marginLeft: 12,
    flex: 1,
  },
  raterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingDivider: {
    marginVertical: 12,
  },
  ratingComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
