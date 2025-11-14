import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';

type MyEventsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: MyEventsScreenNavigationProp;
};

export default function MyEventsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadMySessions();
  }, [filter]);

  const getParticipatedSessionIds = async () => {
    if (!user?.id) return '';

    const { data, error } = await supabase
      .from('session_participants')
      .select('session_id')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (!error && data && data.length > 0) {
      return data.map(p => p.session_id).join(',');
    }
    return '0';
  };

  const loadMySessions = async () => {
    if (!user?.id) return;

    setLoading(true);

    const participatedIds = await getParticipatedSessionIds();

    const { data, error } = await supabase
      .from('sport_sessions')
      .select(`
        *,
        creator:profiles!sport_sessions_creator_id_fkey(*),
        sport:sports(*),
        participants:session_participants(*)
      `)
      .or(`creator_id.eq.${user.id},id.in.(${participatedIds})`)
      .order('session_date', { ascending: filter === 'upcoming' });

    setLoading(false);
    setRefreshing(false);

    if (!error && data) {
      const now = new Date();
      let filteredData = data;

      if (filter === 'upcoming') {
        filteredData = data.filter(session => new Date(session.session_date) >= now);
      } else if (filter === 'past') {
        filteredData = data.filter(session => new Date(session.session_date) < now);
      }

      setSessions(filteredData as any);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMySessions();
  };

  const renderSessionCard = ({ item }: { item: SportSession }) => {
    const participantCount = item.participants?.filter(p => p.status === 'approved').length || 0;
    const isCreator = item.creator_id === user?.id;

    return (
      <Card style={styles.card} mode="elevated" onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item.title}</Text>
            <Chip icon="account-multiple" style={styles.chip}>
              {participantCount}/{item.max_participants}
            </Chip>
          </View>

          {isCreator && (
            <Chip icon="crown" style={styles.creatorChip} textStyle={styles.creatorChipText}>
              Oluşturduğum
            </Chip>
          )}

          <Text style={styles.sport}>{item.sport?.name}</Text>
          <Text style={styles.location}>{item.location}</Text>
          {item.city && <Text style={styles.city}>{item.city}</Text>}
          <Text style={styles.date}>
            {format(new Date(item.session_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}
          </Text>
          <Text style={styles.skillLevel}>Seviye: {item.skill_level}</Text>
          <Text style={styles.status}>Durum: {item.status}</Text>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as 'upcoming' | 'past')}
          buttons={[
            { value: 'upcoming', label: 'Yaklaşan' },
            { value: 'past', label: 'Geçmiş' },
          ]}
        />
      </View>

      <FlatList
        data={sessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'upcoming' ? 'Yaklaşan etkinlik yok' : 'Geçmiş etkinlik yok'}
            </Text>
          </View>
        }
      />
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
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  list: {
    padding: 10,
  },
  card: {
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  chip: {
    marginLeft: 10,
  },
  creatorChip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    backgroundColor: '#FFD700',
  },
  creatorChipText: {
    color: '#000',
    fontWeight: 'bold',
  },
  sport: {
    fontSize: 16,
    color: '#6200ee',
    marginBottom: 5,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  city: {
    fontSize: 14,
    color: '#999',
    marginBottom: 3,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  skillLevel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
