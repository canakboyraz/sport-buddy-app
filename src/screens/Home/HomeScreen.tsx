import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform, Linking, StatusBar, Alert } from 'react-native';
import { Text, Button, Chip, ActivityIndicator, FAB, Badge, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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
import EmptyState from '../../components/EmptyState';
import { getSportIcon } from '../../utils/sportIcons';
import { useLanguage } from '../../contexts/LanguageContext';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const PAGE_SIZE = 20;

export default function HomeScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const theme = useTheme();
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<number | null>(null);
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

  // Load initial data on mount
  useEffect(() => {
    loadSports();
    loadSessions();
    getUserLocation();
  }, []);

  // Reload sessions when selectedSport changes
  useEffect(() => {
    if (selectedSport !== null || sessions.length > 0) {
      loadSessions();
    }
  }, [selectedSport]);

  // Listen for new sessions added (focus event)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh sessions when coming back from CreateSession
      loadSessions(0, false);
    });

    return unsubscribe;
  }, [navigation]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else if (status === 'denied') {
        Alert.alert(
          t('map.locationPermissionRequired'),
          t('map.locationPermissionMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.openSettings'),
              onPress: () => Linking.openSettings()
            }
          ]
        );
      }
    } catch (error) {
      console.error('[HomeScreen] getUserLocation error:', error);
      Alert.alert(t('common.error'), t('map.locationError'));
    }
  };

  // Memoized filtering logic for better performance
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    // Filter out past sessions - only show future sessions
    const now = new Date();
    filtered = filtered.filter((session) => {
      const sessionDate = new Date(session.session_date);
      return sessionDate >= now;
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

  const loadSports = async (forceRefresh: boolean = false) => {
    try {
      // Clear cache if force refresh requested
      if (forceRefresh) {
        await cacheService.remove(CACHE_KEYS.SPORTS);
      }

      // Try cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedSports = await cacheService.get<Sport[]>(CACHE_KEYS.SPORTS);
        if (cachedSports) {
          setSports(cachedSports);
          return;
        }
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
        console.log('[HomeScreen] Loaded sports:', data.length, 'sports');
        // Cache for 1 hour (sports don't change often)
        await cacheService.set(CACHE_KEYS.SPORTS, data, CACHE_TTL.VERY_LONG);
      }
    } catch (error) {
      console.error('[HomeScreen] loadSports catch error:', error);
      setSports([]);
    }
  };


  const loadSessions = async (pageNum: number = 0, append: boolean = false) => {
    performanceMonitor.start('loadSessions', { pageNum, append });

    // Stale-while-revalidate: Only cache first page for simplicity
    if (pageNum === 0 && !append) {
      const cacheKey = `${CACHE_KEYS.SESSIONS}_${selectedSport || 'all'}`;
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

    const now = new Date();

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
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
        participants:session_participants(*)
      `, { count: 'exact' })
      .eq('status', 'open')
      .gte('session_date', now.toISOString())
      .order('session_date', { ascending: true })
      .range(from, to);

    if (selectedSport) {
      query = query.eq('sport_id', selectedSport);
    }

    const { data, error, count } = await query;

    setLoading(false);
    setLoadingMore(false);

    if (error) {
      console.error('[HomeScreen] loadSessions error (page ' + pageNum + '):', error);
      // Log detailed error information for debugging
      console.error('[HomeScreen] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

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
        const cacheKey = `${CACHE_KEYS.SESSIONS}_${selectedSport || 'all'}`;
        await cacheService.set(cacheKey, newSessions, CACHE_TTL.MEDIUM);
      }
    }

    performanceMonitor.end('loadSessions');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Load sports and sessions in parallel
      await Promise.all([
        loadSports(true), // Force refresh sports from database
        loadSessions(0, false)
      ]);
    } catch (error) {
      console.error('[HomeScreen] onRefresh error:', error);
    } finally {
      setRefreshing(false);
    }
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.filtersContainer}>
          <Text style={[styles.filterTitle, { color: theme.colors.onBackground }]}>{t('home.filterBySport')}:</Text>
        </View>
        <SkeletonList count={5} type="session" />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OfflineIndicator />
      <LinearGradient
        colors={theme.dark
          ? [theme.colors.primaryContainer, theme.colors.secondaryContainer]
          : ['#6200ee', '#9c27b0']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.filtersContainer}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('CreateSession')}
            style={styles.createButton}
            buttonColor="white"
            textColor="#6200ee"
            compact
          >
            {t('session.createNew')}
          </Button>

          <Text style={[styles.filterTitle, { color: 'white', marginBottom: 8, marginTop: 12 }]}>{t('home.filterBySport')}:</Text>
          <FlatList
            horizontal
            data={[{ id: null, name: t('common.all'), icon: 'trophy' }, ...sports.map(s => ({ ...s, icon: s.icon || getSportIcon(s.name) }))]}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Chip
                selected={selectedSport === item.id}
                onPress={() => setSelectedSport(item.id)}
                style={[
                  styles.filterChip,
                  selectedSport === item.id ? { backgroundColor: 'white' } : { backgroundColor: 'rgba(255,255,255,0.2)' }
                ]}
                textStyle={{ color: selectedSport === item.id ? '#6200ee' : 'white', fontSize: 13 }}
                icon={item.id === null ? 'trophy' : getSportIcon(item.name)}
                selectedColor="#6200ee"
              >
                {item.name}
              </Chip>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </LinearGradient>

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
              <Text style={styles.footerText}>{t('common.loading')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            activeFilterCount > 0 ? (
              <EmptyState
                icon="filter-off"
                title={t('home.noSessionsMatchingFilters')}
                description={t('home.tryDifferentFilters')}
                actionLabel={t('home.resetFilters')}
                onAction={() => {
                  setSelectedSport(null);
                  setAdvancedFilters({
                    maxDistance: null,
                    dateFrom: null,
                    dateTo: null,
                    onlyAvailable: false,
                    skillLevel: null,
                  });
                }}
                secondaryActionLabel={t('home.filterSettings')}
                onSecondaryAction={() => setShowAdvancedFilters(true)}
              />
            ) : (
              <EmptyState
                icon="calendar-plus"
                title={t('home.noSessions')}
                description={t('home.createFirst')}
                actionLabel={t('session.create')}
                onAction={() => navigation.navigate('CreateSession')}
              />
            )
          ) : null
        }
      />

      <FAB
        icon={activeFilterCount > 0 ? 'filter-check' : 'filter-variant'}
        style={styles.fab}
        onPress={() => setShowAdvancedFilters(true)}
        label={t('common.filter')}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 4 : 10,
  },
  createButton: {
    borderRadius: 8,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  filterChip: {
    marginRight: 8,
    height: 32,
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
