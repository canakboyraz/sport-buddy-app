import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons, Surface, useTheme as usePaperTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserFavorites, getUserSavedSessions } from '../../services/favoritesService';
import { useAuth } from '../../hooks/useAuth';
import { SportSession } from '../../types';
import { format } from 'date-fns';
import { getDateLocale } from '../../utils/dateLocale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: FavoritesScreenNavigationProp;
};

const getSportIcon = (sportName: string): string => {
  const iconMap: { [key: string]: string } = {
    'Futbol': 'soccer',
    'Basketbol': 'basketball',
    'Tenis': 'tennis',
    'Voleybol': 'volleyball',
    'Yüzme': 'swim',
    'Koşu': 'run',
    'Bisiklet': 'bike',
    'Gym': 'weight-lifter',
    'Yoga': 'yoga',
  };
  return iconMap[sportName] || 'trophy';
};

export default function FavoritesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const theme = usePaperTheme();
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    if (activeTab === 'favorites') {
      const result = await getUserFavorites(user.id);
      if (result.success && result.data) {
        setFavorites(result.data);
      }
    } else {
      const result = await getUserSavedSessions(user.id);
      if (result.success && result.data) {
        setSavedSessions(result.data);
      }
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderSessionCard = ({ item }: { item: any }) => {
    const session: SportSession = item.session;
    if (!session) return null;

    const participantCount = session.participants?.filter(p => p.status === 'approved').length || 0;
    const isFull = participantCount >= session.max_participants;
    const sportIcon = getSportIcon(session.sport?.name || '');

    return (
      <Surface
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        elevation={2}
      >
        <Card
          style={{ backgroundColor: 'transparent' }}
          onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
        >
          <Card.Content>
            {/* Header with Title and Participants */}
            <View style={styles.cardHeader}>
              <Text
                style={[styles.title, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {session.title}
              </Text>
              <Chip
                icon="account-multiple"
                style={[styles.participantChip, { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}
                compact
              >
                {participantCount}/{session.max_participants}
              </Chip>
            </View>

            {/* Sport Badge */}
            <View style={styles.sportBadge}>
              <View style={[styles.sportIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <MaterialCommunityIcons name={sportIcon as any} size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.sportText, { color: theme.colors.onSurface }]}>
                {session.sport?.name}
              </Text>
              {session.skill_level && (
                <Chip
                  icon="star"
                  style={[styles.skillChip, { backgroundColor: theme.colors.tertiaryContainer }]}
                  textStyle={{ color: theme.colors.onTertiaryContainer, fontSize: 11 }}
                  compact
                >
                  {t(`skillLevel.${session.skill_level}`)}
                </Chip>
              )}
            </View>

            {/* Location */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.secondary} />
              <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {session.location}
              </Text>
            </View>

            {/* City */}
            {session.city && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="city" size={18} color={theme.colors.secondary} />
                <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                  {session.city}
                </Text>
              </View>
            )}

            {/* Date & Time */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color={theme.colors.secondary} />
              <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                {format(new Date(session.session_date), 'dd MMM yyyy, HH:mm', { locale: getDateLocale() })}
              </Text>
            </View>

            {/* Creator */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="account-circle" size={18} color={theme.colors.secondary} />
              <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                {session.creator?.full_name || t('common.unknown')}
              </Text>
            </View>

            {/* Notes (for saved sessions) */}
            {activeTab === 'saved' && item.notes && (
              <Surface
                style={[styles.notesContainer, { backgroundColor: theme.colors.surfaceVariant }]}
                elevation={0}
              >
                <View style={styles.notesHeader}>
                  <MaterialCommunityIcons name="note-text" size={16} color={theme.colors.primary} />
                  <Text style={[styles.notesLabel, { color: theme.colors.primary }]}>
                    {t('favorites.note')}
                  </Text>
                </View>
                <Text style={[styles.notesText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                  {item.notes}
                </Text>
              </Surface>
            )}

            {/* Status Badges */}
            <View style={styles.badgesRow}>
              {isFull && (
                <Chip
                  icon="close-circle"
                  style={[styles.statusChip, { backgroundColor: theme.colors.errorContainer }]}
                  textStyle={{ color: theme.colors.onErrorContainer, fontSize: 11 }}
                  compact
                >
                  {t('session.full')}
                </Chip>
              )}
              <View style={{ flex: 1 }} />
              <View style={styles.dateAddedContainer}>
                <MaterialCommunityIcons
                  name={activeTab === 'favorites' ? 'heart' : 'bookmark'}
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.dateAdded, { color: theme.colors.onSurfaceVariant }]}>
                  {format(new Date(item.created_at), 'dd MMM', { locale: getDateLocale() })}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </Surface>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const data = activeTab === 'favorites' ? favorites : savedSessions;

  return (
    <LinearGradient
      colors={
        isDarkMode
          ? [theme.colors.background, theme.colors.background]
          : [theme.colors.primaryContainer + '20', theme.colors.background]
      }
      style={styles.container}
    >
      {/* Tab Switcher */}
      <Surface style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'favorites',
              label: t('favorites.title'),
              icon: 'heart',
              style: activeTab === 'favorites' ? { backgroundColor: theme.colors.secondaryContainer } : {},
            },
            {
              value: 'saved',
              label: t('favorites.saved'),
              icon: 'bookmark',
              style: activeTab === 'saved' ? { backgroundColor: theme.colors.secondaryContainer } : {},
            },
          ]}
          style={{ backgroundColor: 'transparent' }}
        />
      </Surface>

      {/* Sessions List */}
      <FlatList
        data={data}
        renderItem={renderSessionCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons
                name={activeTab === 'favorites' ? 'heart-outline' : 'bookmark-outline'}
                size={64}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
            <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
              {activeTab === 'favorites'
                ? t('favorites.noFavorites')
                : t('favorites.noSaved')}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              {activeTab === 'favorites'
                ? t('favorites.noFavoritesDesc')
                : t('favorites.noSavedDesc')}
            </Text>
          </View>
        }
      />
    </LinearGradient>
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
  tabContainer: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  participantChip: {
    marginLeft: 8,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sportIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  skillChip: {
    height: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  statusChip: {
    height: 24,
  },
  dateAddedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateAdded: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
