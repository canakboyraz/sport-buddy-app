import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, Linking, TouchableOpacity, StatusBar } from 'react-native';
import { Card, Text, Button, Avatar, Chip, ActivityIndicator, Divider, Portal, Modal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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
import { scheduleSessionReminders, cancelSessionReminders, sendParticipantJoinedNotification } from '../../services/notificationService';

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
          user:profiles(*)
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#6200ee', '#9c27b0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name={session.sport?.icon || 'trophy'} size={40} color="#fff" />
          <Text style={styles.headerTitle}>{session.title}</Text>
          <View style={styles.headerBadges}>
            {isFull && !isPast && (
              <Chip icon="close-circle" style={styles.fullBadge} textStyle={styles.badgeText}>
                Dolu
              </Chip>
            )}
            {isPast && (
              <Chip icon="clock-outline" style={styles.pastBadge} textStyle={styles.badgeText}>
                Geçmiş
              </Chip>
            )}
            {!isPast && !isFull && (
              <Chip icon="check-circle" style={styles.availableBadge} textStyle={styles.badgeText}>
                Yer Var
              </Chip>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="information" size={20} color="#6200ee" /> Etkinlik Bilgileri
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="soccer" size={24} color="#6200ee" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Spor Türü</Text>
                <Text style={styles.infoText}>{session.sport?.name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="calendar" size={24} color="#6200ee" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Tarih ve Saat</Text>
                <Text style={styles.infoText}>
                  {format(new Date(session.session_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={handleLocationPress}
              disabled={!session.latitude || !session.longitude}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#6200ee" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Konum</Text>
                <Text style={[styles.infoText, (session.latitude && session.longitude) && styles.linkText]}>
                  {session.location}
                </Text>
                {session.city && (
                  <Text style={styles.cityText}>{session.city}</Text>
                )}
              </View>
              {session.latitude && session.longitude && (
                <MaterialCommunityIcons name="open-in-new" size={20} color="#6200ee" />
              )}
            </TouchableOpacity>

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="account-multiple" size={24} color="#6200ee" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Katılımcılar</Text>
                <Text style={styles.infoText}>
                  {approvedParticipants.length}/{session.max_participants} kişi
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="star" size={24} color="#6200ee" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Seviye</Text>
                <Text style={styles.infoText}>
                  {session.skill_level === 'any' ? 'Herkes' : session.skill_level === 'beginner' ? 'Başlangıç' : session.skill_level === 'intermediate' ? 'Orta' : 'İleri'}
                </Text>
              </View>
            </View>

            {session.description && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.descriptionLabel}>
                  <MaterialCommunityIcons name="text" size={18} color="#6200ee" /> Açıklama
                </Text>
                <Text style={styles.description}>{session.description}</Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account" size={20} color="#6200ee" /> Organizatör
            </Text>
            <TouchableOpacity
              style={styles.creatorRow}
              onPress={() => handleUserClick(session.creator_id, session.creator?.full_name || 'Kullanıcı')}
            >
              <Avatar.Text size={48} label={session.creator?.full_name?.charAt(0) || 'U'} />
              <View style={styles.creatorInfo}>
                <Text style={styles.creatorName}>{session.creator?.full_name}</Text>
                <Chip icon="crown" style={styles.creatorChip} textStyle={styles.creatorChipText} compact>
                  Organizatör
                </Chip>
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {!isCreator && !userParticipant && !isFull && !isPast && (
          <Button
            mode="contained"
            onPress={handleJoinRequest}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.actionButton}
            icon="account-plus"
            contentStyle={styles.buttonContent}
          >
            Katılma İsteği Gönder
          </Button>
        )}

        {userParticipant && userParticipant.status === 'pending' && (
          <Card style={[styles.card, styles.statusCard]} mode="elevated">
            <Card.Content style={styles.statusCardContent}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
              <Text style={styles.statusText}>Katılım talebiniz organizatör tarafından değerlendiriliyor</Text>
            </Card.Content>
          </Card>
        )}

        {userParticipant && userParticipant.status === 'approved' && (
          <>
            <Card style={[styles.card, styles.statusCard]} mode="elevated">
              <Card.Content style={styles.statusCardContent}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.statusText}>Katılımınız onaylandı!</Text>
              </Card.Content>
            </Card>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Chat', { sessionId: session.id })}
              style={styles.actionButton}
              icon="chat"
              contentStyle={styles.buttonContent}
            >
              Sohbete Git
            </Button>
          </>
        )}

        {isCreator && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Chat', { sessionId: session.id })}
            style={styles.actionButton}
            icon="chat"
            contentStyle={styles.buttonContent}
          >
            Sohbete Git
          </Button>
        )}

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account-group" size={20} color="#6200ee" /> Katılımcılar ({approvedParticipants.length})
            </Text>
            {approvedParticipants.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Henüz katılımcı yok</Text>
              </View>
            ) : (
              approvedParticipants.map((participant) => (
                <TouchableOpacity
                  key={participant.id}
                  style={styles.participantRow}
                  onPress={() => handleUserClick(participant.user_id, participant.user?.full_name || 'Kullanıcı')}
                >
                  <Avatar.Text size={44} label={participant.user?.full_name?.charAt(0) || 'U'} />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{participant.user?.full_name}</Text>
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
                        style={styles.rateButton}
                      >
                        Değerlendir
                      </Button>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              ))
            )}
          </Card.Content>
        </Card>

        {isCreator && pendingParticipants.length > 0 && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="clock-alert" size={20} color="#FF9800" /> Bekleyen Talepler ({pendingParticipants.length})
              </Text>
              {pendingParticipants.map((participant) => {
                const userName = participant.user?.full_name || 'Kullanıcı';
                const userInitial = userName.charAt(0).toUpperCase();

                return (
                  <Card key={participant.id} style={styles.pendingCard} mode="outlined">
                    <Card.Content>
                      <TouchableOpacity
                        style={styles.pendingParticipantRow}
                        onPress={() => handleUserClick(participant.user_id, userName)}
                      >
                        <Avatar.Text size={44} label={userInitial} />
                        <View style={styles.pendingParticipantInfo}>
                          <Text style={styles.participantName}>{userName}</Text>
                          <View style={styles.actionButtons}>
                            <Button
                              mode="contained"
                              compact
                              onPress={() => handleApprove(participant.id)}
                              disabled={actionLoading || isFull}
                              style={styles.approveButton}
                              icon="check"
                            >
                              Onayla
                            </Button>
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleReject(participant.id)}
                              disabled={actionLoading}
                              icon="close"
                            >
                              Reddet
                            </Button>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })}
            </Card.Content>
          </Card>
        )}

      </ScrollView>

      {Platform.OS !== 'web' && session && session.latitude && session.longitude && (
        <Portal>
          <Modal visible={mapVisible} onDismiss={() => setMapVisible(false)} contentContainerStyle={styles.mapModal}>
            <Card style={styles.mapCard}>
              <Card.Content>
                <Text style={styles.mapTitle}>
                  <MaterialCommunityIcons name="map" size={24} color="#6200ee" /> Etkinlik Konumu
                </Text>
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
              </Card.Content>
            </Card>
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
            Alert.alert('Profil', `${selectedUser.name} profili görüntüleniyor...`);
          }}
          onNavigateToReport={() => {
            Alert.alert('Şikayet', `${selectedUser.name} kullanıcısı şikayet ediliyor...`);
          }}
        />
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
    paddingBottom: 24,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  headerBadges: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  fullBadge: {
    backgroundColor: '#F44336',
  },
  pastBadge: {
    backgroundColor: '#9E9E9E',
  },
  availableBadge: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
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
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8eaf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  cityText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  linkText: {
    color: '#6200ee',
  },
  divider: {
    marginVertical: 16,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  creatorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  creatorChip: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-start',
  },
  creatorChipText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 11,
  },
  actionButton: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  statusCard: {
    backgroundColor: '#f9f9f9',
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  rateButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  pendingCard: {
    marginBottom: 12,
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  pendingParticipantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pendingParticipantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  approveButton: {
    flex: 1,
  },
  mapModal: {
    margin: 20,
  },
  mapCard: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  map: {
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  closeMapButton: {
    marginTop: 4,
  },
});
