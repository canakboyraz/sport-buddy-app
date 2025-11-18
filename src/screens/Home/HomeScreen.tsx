import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform, Linking } from 'react-native';
import { Text, Button, Chip, ActivityIndicator, FAB, Badge } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession, Sport } from '../../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { calculateDistance, formatDistance } from '../../utils/distanceCalculator';
import AdvancedFiltersModal, { AdvancedFilters } from '../../components/AdvancedFiltersModal';
import SessionCard from '../../components/SessionCard';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { SkeletonList } from '../../components/SkeletonLoader';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../../services/cacheService';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { errorLogger } from '../../services/errorLogger';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

// Spor türlerine göre simge eşleştirme
const getSportIcon = (sportName: string): string => {
  const iconMap: { [key: string]: string } = {
    'Futbol': 'soccer',
    'Basketbol': 'basketball',
    'Tenis': 'tennis',
    'Voleybol': 'volleyball',
    'Yüzme': 'swim',
    'Koşu': 'run',
    'Bisiklet': 'bike',
  };
  return iconMap[sportName] || 'trophy';
};

const PAGE_SIZE = 20;

export default function HomeScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    maxDistance: null,
    dateFrom: null,
    dateTo: null,
    onlyAvailable: false,
    skillLevel: null,
  });

  useEffect(() => {
    loadSports();
    loadCities();
    loadSessions();
    getUserLocation();
  }, [selectedSport, selectedCity]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('[HomeScreen] getUserLocation error:', error);
    }
  };

  // Memoized filtering logic for better performance
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    // Filter out sessions that started more than 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    filtered = filtered.filter((session) => {
      const sessionDate = new Date(session.session_date);
      return sessionDate >= oneHourAgo;
    });

    // Distance filter
    if (advancedFilters.maxDistance && userLocation) {
      filtered = filtered.filter((session) => {
        if (!session.latitude || !session.longitude) return false;
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          session.latitude,
          session.longitude
        );
        return distance <= advancedFilters.maxDistance!;
      });
    }

    // Date range filter
    if (advancedFilters.dateFrom) {
      const fromDate = new Date(advancedFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.session_date);
        return sessionDate >= fromDate;
      });
    }

    if (advancedFilters.dateTo) {
      const toDate = new Date(advancedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.session_date);
        return sessionDate <= toDate;
      });
    }

    // Skill level filter
    if (advancedFilters.skillLevel) {
      filtered = filtered.filter(
        (session) => session.skill_level === advancedFilters.skillLevel
      );
    }

    // Only available sessions filter
    if (advancedFilters.onlyAvailable) {
      filtered = filtered.filter((session) => {
        const participantCount =
          session.participants?.filter((p) => p.status === 'approved').length || 0;
        return participantCount < session.max_participants;
      });
    }

    return filtered;
  }, [sessions, advancedFilters, userLocation]);

  // Memoized active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.maxDistance) count++;
    if (advancedFilters.dateFrom || advancedFilters.dateTo) count++;
    if (advancedFilters.skillLevel) count++;
    if (advancedFilters.onlyAvailable) count++;
    return count;
  }, [advancedFilters]);

  const loadSports = async () => {
    try {
      // Try cache first
      const cachedSports = await cacheService.get<Sport[]>(CACHE_KEYS.SPORTS);
      if (cachedSports) {
        setSports(cachedSports);
        return;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .order('name');

      if (error) {
        console.error('[HomeScreen] loadSports error:', error);
        setSports([]);
      } else if (data) {
        setSports(data);
        // Cache for 1 hour (sports don't change often)
        await cacheService.set(CACHE_KEYS.SPORTS, data, CACHE_TTL.VERY_LONG);
      }
    } catch (error) {
      console.error('[HomeScreen] loadSports catch error:', error);
      setSports([]);
    }
  };

  const loadCities = async () => {
    try {
      // Try cache first
      const cachedCities = await cacheService.get<string[]>(CACHE_KEYS.CITIES);
      if (cachedCities) {
        setCities(cachedCities);
        return;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('sport_sessions')
        .select('city')
        .not('city', 'is', null);

      if (error) {
        console.error('[HomeScreen] loadCities error:', error);
        setCities([]);
      } else if (data) {
        const uniqueCities = [...new Set(data.map(s => s.city).filter(Boolean))] as string[];
        setCities(uniqueCities.sort());
        // Cache for 15 minutes
        await cacheService.set(CACHE_KEYS.CITIES, uniqueCities, CACHE_TTL.LONG);
      }
    } catch (error) {
      console.error('[HomeScreen] loadCities catch error:', error);
      setCities([]);
    }
  };

  const loadSessions = async (pageNum: number = 0, append: boolean = false) => {
    performanceMonitor.start('loadSessions', { pageNum, append });

    // Stale-while-revalidate: Only cache first page for simplicity
    if (pageNum === 0 && !append) {
      const cacheKey = `${CACHE_KEYS.SESSIONS}_${selectedSport || 'all'}_${selectedCity || 'all'}`;
      const { data: cachedData, isStale } = await cacheService.getStale<SportSession[]>(cacheKey);

      if (cachedData) {
        // Show cached data immediately
        setSessions(cachedData);
        setLoading(false);

        // If not stale, we're done
        if (!isStale) {
          performanceMonitor.end('loadSessions');
          return;
        }
        // If stale, continue to fetch fresh data in background
      }
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    }

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('sport_sessions')
      .select(`
        *,
        creator:profiles!sport_sessions_creator_id_fkey(*),
        sport:sports(*),
        participants:session_participants(*)
      `, { count: 'exact' })
      .eq('status', 'open')
      .gte('session_date', oneHourAgo.toISOString())
      .order('session_date', { ascending: true })
      .range(from, to);

    if (selectedSport) {
      query = query.eq('sport_id', selectedSport);
    }

    if (selectedCity) {
      query = query.eq('city', selectedCity);
    }

    const { data, error, count } = await query;

    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);

    if (error) {
      console.error('[HomeScreen] loadSessions error (page ' + pageNum + '):', error);
      // Don't spam logs for pagination errors - just stop loading more
      if (append) {
        // Pagination error - just stop, don't clear existing sessions
        setHasMore(false);
      } else {
        // Initial load error - show empty state
        setSessions([]);
      }
    } else if (data) {
      const newSessions = data as SportSession[];
      if (append) {
        setSessions(prev => [...prev, ...newSessions]);
      } else {
        setSessions(newSessions);
      }
      setHasMore(newSessions.length === PAGE_SIZE && (count ? from + newSessions.length < count : true));

      // Cache the first page results
      if (pageNum === 0 && !append) {
        const cacheKey = `${CACHE_KEYS.SESSIONS}_${selectedSport || 'all'}_${selectedCity || 'all'}`;
        await cacheService.set(cacheKey, newSessions, CACHE_TTL.MEDIUM);
      }
    }

    performanceMonitor.end('loadSessions');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions(0, false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadSessions(nextPage, true);
    }
  };

  const handleLocationPress = (latitude?: number, longitude?: number) => {
    if (latitude && longitude) {
      const url = Platform.OS === 'web'
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : Platform.OS === 'ios'
        ? `maps://maps.apple.com/?q=${latitude},${longitude}`
        : `geo:${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  const renderSessionCard = ({ item }: { item: SportSession }) => {
    const distance = userLocation && item.latitude && item.longitude
      ? formatDistance(calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          item.latitude,
          item.longitude
        ))
      : null;

    return (
      <SessionCard
        item={item}
        sportIcon={getSportIcon(item.sport?.name || '')}
        distance={distance}
        onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
        onLocationPress={handleLocationPress}
      />
    );
  };

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Spor Türü:</Text>
          <Text style={styles.filterTitle}>Şehir:</Text>
        </View>
        <SkeletonList count={5} type="session" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Spor Türü:</Text>
        <FlatList
          horizontal
          data={[{ id: null, name: 'Tümü', icon: 'trophy' }, ...sports.map(s => ({ ...s, icon: s.icon || getSportIcon(s.name) }))]}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Chip
              selected={selectedSport === item.id}
              onPress={() => setSelectedSport(item.id)}
              style={styles.filterChip}
              icon={item.id === null ? 'trophy' : getSportIcon(item.name)}
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
        data={filteredSessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={21}
        // Improve scroll performance
        getItemLayout={(data, index) => ({
          length: 280, // Approximate card height
          offset: 280 * index,
          index,
        })}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#6200ee" />
              <Text style={styles.footerText}>Yükleniyor...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="filter-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeFilterCount > 0 ? 'Filtrelerinize uygun seans bulunamadı' : 'Henüz seans yok'}
              </Text>
              {activeFilterCount > 0 && (
                <Text style={styles.emptySubtext}>Filtreleri sıfırlayıp tekrar deneyin</Text>
              )}
            </View>
          ) : null
        }
      />

      <FAB
        icon={activeFilterCount > 0 ? 'filter-check' : 'filter-variant'}
        style={styles.fab}
        onPress={() => setShowAdvancedFilters(true)}
        label="Filtreler"
        color="#fff"
      />

      {activeFilterCount > 0 && (
        <Badge style={styles.filterBadge}>{activeFilterCount}</Badge>
      )}

      <AdvancedFiltersModal
        visible={showAdvancedFilters}
        onDismiss={() => setShowAdvancedFilters(false)}
        filters={advancedFilters}
        onApply={setAdvancedFilters}
        hasLocation={userLocation !== null}
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6200ee',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#6200ee',
  },
  filterBadge: {
    position: 'absolute',
    bottom: 70,
    right: 30,
    backgroundColor: '#F44336',
  },
});
