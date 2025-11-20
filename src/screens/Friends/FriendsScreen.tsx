import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, Avatar, ActivityIndicator, Searchbar, Chip, Divider, IconButton } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { friendService, FriendshipStatus } from '../../services/friendService';

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

export default function FriendsScreen() {
  const { user } = useAuth();
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
    setFriendRequests(data as any);
  };

  const loadSentRequests = async () => {
    if (!user) return;
    const data = await friendService.getSentRequests(user.id);
    setSentRequests(data as any);
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
      Alert.alert('Başarılı', 'Arkadaşlık isteği gönderildi');
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      Alert.alert('Hata', error.message || 'Arkadaşlık isteği gönderilemedi');
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
      Alert.alert('Başarılı', 'Arkadaşlık isteği kabul edildi');
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Hata', 'İstek kabul edilemedi');
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
      Alert.alert('Başarılı', 'İstek reddedildi');
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Hata', 'İstek reddedilemedi');
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
      Alert.alert('Başarılı', 'İstek iptal edildi');
    } catch (error: any) {
      console.error('Error canceling friend request:', error);
      Alert.alert('Hata', 'İstek iptal edilemedi');
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(friendshipId);
      return newSet;
    });
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;

    Alert.alert('Arkadaşı Sil', 'Arkadaş listenden çıkarmak istiyor musun?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setProcessingIds(prev => new Set(prev).add(friendId));

          try {
            await friendService.removeFriend(friendId, user.id);
            await loadFriends();
            Alert.alert('Başarılı', 'Arkadaş silindi');
          } catch (error: any) {
            console.error('Error removing friend:', error);
            Alert.alert('Hata', 'Arkadaş silinemedi');
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
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.cardContent}>
        {item.avatar_url ? (
          <Avatar.Image size={50} source={{ uri: item.avatar_url }} />
        ) : (
          <Avatar.Text size={50} label={item.full_name?.charAt(0) || 'U'} />
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.full_name}</Text>
          {item.bio && <Text style={styles.friendBio} numberOfLines={1}>{item.bio}</Text>}
        </View>
        <IconButton
          icon="account-remove"
          size={24}
          onPress={() => removeFriend(item.id)}
          disabled={processingIds.has(item.id)}
        />
      </Card.Content>
    </Card>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.cardContent}>
        {item.requester.avatar_url ? (
          <Avatar.Image size={50} source={{ uri: item.requester.avatar_url }} />
        ) : (
          <Avatar.Text size={50} label={item.requester.full_name?.charAt(0) || 'U'} />
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.requester.full_name}</Text>
          {item.requester.bio && <Text style={styles.friendBio} numberOfLines={1}>{item.requester.bio}</Text>}
        </View>
        <View style={styles.requestActions}>
          <IconButton
            icon="check"
            size={24}
            iconColor="#4CAF50"
            onPress={() => acceptFriendRequest(item.id)}
            disabled={processingIds.has(item.id)}
          />
          <IconButton
            icon="close"
            size={24}
            iconColor="#F44336"
            onPress={() => rejectFriendRequest(item.id)}
            disabled={processingIds.has(item.id)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.cardContent}>
        {item.target.avatar_url ? (
          <Avatar.Image size={50} source={{ uri: item.target.avatar_url }} />
        ) : (
          <Avatar.Text size={50} label={item.target.full_name?.charAt(0) || 'U'} />
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.target.full_name}</Text>
          <Chip icon="clock" compact style={styles.pendingChip}>Bekliyor</Chip>
        </View>
        <IconButton
          icon="close"
          size={24}
          onPress={() => cancelFriendRequest(item.id)}
          disabled={processingIds.has(item.id)}
        />
      </Card.Content>
    </Card>
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
            Arkadaş Ekle
          </Button>
        );
      }

      if (friendshipStatus.status === 'accepted') {
        return <Chip icon="check" compact>Arkadaş</Chip>;
      }

      if (friendshipStatus.status === 'pending') {
        if (friendshipStatus.is_requester) {
          return <Chip icon="clock" compact>Gönderildi</Chip>;
        } else {
          return <Chip icon="clock" compact>İstek Var</Chip>;
        }
      }

      return (
        <Button
          mode="contained"
          compact
          onPress={() => sendFriendRequest(item.id)}
          disabled={processingIds.has(item.id)}
        >
          Arkadaş Ekle
        </Button>
      );
    };

    return (
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          {item.avatar_url ? (
            <Avatar.Image size={50} source={{ uri: item.avatar_url }} />
          ) : (
            <Avatar.Text size={50} label={item.full_name?.charAt(0) || 'U'} />
          )}
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{item.full_name}</Text>
            {item.bio && <Text style={styles.friendBio} numberOfLines={1}>{item.bio}</Text>}
          </View>
          {renderActionButton()}
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => {
    let message = '';
    let icon = 'account-multiple';

    switch (activeTab) {
      case 'friends':
        message = 'Henüz arkadaşınız yok';
        icon = 'account-multiple';
        break;
      case 'requests':
        message = 'Yeni arkadaşlık isteği yok';
        icon = 'account-clock';
        break;
      case 'sent':
        message = 'Gönderilen istek yok';
        icon = 'send-clock';
        break;
      case 'search':
        message = searchQuery ? 'Kullanıcı bulunamadı' : 'Kullanıcı aramak için yazın';
        icon = 'magnify';
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name={icon as any} size={64} color="#ccc" />
        <Text style={styles.emptyText}>{message}</Text>
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
      {/* Tabs */}
      <View style={styles.tabs}>
        <Chip
          selected={activeTab === 'friends'}
          onPress={() => setActiveTab('friends')}
          style={styles.tab}
          icon="account-multiple"
        >
          Arkadaşlar
        </Chip>
        <Chip
          selected={activeTab === 'requests'}
          onPress={() => setActiveTab('requests')}
          style={styles.tab}
          icon="account-clock"
        >
          İstekler {friendRequests.length > 0 && `(${friendRequests.length})`}
        </Chip>
        <Chip
          selected={activeTab === 'sent'}
          onPress={() => setActiveTab('sent')}
          style={styles.tab}
          icon="send-clock"
        >
          Gönderilen
        </Chip>
        <Chip
          selected={activeTab === 'search'}
          onPress={() => setActiveTab('search')}
          style={styles.tab}
          icon="magnify"
        >
          Ara
        </Chip>
      </View>

      <Divider />

      {/* Search bar for search tab */}
      {activeTab === 'search' && (
        <Searchbar
          placeholder="Kullanıcı ara..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={searchUsers}
          style={styles.searchBar}
        />
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={getTabData()}
          renderItem={getTabRenderItem()}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  tabs: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  tab: {
    flex: 1,
  },
  searchBar: {
    margin: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 10,
  },
  card: {
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 15,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  friendBio: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});
