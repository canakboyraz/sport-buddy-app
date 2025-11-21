import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, Linking, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Avatar, Chip, ActivityIndicator, Divider, Portal, Modal } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession, SessionParticipant } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserQuickActionsModal from '../../components/UserQuickActionsModal';
import WeatherCard from '../../components/WeatherCard';
import { scheduleSessionReminders, cancelSessionReminders, sendParticipantJoinedNotification } from '../../services/notificationService';
import { getBadgeLevel } from '../../services/ratingService';
import { useTheme } from '../../contexts/ThemeContext';

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
  const [session, setSession] = useState<SportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('sport_sessions')
      .select(`
        *,
        creator:profiles!sport_sessions_creator_id_fkey(*),
        sport:sports(*),
        participants:session_participants(
          id,
          session_id,
          user_id,
          status,
          user:profiles(
            id,
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

    setLoading(false);

    if (error) {
      // TODO: Implement proper error logging service (e.g., Sentry)
      setSession(null);
    } else if (data) {
      setSession(data as SportSession);
    }
  };

  const handleJoinRequest = async () => {
    if (!user || !session) return;

    setActionLoading(true);

    const { error } = await supabase.from('session_participants').insert({
      session_id: session.id,
      user_id: user.id,
      status: 'pending',
    });

    setActionLoading(false);

    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Katılım talebiniz gönderildi!');
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
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Katılımcı onaylandı!');

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

      // Notify session creator about new participant
      if (session && participant && participant.user_id !== user?.id) {
        try {
          const participantName = (participant as any).user?.full_name || 'Bir kullanıcı';
          await sendParticipantJoinedNotification(
            session.title,
            participantName,
            session.id
          );
        } catch (err) {
          console.error('[SessionDetail] Failed to send participant notification:', err);
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
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Katılımcı reddedildi');
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

  const handleUserClick = (userId: string, userName: string) => {
    if (userId === user?.id) return; // Don't show modal for current user

    if (!userName || userName === 'Kullanıcı') {
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi');
      return;
    }

    setSelectedUser({ id: userId, name: userName });
    setQuickActionsVisible(true);
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
        <Text>Seans bulunamadı</Text>
      </View>
    );
  }

  const isCreator = session.creator_id === user?.id;
  const approvedParticipants = session.participants?.filter(p => p.status === 'approved') || [];
  const pendingParticipants = session.participants?.filter(p => p.status === 'pending') || [];
  const userParticipant = session.participants?.find(p => p.user_id === user?.id);
  const isFull = approvedParticipants.length >= session.max_participants;
  const isPast = new Date(session.session_date) < new Date();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>{session.title}</Text>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="soccer" size={20} color="#6200ee" />
            <Text style={styles.infoText}>{session.sport?.name}</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={handleLocationPress}
            disabled={!session.latitude || !session.longitude}
          >
            <MaterialCommunityIcons name="map-marker" size={20} color="#6200ee" />
            <Text style={[styles.infoText, (session.latitude && session.longitude) && styles.linkText]}>
              {session.location}
            </Text>
            {session.latitude && session.longitude && (
              <MaterialCommunityIcons name="open-in-new" size={16} color="#6200ee" style={styles.openIcon} />
            )}
          </TouchableOpacity>

          {session.city && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="city" size={20} color="#6200ee" />
              <Text style={styles.infoText}>{session.city}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={20} color="#6200ee" />
            <Text style={styles.infoText}>
              {format(new Date(session.session_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-multiple" size={20} color="#6200ee" />
            <Text style={styles.infoText}>
              {approvedParticipants.length}/{session.max_participants} katılımcı
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="star" size={20} color="#6200ee" />
            <Text style={styles.infoText}>Seviye: {session.skill_level}</Text>
          </View>

          {/* Weather Forecast */}
          {session.latitude && session.longitude && (
            <>
              <Divider style={styles.divider} />
              <WeatherCard
                latitude={session.latitude}
                longitude={session.longitude}
                sessionDate={new Date(session.session_date)}
                compact={false}
              />
            </>
          )}

          {session.description && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.descriptionLabel}>Açıklama:</Text>
              <Text style={styles.description}>{session.description}</Text>
            </>
          )}

          <Divider style={styles.divider} />
          <Text style={styles.creatorLabel}>Oluşturan:</Text>
          <TouchableOpacity
            style={styles.creatorRow}
            onPress={() => handleUserClick(session.creator_id, session.creator?.full_name || 'Kullanıcı')}
          >
            <Avatar.Text size={40} label={session.creator?.full_name?.charAt(0) || 'U'} />
            <Text style={styles.creatorName}>{session.creator?.full_name}</Text>
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
          Katılma İsteği Gönder
        </Button>
      )}

      {userParticipant && userParticipant.status === 'pending' && (
        <Chip icon="clock" style={styles.statusChip}>
          Katılım talebiniz beklemede
        </Chip>
      )}

      {userParticipant && userParticipant.status === 'approved' && (
        <>
          <Chip icon="check" style={styles.statusChip}>
            Katılım onaylandı
          </Chip>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Chat', { sessionId: session.id })}
            style={styles.chatButton}
            icon="chat"
          >
            Sohbete Git
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
          Sohbete Git
        </Button>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Katılımcılar ({approvedParticipants.length})</Text>
          {approvedParticipants.map((participant) => {
            const userProfile = participant.user;
            const averageRating = userProfile?.average_rating || 0;
            const totalRatings = userProfile?.total_ratings || 0;
            const positiveReviews = userProfile?.positive_reviews_count || 0;
            const badgeInfo = getBadgeLevel(positiveReviews);

            return (
              <View key={participant.id} style={styles.participantRow}>
                <TouchableOpacity
                  style={styles.participantInfo}
                  onPress={() => handleUserClick(participant.user_id, participant.user?.full_name || 'Kullanıcı')}
                >
                  <Avatar.Text size={40} label={participant.user?.full_name?.charAt(0) || 'U'} />
                  <View style={styles.participantDetails}>
                    <View style={styles.participantNameRow}>
                      <Text style={styles.participantName}>{participant.user?.full_name}</Text>
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
                {isPast && participant.user_id !== user?.id && userParticipant?.status === 'approved' && (
                  <Button
                    mode="outlined"
                    compact
                    onPress={() =>
                      navigation.navigate('RateUser', {
                        sessionId: session.id,
                        userId: participant.user_id,
                        userName: participant.user?.full_name || 'Kullanıcı',
                      })
                    }
                  >
                    Değerlendir
                  </Button>
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {isCreator && pendingParticipants.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Bekleyen Talepler ({pendingParticipants.length})</Text>
            {pendingParticipants.map((participant) => {
              const userName = participant.user?.full_name || 'Kullanıcı';
              const userInitial = userName.charAt(0).toUpperCase();

              console.log('Pending participant:', participant);
              console.log('User data:', participant.user);

              return (
                <View key={participant.id} style={styles.participantRow}>
                  <TouchableOpacity
                    style={styles.participantInfo}
                    onPress={() => handleUserClick(participant.user_id, userName)}
                  >
                    <Avatar.Text size={36} label={userInitial} />
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
                      Onayla
                    </Button>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => handleReject(participant.id)}
                      disabled={actionLoading}
                    >
                      Reddet
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
              <Text style={styles.mapTitle}>Konum</Text>
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
                Kapat
              </Button>
            </View>
          </Modal>
        </Portal>
      )}

      {selectedUser && (
        <UserQuickActionsModal
          visible={quickActionsVisible}
          onDismiss={() => {
            setQuickActionsVisible(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.id}
          userName={selectedUser.name}
          onNavigateToProfile={() => {
            // TODO: Navigate to user profile screen when implemented
            Alert.alert('Profil', `${selectedUser.name} profili görüntüleniyor...`);
          }}
          onNavigateToReport={() => {
            // TODO: Navigate to report screen when implemented
            Alert.alert('Şikayet', `${selectedUser.name} kullanıcısı şikayet ediliyor...`);
          }}
        />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  divider: {
    marginVertical: 15,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
  creatorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 16,
    marginLeft: 10,
  },
  joinButton: {
    marginHorizontal: 15,
    marginTop: 10,
  },
  chatButton: {
    marginHorizontal: 15,
    marginTop: 10,
  },
  statusChip: {
    alignSelf: 'center',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantDetails: {
    flex: 1,
    marginLeft: 12,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  badgeIcon: {
    marginLeft: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  approveButton: {
    marginRight: 5,
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
