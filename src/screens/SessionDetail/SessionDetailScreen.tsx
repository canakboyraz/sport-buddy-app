import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, Avatar, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession, SessionParticipant } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
          *,
          user:profiles(*)
        )
      `)
      .eq('id', sessionId)
      .single();

    setLoading(false);

    if (!error && data) {
      setSession(data as any);
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

    const { error } = await supabase
      .from('session_participants')
      .update({ status: 'approved' })
      .eq('id', participantId);

    setActionLoading(false);

    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Katılımcı onaylandı!');
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

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#6200ee" />
            <Text style={styles.infoText}>{session.location}</Text>
          </View>

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

          {session.description && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.descriptionLabel}>Açıklama:</Text>
              <Text style={styles.description}>{session.description}</Text>
            </>
          )}

          <Divider style={styles.divider} />
          <Text style={styles.creatorLabel}>Oluşturan:</Text>
          <View style={styles.creatorRow}>
            <Avatar.Text size={40} label={session.creator?.full_name?.charAt(0) || 'U'} />
            <Text style={styles.creatorName}>{session.creator?.full_name}</Text>
          </View>
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
          {approvedParticipants.map((participant) => (
            <View key={participant.id} style={styles.participantRow}>
              <Avatar.Text size={36} label={participant.user?.full_name?.charAt(0) || 'U'} />
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
                >
                  Değerlendir
                </Button>
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      {isCreator && pendingParticipants.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Bekleyen Talepler ({pendingParticipants.length})</Text>
            {pendingParticipants.map((participant) => (
              <View key={participant.id} style={styles.participantRow}>
                <Avatar.Text size={36} label={participant.user?.full_name?.charAt(0) || 'U'} />
                <Text style={styles.participantName}>{participant.user?.full_name}</Text>
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
    marginBottom: 10,
  },
  participantName: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  approveButton: {
    marginRight: 5,
  },
});
