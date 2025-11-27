import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Card, Text, Button, Avatar, ActivityIndicator, Searchbar, Chip, Divider, IconButton, Surface, useTheme as usePaperTheme } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { friendService, FriendshipStatus } from '../../services/friendService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface Friend {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
}

interface FriendRequest {
  id: number;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  requester: Friend;
  target: Friend;
}

type TabType = 'friends' | 'requests' | 'sent' | 'search';

type FriendsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Friends'>;

interface Props {
  navigation: FriendsScreenNavigationProp;
}

export default function FriendsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const theme = usePaperTheme();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);

    try {
      switch (activeTab) {
        case 'friends':
          await loadFriends();
          break;
        case 'requests':
          await loadFriendRequests();
          break;
        case 'sent':
          await loadSentRequests();
          break;
        case 'search':
          if (searchQuery.trim()) {
            await searchUsers();
          }
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const loadFriends = async () => {
    if (!user) return;
    const data = await friendService.getFriends(user.id);
    setFriends(data);
  };

  const loadFriendRequests = async () => {
    if (!user) return;
    const data = await friendService.getFriendRequests(user.id);
    setFriendRequests(data as FriendRequest[]);
  };

  const loadSentRequests = async () => {
    if (!user) return;
    const data = await friendService.getSentRequests(user.id);
    setSentRequests(data as FriendRequest[]);
  };

  const searchUsers = async () => {
    if (!user || !searchQuery.trim()) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, bio')
      .neq('id', user.id)
      .ilike('full_name', `%${searchQuery}%`)
      .limit(20);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!user) return;

    setProcessingIds(prev => new Set(prev).add(targetId));

    try {
      await friendService.sendFriendRequest(targetId, user.id);
      await searchUsers();
      Alert.alert(t('common.success'), t('friends.requestSent'));
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      Alert.alert(t('common.error'), error.message || t('friends.errors.sendRequestFailed'));
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(targetId);
      return newSet;
    });
  };

  const acceptFriendRequest = async (friendshipId: number) => {
    if (!user) return;

    setProcessingIds(prev => new Set(prev).add(friendshipId));

    try {
      await friendService.acceptFriendRequest(friendshipId, user.id);
      await loadFriendRequests();
      Alert.alert(t('common.success'), t('friends.requestAccepted'));
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      Alert.alert(t('common.error'), t('friends.errors.acceptFailed'));
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(friendshipId);
      return newSet;
    });
  };

  const rejectFriendRequest = async (friendshipId: number) => {
    if (!user) return;

    setProcessingIds(prev => new Set(prev).add(friendshipId));

    try {
      await friendService.rejectFriendRequest(friendshipId, user.id);
      await loadFriendRequests();
      Alert.alert(t('common.success'), t('friends.requestRejected'));
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      Alert.alert(t('common.error'), t('friends.errors.rejectFailed'));
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(friendshipId);
      return newSet;
    });
  };

  const cancelFriendRequest = async (friendshipId: number) => {
    if (!user) return;

    setProcessingIds(prev => new Set(prev).add(friendshipId));

    try {
      await friendService.cancelFriendRequest(friendshipId);
      await loadSentRequests();
      Alert.alert(t('common.success'), t('friends.requestCanceled'));
    } catch (error: any) {
      console.error('Error canceling friend request:', error);
      Alert.alert(t('common.error'), t('friends.errors.cancelFailed'));
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(friendshipId);
      return newSet;
    });
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;

    Alert.alert(t('friends.removeFriend'), t('friends.confirmRemove'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setProcessingIds(prev => new Set(prev).add(friendId));

          try {
            await friendService.removeFriend(friendId, user.id);
            await loadFriends();
            Alert.alert(t('common.success'), t('friends.friendRemoved'));
          } catch (error: any) {
            console.error('Error removing friend:', error);
            Alert.alert(t('common.error'), t('friends.errors.removeFailed'));
          }

          setProcessingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(friendId);
            return newSet;
          });
        }
      }
    ]);
  };

  const checkFriendshipStatus = async (targetId: string) => {
    if (!user) return null;
    return await friendService.checkFriendshipStatus(targetId, user.id);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <Surface style={[styles.modernCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.modernCardContent}>
          <View style={styles.avatarContainer}>
            {item.avatar_url ? (
              <Avatar.Image size={64} source={{ uri: item.avatar_url }} />
            ) : (
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.gradientAvatar}
              >
                <Text style={styles.avatarText}>{item.full_name?.charAt(0) || 'U'}</Text>
              </LinearGradient>
            )}
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
          </View>

          <View style={styles.friendInfoExpanded}>
            <Text style={[styles.modernFriendName, { color: theme.colors.onSurface }]}>{item.full_name}</Text>
            {item.bio && (
              <Text style={[styles.modernFriendBio, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {item.bio}
              </Text>
            )}
            <View style={styles.friendMetaRow}>
              <MaterialCommunityIcons name="account-check" size={14} color={theme.colors.primary} />
              <Text style={[styles.metaText, { color: theme.colors.primary }]}>{t('friends.friend')}</Text>
            </View>
          </View>

          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.iconActionButton, { backgroundColor: theme.colors.errorContainer }]}
              onPress={(e) => {
                e.stopPropagation();
                removeFriend(item.id);
              }}
              disabled={processingIds.has(item.id)}
            >
              <MaterialCommunityIcons name="account-remove" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <Surface style={[styles.modernCard, styles.requestCard, { backgroundColor: theme.colors.surface }]} elevation={3}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ProfileDetail', { userId: item.requester.id })}
        activeOpacity={0.7}
      >
        <View style={styles.modernCardContent}>
          <View style={styles.avatarContainer}>
            {item.requester.avatar_url ? (
              <Avatar.Image size={64} source={{ uri: item.requester.avatar_url }} />
            ) : (
              <LinearGradient
                colors={['#ec4899', '#f43f5e']}
                style={styles.gradientAvatar}
              >
                <Text style={styles.avatarText}>{item.requester.full_name?.charAt(0) || 'U'}</Text>
              </LinearGradient>
            )}
            <View style={[styles.statusDot, { backgroundColor: '#FF9800' }]} />
          </View>

          <View style={styles.friendInfoExpanded}>
            <View style={styles.requestHeader}>
              <Text style={[styles.modernFriendName, { color: theme.colors.onSurface }]}>
                {item.requester.full_name}
              </Text>
              <Chip
                compact
                style={[styles.newBadge, { backgroundColor: '#FF9800' }]}
                textStyle={{ color: '#fff', fontSize: 10, fontWeight: '700' }}
              >
                NEW
              </Chip>
            </View>
            {item.requester.bio && (
              <Text style={[styles.modernFriendBio, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {item.requester.bio}
              </Text>
            )}
            <View style={styles.friendMetaRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#FF9800" />
              <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                {t('friends.requestPending')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.requestActionsRow}>
          <TouchableOpacity
            style={[styles.requestButton, styles.acceptButton, { backgroundColor: '#4CAF50' }]}
            onPress={(e) => {
              e.stopPropagation();
              acceptFriendRequest(item.id);
            }}
            disabled={processingIds.has(item.id)}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.requestButtonText}>{t('friends.accept')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.requestButton, styles.rejectButton, { backgroundColor: theme.colors.errorContainer }]}
            onPress={(e) => {
              e.stopPropagation();
              rejectFriendRequest(item.id);
            }}
            disabled={processingIds.has(item.id)}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.error} />
            <Text style={[styles.requestButtonText, { color: theme.colors.error }]}>{t('friends.reject')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Surface>
  );

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <Surface style={[styles.modernCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ProfileDetail', { userId: item.target.id })}
        activeOpacity={0.7}
      >
        <View style={styles.modernCardContent}>
          <View style={styles.avatarContainer}>
            {item.target.avatar_url ? (
              <Avatar.Image size={64} source={{ uri: item.target.avatar_url }} />
            ) : (
              <LinearGradient
                colors={['#06b6d4', '#3b82f6']}
                style={styles.gradientAvatar}
              >
                <Text style={styles.avatarText}>{item.target.full_name?.charAt(0) || 'U'}</Text>
              </LinearGradient>
            )}
            <View style={[styles.statusDot, { backgroundColor: '#9E9E9E' }]} />
          </View>

          <View style={styles.friendInfoExpanded}>
            <Text style={[styles.modernFriendName, { color: theme.colors.onSurface }]}>{item.target.full_name}</Text>
            <View style={styles.friendMetaRow}>
              <MaterialCommunityIcons name="send-clock" size={14} color={theme.colors.primary} />
              <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>{t('friends.requestSent')}</Text>
            </View>
          </View>

          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.iconActionButton, { backgroundColor: theme.colors.errorContainer }]}
              onPress={(e) => {
                e.stopPropagation();
                cancelFriendRequest(item.id);
              }}
              disabled={processingIds.has(item.id)}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  );

  const renderSearchResult = ({ item }: { item: Friend }) => {
    const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    useEffect(() => {
      checkFriendshipStatus(item.id).then(status => {
        setFriendshipStatus(status);
        setStatusLoading(false);
      });
    }, [item.id]);

    const renderActionButton = () => {
      if (statusLoading) {
        return <ActivityIndicator size="small" color={theme.colors.primary} />;
      }

      if (!friendshipStatus) {
        return (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => sendFriendRequest(item.id)}
            disabled={processingIds.has(item.id)}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
          </TouchableOpacity>
        );
      }

      if (friendshipStatus.status === 'accepted') {
        return (
          <Chip
            icon="check-circle"
            compact
            style={{ backgroundColor: theme.colors.primaryContainer }}
            textStyle={{ color: theme.colors.primary }}
          >
            {t('friends.friend')}
          </Chip>
        );
      }

      if (friendshipStatus.status === 'pending') {
        if (friendshipStatus.is_requester) {
          return (
            <Chip
              icon="clock-outline"
              compact
              style={{ backgroundColor: theme.colors.secondaryContainer }}
              textStyle={{ color: theme.colors.secondary }}
            >
              {t('friends.sent')}
            </Chip>
          );
        } else {
          return (
            <Chip
              icon="clock-alert"
              compact
              style={{ backgroundColor: '#FF9800' + '20' }}
              textStyle={{ color: '#FF9800' }}
            >
              {t('friends.requestPending')}
            </Chip>
          );
        }
      }

      return (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => sendFriendRequest(item.id)}
          disabled={processingIds.has(item.id)}
        >
          <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
        </TouchableOpacity>
      );
    };

    return (
      <Surface style={[styles.modernCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.modernCardContent}>
            <View style={styles.avatarContainer}>
              {item.avatar_url ? (
                <Avatar.Image size={64} source={{ uri: item.avatar_url }} />
              ) : (
                <LinearGradient
                  colors={['#10b981', '#14b8a6']}
                  style={styles.gradientAvatar}
                >
                  <Text style={styles.avatarText}>{item.full_name?.charAt(0) || 'U'}</Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.friendInfoExpanded}>
              <Text style={[styles.modernFriendName, { color: theme.colors.onSurface }]}>{item.full_name}</Text>
              {item.bio && (
                <Text style={[styles.modernFriendBio, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                  {item.bio}
                </Text>
              )}
            </View>

            <View style={styles.actionButtonContainer} onStartShouldSetResponder={() => true}>
              {renderActionButton()}
            </View>
          </View>
        </TouchableOpacity>
      </Surface>
    );
  };

  const renderEmptyState = () => {
    let message = '';
    let description = '';
    let icon = 'account-multiple';

    switch (activeTab) {
      case 'friends':
        message = t('friends.noFriends');
        description = 'Start connecting with other sports enthusiasts!';
        icon = 'account-multiple';
        break;
      case 'requests':
        message = t('friends.noRequests');
        description = 'No pending friend requests at the moment';
        icon = 'account-clock';
        break;
      case 'sent':
        message = t('friends.noSentRequests');
        description = 'You haven\'t sent any friend requests yet';
        icon = 'send-clock';
        break;
      case 'search':
        message = searchQuery ? t('friends.noUsersFound') : t('friends.searchPlaceholder');
        description = searchQuery ? 'Try searching with different keywords' : 'Search for users to add as friends';
        icon = 'magnify';
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={isDarkMode ? ['#374151', '#1f2937'] : ['#f3f4f6', '#e5e7eb']}
          style={styles.emptyIconContainer}
        >
          <MaterialCommunityIcons name={icon as any} size={72} color={theme.colors.primary} />
        </LinearGradient>
        <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>{message}</Text>
        <Text style={[styles.emptyDescription, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>

        {activeTab === 'friends' && (
          <Button
            mode="contained"
            onPress={() => setActiveTab('search')}
            style={styles.emptyActionButton}
            icon="account-search"
          >
            {t('common.search')}
          </Button>
        )}
      </View>
    );
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'friends':
        return friends;
      case 'requests':
        return friendRequests;
      case 'sent':
        return sentRequests;
      case 'search':
        return searchResults;
      default:
        return [];
    }
  };

  const getTabRenderItem = () => {
    switch (activeTab) {
      case 'friends':
        return renderFriend;
      case 'requests':
        return renderFriendRequest;
      case 'sent':
        return renderSentRequest;
      case 'search':
        return renderSearchResult;
      default:
        return renderFriend;
    }
  };

  return (
    <View style={styles.container}>
      {/* Modern Header with Stats */}
      <LinearGradient
        colors={isDarkMode ? ['#1e293b', '#0f172a'] : ['#6366f1', '#8b5cf6']}
        style={styles.modernHeader}
      >
        <Text style={styles.headerTitle}>{t('navigation.friends')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{friends.length}</Text>
            <Text style={styles.statLabel}>{t('friends.tabs.friends')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{friendRequests.length}</Text>
            <Text style={styles.statLabel}>{t('friends.tabs.requests')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sentRequests.length}</Text>
            <Text style={styles.statLabel}>{t('friends.tabs.sent')}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Modern Tabs */}
      <Surface style={[styles.modernTabs, { backgroundColor: theme.colors.surface }]} elevation={0}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'friends' && [styles.activeTab, { backgroundColor: theme.colors.primaryContainer }]
            ]}
            onPress={() => setActiveTab('friends')}
          >
            <MaterialCommunityIcons
              name="account-multiple"
              size={20}
              color={activeTab === 'friends' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'friends' ? theme.colors.primary : theme.colors.onSurfaceVariant }
            ]}>
              {t('friends.tabs.friends')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'requests' && [styles.activeTab, { backgroundColor: theme.colors.primaryContainer }]
            ]}
            onPress={() => setActiveTab('requests')}
          >
            <MaterialCommunityIcons
              name="account-clock"
              size={20}
              color={activeTab === 'requests' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'requests' ? theme.colors.primary : theme.colors.onSurfaceVariant }
            ]}>
              {t('friends.tabs.requests')}
            </Text>
            {friendRequests.length > 0 && (
              <View style={[styles.badge, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.badgeText}>{friendRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'sent' && [styles.activeTab, { backgroundColor: theme.colors.primaryContainer }]
            ]}
            onPress={() => setActiveTab('sent')}
          >
            <MaterialCommunityIcons
              name="send-clock"
              size={20}
              color={activeTab === 'sent' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'sent' ? theme.colors.primary : theme.colors.onSurfaceVariant }
            ]}>
              {t('friends.tabs.sent')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'search' && [styles.activeTab, { backgroundColor: theme.colors.primaryContainer }]
            ]}
            onPress={() => setActiveTab('search')}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={activeTab === 'search' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'search' ? theme.colors.primary : theme.colors.onSurfaceVariant }
            ]}>
              {t('common.search')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Surface>

      {/* Search bar */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={t('friends.searchUsers')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={searchUsers}
            style={[styles.modernSearchBar, { backgroundColor: theme.colors.surface }]}
            iconColor={theme.colors.primary}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            elevation={2}
          />
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={getTabData()}
          renderItem={getTabRenderItem()}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmptyState}
          style={{ backgroundColor: theme.colors.background }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modernHeader: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernTabs: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  modernTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
  },
  modernSearchBar: {
    borderRadius: 16,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  modernCard: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  requestCard: {
    borderWidth: 2,
    borderColor: '#FF9800' + '30',
  },
  modernCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  gradientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  friendInfoExpanded: {
    flex: 1,
    marginLeft: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernFriendName: {
    fontSize: 17,
    fontWeight: '700',
  },
  modernFriendBio: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  friendMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  newBadge: {
    height: 20,
  },
  actionButtonContainer: {
    marginLeft: 8,
  },
  iconActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  requestActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  requestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyActionButton: {
    marginTop: 24,
    borderRadius: 12,
  },
});
