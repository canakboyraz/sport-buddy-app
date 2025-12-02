import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, Linking, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Avatar, Chip, ActivityIndicator, Divider, Portal, Modal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { SportSession, SessionParticipant } from '../../types';
import { format } from 'date-fns';
import { getDateLocale } from '../../utils/dateLocale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import WeatherCard from '../../components/WeatherCard';
import { scheduleSessionReminders, cancelSessionReminders, sendParticipantJoinedNotification, scheduleLocalNotification } from '../../services/notificationService';
import { getBadgeLevel } from '../../services/ratingService';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSkillLevelLabel } from '../../utils/skillLevelUtils';
import { hasBlockRelationship } from '../../services/blockService';

let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

type SessionDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SessionDetail'>;
type SessionDetailScreenRouteProp = RouteProp<RootStackParamList, 'SessionDetail'>;

type Props = {
  navigation: SessionDetailScreenNavigationProp;
  route: SessionDetailScreenRouteProp;
};

export default function SessionDetailScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [session, setSession] = useState<SportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [myRatings, setMyRatings] = useState<{ [userId: string]: { rating: number; comment: string | null } }>({});

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('sport_sessions')
        .select(`
          *,
          creator:profiles!sport_sessions_creator_id_fkey(
            id,
            email,
            full_name,
            phone,
            bio,
            avatar_url,
            created_at,
            average_rating,
            total_ratings,
            positive_reviews_count
          ),
          sport:sports(*),
          participants:session_participants(
            id,
            session_id,
            user_id,
            status,
            user:profiles(
              id,
              email,
              full_name,
              avatar_url,
              average_rating,
              total_ratings,
              positive_reviews_count
            )
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('[SessionDetail] Error loading session:', error);
        console.error('[SessionDetail] Session ID:', sessionId);
        Alert.alert(t('common.error'), `${t('session.loadError')}: ${error.message}`);
        setSession(null);
      } else if (data) {
        console.log('[SessionDetail] Session loaded successfully:', data.id);
        console.log('[SessionDetail] Creator data:', data.creator);
        setSession(data as SportSession);

        // Load user's ratings for this session
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          console.log('[SessionDetail] Loading ratings for user:', authUser.id, 'session:', sessionId);

          const { data: ratingsData, error: ratingsError } = await supabase
            .from('ratings')
            .select('rated_user_id, rating, comment')
            .eq('session_id', sessionId)
            .eq('rater_user_id', authUser.id);

          if (ratingsError) {
            console.error('[SessionDetail] Error loading ratings:', ratingsError);
          } else {
            console.log('[SessionDetail] Loaded ratings data:', ratingsData);
            console.log('[SessionDetail] Number of ratings found:', ratingsData?.length || 0);
          }

          if (ratingsData && ratingsData.length > 0) {
            const ratingsMap: { [userId: string]: { rating: number; comment: string | null } } = {};
            ratingsData.forEach((r: any) => {
              console.log('[SessionDetail] Processing rating for user:', r.rated_user_id);
              ratingsMap[r.rated_user_id] = {
                rating: r.rating,
                comment: r.comment,
              };
            });
            console.log('[SessionDetail] Final ratings map:', ratingsMap);
            setMyRatings(ratingsMap);
          } else {
            console.log('[SessionDetail] No ratings found, setting empty map');
            setMyRatings({});
          }
        } else {
          console.log('[SessionDetail] No authenticated user found');
        }
      }
    } catch (err) {
      console.error('[SessionDetail] Unexpected error:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!user || !session) return;

    setActionLoading(true);

    // Check if there's a block relationship
    const isBlocked = await hasBlockRelationship(user.id, session.creator_id);

    if (isBlocked) {
      setActionLoading(false);
      Alert.alert(
        t('session.cannotJoin'),
        t('session.blockedRelationship')
      );
      return;
    }

    const { error } = await supabase.from('session_participants').insert({
      session_id: session.id,
      user_id: user.id,
      status: 'pending',
    });

    setActionLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      // Send push notification to session creator
      try {
        // Only send notification if current user is NOT the creator
        if (session.creator_id !== user.id) {
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', session.creator_id)
            .single();

          const participantName = currentUserProfile?.full_name || currentUserProfile?.email || t('common.unknown');

          if (creatorProfile?.push_token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: creatorProfile.push_token,
                title: '🔔 ' + t('session.pendingRequests'),
                body: `${participantName} "${session.title}" ${t('session.joinRequestSent')}`,
                data: {
                  type: 'join_request',
                  sessionId: session.id,
                  userId: user.id,
                },
              }),
            });
          }
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
        // Don't block the join request if notification fails
      }

      Alert.alert(t('common.success'), t('session.joinRequestSent'));
      loadSession();
    }
  };

  const handleApprove = async (participantId: number) => {
    setActionLoading(true);

    const { data: participant, error: fetchError } = await supabase
      .from('session_participants')
      .select('user_id, user:profiles(full_name)')
      .eq('id', participantId)
      .single();

    const { error } = await supabase
      .from('session_participants')
      .update({ status: 'approved' })
      .eq('id', participantId);

    setActionLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), t('session.participantApproved'));

      // Schedule reminders for the approved participant if they are the current user
      if (session && participant && participant.user_id === user?.id) {
        try {
          await scheduleSessionReminders(
            session.id,
            session.title,
            session.session_date,
            session.location
          );
          console.log('[SessionDetail] Scheduled reminders for approved session');
        } catch (err) {
          console.error('[SessionDetail] Failed to schedule reminders:', err);
        }
      }

      // Send push notification to the approved participant
      if (session && participant && participant.user_id !== user?.id) {
        try {
          const { data: participantProfile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', participant.user_id)
            .single();

          if (participantProfile?.push_token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: participantProfile.push_token,
                title: '✅ ' + t('session.joinRequestApproved'),
                body: `"${session.title}" ${t('session.joinRequestApproved')}`,
                data: {
                  type: 'join_approved',
                  sessionId: session.id,
                },
              }),
            });
          }
        } catch (err) {
          console.error('[SessionDetail] Failed to send notification:', err);
        }
      }

      loadSession();
    }
  };

  const handleReject = async (participantId: number) => {
    setActionLoading(true);

    const { error } = await supabase
      .from('session_participants')
      .delete()
      .eq('id', participantId);

    setActionLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), t('session.participantRejected'));
      loadSession();
    }
  };

  const handleLocationPress = () => {
    if (session?.latitude && session?.longitude) {
      if (Platform.OS === 'web') {
        const url = `https://www.google.com/maps/search/?api=1&query=${session.latitude},${session.longitude}`;
        Linking.openURL(url);
      } else {
        setMapVisible(true);
      }
    }
  };

  const handleUserClick = (userId: string, userName?: string) => {
    if (userId === user?.id) return; // Don't navigate for current user

    if (!userId) {
      Alert.alert(t('common.error'), t('session.errors.userNotFound'));
      return;
    }

    // Navigate directly to user profile
    navigation.navigate('ProfileDetail', { userId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('session.notFound')}</Text>
      </View>
    );
  }

  const isCreator = session.creator_id === user?.id;
  const approvedParticipants = session.participants?.filter(p => p.status === 'approved') || [];
  const pendingParticipants = session.participants?.filter(p => p.status === 'pending') || [];
  const userParticipant = session.participants?.find(p => p.user_id === user?.id);
  const isFull = approvedParticipants.length >= session.max_participants;
  const isPast = new Date(session.session_date) < new Date();

  // Include creator in the list of people that can be rated (if not already a participant)
  const allRatableParticipants = [...approvedParticipants];
  const creatorIsAlsoParticipant = approvedParticipants.some(p => p.user_id === session.creator_id);
  if (!creatorIsAlsoParticipant && session.creator) {
    // Add creator as a pseudo-participant for display and rating purposes
    allRatableParticipants.unshift({
      id: `creator-${session.creator_id}`,
      session_id: session.id,
      user_id: session.creator_id,
      status: 'approved' as const,
      user: session.creator,
      created_at: session.created_at,
    } as any);
  }

  // Debug logging for rating display issue
  console.log('[SessionDetail] Debug Info:');
  console.log('  - isPast:', isPast);
  console.log('  - session_date:', session.session_date);
  console.log('  - current date:', new Date());
  console.log('  - userParticipant:', userParticipant);
  console.log('  - userParticipant status:', userParticipant?.status);
  console.log('  - myRatings:', myRatings);
  console.log('  - approvedParticipants count:', approvedParticipants.length);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card} mode="elevated">
        {/* Modern Gradient Header */}
        <LinearGradient
          colors={
            theme.dark
              ? [theme.colors.primaryContainer, theme.colors.secondaryContainer]
              : ['#6200ee', '#9c27b0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <Text style={styles.title}>{session.title}</Text>
          <View style={styles.headerBadges}>
            <Chip icon="soccer" textStyle={styles.headerChipText} style={styles.headerChip}>
              {session.sport?.name}
            </Chip>
            <Chip icon="star" textStyle={styles.headerChipText} style={styles.headerChip}>
              {getSkillLevelLabel(session.skill_level, t)}
            </Chip>
          </View>
        </LinearGradient>

        <Card.Content style={styles.cardContent}>
          {/* Compact Info Grid */}
          <View style={styles.infoGrid}>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryContainer + '40' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color={theme.colors.primary} />
              <Text style={[styles.infoBoxLabel, { color: theme.colors.onSurfaceVariant }]}>{t('session.dateAndTime')}</Text>
              <Text style={[styles.infoBoxValue, { color: theme.colors.onSurface }]}>
                {format(new Date(session.session_date), 'd MMM yyyy', { locale: getDateLocale() })}
              </Text>
              <Text style={[styles.infoBoxSubvalue, { color: theme.colors.onSurfaceVariant }]}>
                {format(new Date(session.session_date), 'HH:mm', { locale: getDateLocale() })}
              </Text>
            </View>

            <View style={[styles.infoBox, { backgroundColor: theme.colors.secondaryContainer + '40' }]}>
              <MaterialCommunityIcons name="account-multiple" size={18} color={theme.colors.primary} />
              <Text style={[styles.infoBoxLabel, { color: theme.colors.onSurfaceVariant }]}>{t('session.participantsCount')}</Text>
              <Text style={[styles.infoBoxValue, { color: theme.colors.onSurface }]}>
                {approvedParticipants.length}/{session.max_participants}
              </Text>
              <Text style={[styles.infoBoxSubvalue, { color: theme.colors.onSurfaceVariant }]}>
                {isFull ? t('session.full') : t('session.available')}
              </Text>
            </View>
          </View>

          {/* Location */}
          <TouchableOpacity
            style={[styles.locationCard, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={handleLocationPress}
            disabled={!session.latitude || !session.longitude}
          >
            <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationLabel, { color: theme.colors.onSurfaceVariant }]}>{t('session.locationLabel')}</Text>
              <Text style={[styles.locationText, { color: theme.colors.onSurface }]} numberOfLines={2}>
                {session.location}
              </Text>
              {session.city && (
                <Text style={[styles.cityText, { color: theme.colors.onSurfaceVariant }]}>{session.city}</Text>
              )}
            </View>
            {session.latitude && session.longitude && (
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          {/* Weather Forecast */}
          {session.latitude && session.longitude && (
            <>
              <Divider style={styles.divider} />
              <WeatherCard
                latitude={session.latitude}
                longitude={session.longitude}
                sessionDate={new Date(session.session_date)}
                compact={false}
                sportName={session.sport?.name}
              />
            </>
          )}

          {session.description && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.descriptionLabel}>{t('session.descriptionLabel')}</Text>
              <Text style={styles.description}>{session.description}</Text>
            </>
          )}

          <Divider style={styles.divider} />
          <View style={styles.creatorHeaderRow}>
            <Text style={styles.creatorLabel}>{t('session.createdBy')}</Text>
            {!isCreator && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ReportUser', {
                  userId: session.creator_id,
                  userName: session.creator?.full_name || t('session.creator')
                })}
                style={styles.reportButton}
              >
                <MaterialCommunityIcons name="flag-outline" size={20} color={theme.colors.error} />
                <Text style={[styles.reportText, { color: theme.colors.error }]}>
                  {t('common.report')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.creatorRow}
            onPress={() => handleUserClick(session.creator_id, session.creator?.full_name)}
          >
            {session.creator?.avatar_url ? (
              <Avatar.Image size={40} source={{ uri: session.creator.avatar_url }} />
            ) : (
              <Avatar.Text size={40} label={session.creator?.full_name?.charAt(0) || 'U'} />
            )}
            <Text style={styles.creatorName}>{session.creator?.full_name || session.creator?.email || t('session.creator')}</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {!isCreator && !userParticipant && !isFull && !isPast && (
        <Button
          mode="contained"
          onPress={handleJoinRequest}
          loading={actionLoading}
          disabled={actionLoading}
          style={styles.joinButton}
        >
          {t('session.joinRequest')}
        </Button>
      )}

      {userParticipant && userParticipant.status === 'pending' && (
        <Chip icon="clock" style={styles.statusChip}>
          {t('session.joinRequestPending')}
        </Chip>
      )}

      {userParticipant && userParticipant.status === 'approved' && (
        <>
          <Chip icon="check" style={styles.statusChip}>
            {t('session.joinRequestApproved')}
          </Chip>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Chat', { sessionId: session.id })}
            style={styles.chatButton}
            icon="chat"
          >
            {t('session.goToChat')}
          </Button>
        </>
      )}

      {isCreator && (
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Chat', { sessionId: session.id })}
          style={styles.chatButton}
          icon="chat"
        >
          {t('session.goToChat')}
        </Button>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{t('session.participantsWithCount', { count: allRatableParticipants.length })}</Text>
          {allRatableParticipants.map((participant) => {
            const userProfile = participant.user;
            const averageRating = userProfile?.average_rating || 0;
            const totalRatings = userProfile?.total_ratings || 0;
            const positiveReviews = userProfile?.positive_reviews_count || 0;
            const badgeInfo = getBadgeLevel(positiveReviews);
            const displayName = participant.user?.full_name || participant.user?.email || t('session.participantsCount');
            const avatarLabel = (participant.user?.full_name || participant.user?.email || 'U').charAt(0).toUpperCase();
            const isSessionCreator = participant.user_id === session.creator_id;

            return (
              <View key={participant.id} style={styles.participantRow}>
                <TouchableOpacity
                  style={styles.participantInfo}
                  onPress={() => handleUserClick(participant.user_id, displayName)}
                >
                  {participant.user?.avatar_url ? (
                    <Avatar.Image size={40} source={{ uri: participant.user.avatar_url }} />
                  ) : (
                    <Avatar.Text size={40} label={avatarLabel} />
                  )}
                  <View style={styles.participantDetails}>
                    <View style={styles.participantNameRow}>
                      <Text style={styles.participantName}>{displayName}</Text>
                      {isSessionCreator && (
                        <Chip
                          icon="crown"
                          mode="flat"
                          compact
                          style={{ backgroundColor: theme.colors.primaryContainer, height: 20, marginLeft: 6 }}
                          textStyle={{ color: theme.colors.primary, fontSize: 10, marginVertical: 0 }}
                        >
                          {t('session.organizer')}
                        </Chip>
                      )}
                      {positiveReviews >= 3 && (
                        <MaterialCommunityIcons
                          name={badgeInfo.icon}
                          size={18}
                          color={badgeInfo.color}
                          style={styles.badgeIcon}
                        />
                      )}
                    </View>
                    {totalRatings > 0 && (
                      <View style={styles.ratingRow}>
                        <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>
                          {averageRating.toFixed(1)} ({totalRatings})
                        </Text>
                        {positiveReviews >= 3 && (
                          <Text style={[styles.badgeText, { color: badgeInfo.color }]}>
                            • {badgeInfo.level}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                {isPast && participant.user_id !== user?.id && (isCreator || userParticipant?.status === 'approved') && (
                  myRatings[participant.user_id] ? (
                    <View style={styles.ratedBadgeContainer}>
                      <Chip
                        icon="check-circle"
                        mode="flat"
                        style={[styles.ratedChip, { backgroundColor: theme.colors.primaryContainer }]}
                        textStyle={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}
                      >
                        {t('session.rated')}
                      </Chip>
                      <View style={styles.ratingStarsSmall}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialCommunityIcons
                            key={star}
                            name={star <= myRatings[participant.user_id].rating ? 'star' : 'star-outline'}
                            size={14}
                            color="#FFD700"
                          />
                        ))}
                      </View>
                    </View>
                  ) : (
                    <Button
                      mode="contained"
                      compact
                      icon="star"
                      style={styles.rateButton}
                      onPress={() =>
                        navigation.navigate('RateUser', {
                          sessionId: session.id,
                          userId: participant.user_id,
                          userName: displayName,
                        })
                      }
                    >
                      {t('session.rateUser')}
                    </Button>
                  )
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {isCreator && pendingParticipants.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>{t('session.pendingRequestsCount', { count: pendingParticipants.length })}</Text>
            {pendingParticipants.map((participant) => {
              const userName = participant.user?.full_name || participant.user?.email || t('session.participantsCount');
              const userInitial = (participant.user?.full_name || participant.user?.email || 'U').charAt(0).toUpperCase();

              return (
                <View key={participant.id} style={styles.participantRow}>
                  <TouchableOpacity
                    style={styles.participantInfo}
                    onPress={() => handleUserClick(participant.user_id, userName)}
                  >
                    {participant.user?.avatar_url ? (
                      <Avatar.Image size={36} source={{ uri: participant.user.avatar_url }} />
                    ) : (
                      <Avatar.Text size={36} label={userInitial} />
                    )}
                    <Text style={styles.participantName}>{userName}</Text>
                  </TouchableOpacity>
                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      compact
                      onPress={() => handleApprove(participant.id)}
                      disabled={actionLoading || isFull}
                      style={styles.approveButton}
                    >
                      {t('session.approveShort')}
                    </Button>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => handleReject(participant.id)}
                      disabled={actionLoading}
                    >
                      {t('session.rejectShort')}
                    </Button>
                  </View>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {Platform.OS !== 'web' && session && session.latitude && session.longitude && (
        <Portal>
          <Modal visible={mapVisible} onDismiss={() => setMapVisible(false)} contentContainerStyle={styles.mapModal}>
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>{t('session.locationLabel')}</Text>
              {MapView && (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: session.latitude,
                    longitude: session.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  {Marker && (
                    <Marker
                      coordinate={{
                        latitude: session.latitude,
                        longitude: session.longitude,
                      }}
                      title={session.title}
                      description={session.location}
                    />
                  )}
                </MapView>
              )}
              <Button mode="contained" onPress={() => setMapVisible(false)} style={styles.closeMapButton}>
                {t('session.close')}
              </Button>
            </View>
          </Modal>
        </Portal>
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
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 10,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  headerChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    paddingTop: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  infoBoxLabel: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  infoBoxValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  infoBoxSubvalue: {
    fontSize: 10,
    marginTop: 2,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  cityText: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  creatorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  creatorLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reportText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: '500',
  },
  joinButton: {
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 10,
  },
  chatButton: {
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 10,
  },
  statusChip: {
    alignSelf: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 3,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantDetails: {
    flex: 1,
    marginLeft: 10,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
  },
  badgeIcon: {
    marginLeft: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  approveButton: {
    marginRight: 5,
    borderRadius: 8,
  },
  ratedBadgeContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ratedChip: {
    height: 28,
  },
  ratingStarsSmall: {
    flexDirection: 'row',
    gap: 2,
  },
  rateButton: {
    borderRadius: 8,
  },
  linkText: {
    color: '#6200ee',
    textDecorationLine: 'underline',
  },
  openIcon: {
    marginLeft: 5,
  },
  mapModal: {
    margin: 20,
  },
  mapContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  map: {
    height: 300,
    borderRadius: 8,
    marginBottom: 15,
  },
  closeMapButton: {
    marginTop: 10,
  },
});
