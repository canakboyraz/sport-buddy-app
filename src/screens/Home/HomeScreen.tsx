import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession, Sport } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSports();
    loadCities();
    loadSessions();
  }, [selectedSport, selectedCity]);

  const loadSports = async () => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name');

    if (!error && data) {
      setSports(data);
    }
  };

  const loadCities = async () => {
    const { data, error } = await supabase
      .from('sport_sessions')
      .select('city')
      .not('city', 'is', null);

    if (!error && data) {
      const uniqueCities = [...new Set(data.map(s => s.city).filter(Boolean))] as string[];
      setCities(uniqueCities.sort());
    }
  };

  const loadSessions = async () => {
    setLoading(true);

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    let query = supabase
      .from('sport_sessions')
      .select(`
        *,
        creator:profiles!sport_sessions_creator_id_fkey(*),
        sport:sports(*),
        participants:session_participants(*)
      `)
      .eq('status', 'open')
      .gte('session_date', oneHourAgo.toISOString())
      .order('session_date', { ascending: true });

    if (selectedSport) {
      query = query.eq('sport_id', selectedSport);
    }

    if (selectedCity) {
      query = query.eq('city', selectedCity);
    }

    const { data, error } = await query;

    setLoading(false);
    setRefreshing(false);

    if (!error && data) {
      setSessions(data as any);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const renderSessionCard = ({ item }: { item: SportSession }) => {
    const participantCount = item.participants?.filter(p => p.status === 'approved').length || 0;
    const isFull = participantCount >= item.max_participants;

    return (
      <Card style={styles.card} mode="elevated" onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item.title}</Text>
            <Chip icon="account-multiple" style={styles.chip}>
              {participantCount}/{item.max_participants}
            </Chip>
          </View>

          <Text style={styles.sport}>{item.sport?.name}</Text>
          <Text style={styles.location}>{item.location}</Text>
          {item.city && <Text style={styles.city}>{item.city}</Text>}
          <Text style={styles.date}>
            {format(new Date(item.session_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}
          </Text>
          <Text style={styles.skillLevel}>Seviye: {item.skill_level}</Text>
          <Text style={styles.creator}>Oluşturan: {item.creator?.full_name}</Text>

          {isFull && <Text style={styles.fullText}>Dolu</Text>}
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
      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Spor Türü:</Text>
        <FlatList
          horizontal
          data={[{ id: null, name: 'Tümü' }, ...sports]}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Chip
              selected={selectedSport === item.id}
              onPress={() => setSelectedSport(item.id)}
              style={styles.filterChip}
            >
              {item.name}
            </Chip>
          )}
          showsHorizontalScrollIndicator={false}
        />

        <Text style={styles.filterTitle}>Şehir:</Text>
        <FlatList
          horizontal
          data={[{ value: null, label: 'Tümü' }, ...cities.map(c => ({ value: c, label: c }))]}
          keyExtractor={(item) => String(item.value || 'all')}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCity === item.value}
              onPress={() => setSelectedCity(item.value)}
              style={styles.filterChip}
            >
              {item.label}
            </Chip>
          )}
          showsHorizontalScrollIndicator={false}
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
            <Text style={styles.emptyText}>Henüz seans yok</Text>
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
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 5,
    color: '#333',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 5,
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
  creator: {
    fontSize: 14,
    color: '#666',
  },
  fullText: {
    marginTop: 10,
    color: 'red',
    fontWeight: 'bold',
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
