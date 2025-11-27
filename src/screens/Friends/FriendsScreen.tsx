import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
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
      // Refresh search results to update button states
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
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <TouchableOpacity onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}>
        <View style={styles.cardContent}>
          {item.avatar_url ? (
            <Avatar.Image size={56} source={{ uri: item.avatar_url }} />
          ) : (
            <Avatar.Text size={56} label={item.full_name?.charAt(0) || 'U'} style={{ backgroundColor: theme.colors.primaryContainer }} />
          )}
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>{item.full_name}</Text>
            {item.bio && <Text style={[styles.friendBio, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{item.bio}</Text>}
          </View>
          <IconButton
            icon="account-remove"
            size={24}
            iconColor={theme.colors.error}
            onPress={(e) => {
              e?.stopPropagation();
              removeFriend(item.id);
            }}
            disabled={processingIds.has(item.id)}
          />
        </View>
      </TouchableOpacity>
    </Surface>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <TouchableOpacity onPress={() => navigation.navigate('ProfileDetail', { userId: item.requester.id })}>
        <View style={styles.cardContent}>
          {item.requester.avatar_url ? (
            <Avatar.Image size={56} source={{ uri: item.requester.avatar_url }} />
          ) : (
            <Avatar.Text size={56} label={item.requester.full_name?.charAt(0) || 'U'} style={{ backgroundColor: theme.colors.primaryContainer }} />
          )}
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>{item.requester.full_name}</Text>
            {item.requester.bio && <Text style={[styles.friendBio, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{item.requester.bio}</Text>}
          </View>
          <View style={styles.requestActions}>
            <IconButton
              icon="check"
              size={24}
              iconColor="#4CAF50"
              onPress={(e) => {
                e?.stopPropagation();
                acceptFriendRequest(item.id);
              }}
              disabled={processingIds.has(item.id)}
            />
            <IconButton
              icon="close"
              size={24}
              iconColor="#F44336"
              onPress={(e) => {
                e?.stopPropagation();
                rejectFriendRequest(item.id);
              }}
              disabled={processingIds.has(item.id)}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  );

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <TouchableOpacity onPress={() => navigation.navigate('ProfileDetail', { userId: item.target.id })}>
        <View style={styles.cardContent}>
          {item.target.avatar_url ? (
            <Avatar.Image size={56} source={{ uri: item.target.avatar_url }} />
          ) : (
            <Avatar.Text size={56} label={item.target.full_name?.charAt(0) || 'U'} style={{ backgroundColor: theme.colors.primaryContainer }} />
          )}
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>{item.target.full_name}</Text>
            <Chip
              icon="clock"
              compact
              style={[styles.pendingChip, { backgroundColor: theme.colors.secondaryContainer }]}
              textStyle={{ color: theme.colors.onSecondaryContainer }}
            >
              {t('friends.pending')}
            </Chip>
          </View>
          <IconButton
            icon="close"
            size={24}
            iconColor={theme.colors.error}
            onPress={(e) => {
              e?.stopPropagation();
              cancelFriendRequest(item.id);
            }}
            disabled={processingIds.has(item.id)}
          />
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
        return <ActivityIndicator size="small" />;
      }

      if (!friendshipStatus) {
        return (
          <Button
            mode="contained"
            compact
            onPress={() => sendFriendRequest(item.id)}
            disabled={processingIds.has(item.id)}
          >
            {t('friends.addFriend')}
          </Button>
        );
      }

      if (friendshipStatus.status === 'accepted') {
        return <Chip icon="check" compact>{t('friends.friend')}</Chip>;
      }

      if (friendshipStatus.status === 'pending') {
        if (friendshipStatus.is_requester) {
          return <Chip icon="clock" compact>{t('friends.sent')}</Chip>;
        } else {
          return <Chip icon="clock" compact>{t('friends.requestPending')}</Chip>;
        }
      }

      return (
        <Button
          mode="contained"
          compact
          onPress={() => sendFriendRequest(item.id)}
          disabled={processingIds.has(item.id)}
        >
          {t('friends.addFriend')}
        </Button>
      );
    };

    return (
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <TouchableOpacity onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}>
          <View style={styles.cardContent}>
            {item.avatar_url ? (
              <Avatar.Image size={56} source={{ uri: item.avatar_url }} />
            ) : (
              <Avatar.Text size={56} label={item.full_name?.charAt(0) || 'U'} style={{ backgroundColor: theme.colors.primaryContainer }} />
            )}
            <View style={styles.friendInfo}>
              <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>{item.full_name}</Text>
              {item.bio && <Text style={[styles.friendBio, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{item.bio}</Text>}
            </View>
            <View onStartShouldSetResponder={() => true}>
              {renderActionButton()}
            </View>
          </View>
        </TouchableOpacity>
      </Surface>
    );
  };

  const renderEmptyState = () => {
    let message = '';
    let icon = 'account-multiple';

    switch (activeTab) {
      case 'friends':
        message = t('friends.noFriends');
        icon = 'account-multiple';
        break;
      case 'requests':
        message = t('friends.noRequests');
        icon = 'account-clock';
        break;
      case 'sent':
        message = t('friends.noSentRequests');
        icon = 'send-clock';
        break;
      case 'search':
        message = searchQuery ? t('friends.noUsersFound') : t('friends.searchPlaceholder');
        icon = 'magnify';
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name={icon as any} size={64} color={theme.colors.onSurfaceVariant} />
        </View>
        <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>{message}</Text>
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
    <LinearGradient
      colors={
        isDarkMode
          ? [theme.colors.background, theme.colors.background]
          : [theme.colors.primaryContainer + '20', theme.colors.background]
      }
      style={styles.container}
    >
      {/* Tabs */}
      <Surface style={[styles.tabs, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Chip
          selected={activeTab === 'friends'}
          onPress={() => setActiveTab('friends')}
          style={[styles.tab, activeTab === 'friends' && { backgroundColor: theme.colors.secondaryContainer }]}
          icon="account-multiple"
        >
          {t('friends.tabs.friends')}
        </Chip>
        <Chip
          selected={activeTab === 'requests'}
          onPress={() => setActiveTab('requests')}
          style={[styles.tab, activeTab === 'requests' && { backgroundColor: theme.colors.secondaryContainer }]}
          icon="account-clock"
        >
          {t('friends.tabs.requests')} {friendRequests.length > 0 && `(${friendRequests.length})`}
        </Chip>
        <Chip
          selected={activeTab === 'sent'}
          onPress={() => setActiveTab('sent')}
          style={[styles.tab, activeTab === 'sent' && { backgroundColor: theme.colors.secondaryContainer }]}
          icon="send-clock"
        >
          {t('friends.tabs.sent')}
        </Chip>
        <Chip
          selected={activeTab === 'search'}
          onPress={() => setActiveTab('search')}
          style={[styles.tab, activeTab === 'search' && { backgroundColor: theme.colors.secondaryContainer }]}
          icon="magnify"
        >
          {t('common.search')}
        </Chip>
      </Surface>

      {/* Search bar for search tab */}
      {activeTab === 'search' && (
        <Searchbar
          placeholder={t('friends.searchUsers')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={searchUsers}
          style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
        />
      )}

      {/* List */}
      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={getTabData()}
          renderItem={getTabRenderItem()}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmptyState}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tab: {
    flex: 1,
  },
  searchBar: {
    margin: 12,
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 15,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
  },
  friendBio: {
    fontSize: 14,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
  },
  pendingChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
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
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});
