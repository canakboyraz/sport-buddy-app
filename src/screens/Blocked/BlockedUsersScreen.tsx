import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Button, Avatar, Divider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

interface BlockedUser {
  block_id: number;
  blocked_user_id: string;
  blocked_user_name: string;
  blocked_user_avatar: string | null;
  reason: string | null;
  blocked_at: string;
}

export default function BlockedUsersScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBlockedUsers();
    }
  }, [user]);

  const loadBlockedUsers = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_blocked_users', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error loading blocked users:', error);
      } else {
        setBlockedUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }

    setLoading(false);
  };

  const handleUnblock = async (blockedUserId: string, blockedUserName: string) => {
    if (!user) return;

    Alert.alert(
      'Engeli Kaldır',
      `${blockedUserName} kullanıcısının engelini kaldırmak istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Engeli Kaldır',
          style: 'destructive',
          onPress: async () => {
            setUnblocking(blockedUserId);

            try {
              const { error } = await supabase.rpc('unblock_user', {
                p_blocker_id: user.id,
                p_blocked_id: blockedUserId,
              });

              if (error) {
                console.error('Error unblocking user:', error);
                Alert.alert('Hata', 'Engel kaldırılırken bir hata oluştu.');
              } else {
                Alert.alert('Başarılı', `${blockedUserName} engeliniz kaldırıldı.`);
                loadBlockedUsers();
              }
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Hata', 'Engel kaldırılırken bir hata oluştu.');
            }

            setUnblocking(null);
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Şimdi';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} dakika önce`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} saat önce`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="account-off" size={100} color="#ccc" />
        <Text style={styles.emptyTitle}>Engellenmiş Kullanıcı Yok</Text>
        <Text style={styles.emptyText}>
          Henüz hiç kullanıcı engellemediniz.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.infoCard} mode="outlined">
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information" size={24} color="#6200ee" />
            <Text style={styles.infoText}>
              Engellediğiniz kullanıcılar size mesaj gönderemez ve etkinliklerinize katılamazlar.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {blockedUsers.length} engellenmiş kullanıcı
        </Text>
      </View>

      {blockedUsers.map((blockedUser, index) => (
        <React.Fragment key={blockedUser.block_id}>
          <Card style={styles.userCard} mode="elevated">
            <Card.Content>
              <View style={styles.userRow}>
                <View style={styles.userInfo}>
                  {blockedUser.blocked_user_avatar ? (
                    <Avatar.Image
                      size={56}
                      source={{ uri: blockedUser.blocked_user_avatar }}
                    />
                  ) : (
                    <Avatar.Icon size={56} icon="account" />
                  )}
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{blockedUser.blocked_user_name}</Text>
                    <Text style={styles.blockedDate}>
                      Engellenme: {formatDate(blockedUser.blocked_at)}
                    </Text>
                    {blockedUser.reason && (
                      <View style={styles.reasonContainer}>
                        <MaterialCommunityIcons
                          name="comment-text-outline"
                          size={14}
                          color="#666"
                        />
                        <Text style={styles.reasonText}>{blockedUser.reason}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <IconButton
                  icon="account-remove"
                  iconColor="#f44336"
                  size={24}
                  onPress={() =>
                    handleUnblock(blockedUser.blocked_user_id, blockedUser.blocked_user_name)
                  }
                  disabled={unblocking === blockedUser.blocked_user_id}
                />
              </View>
            </Card.Content>
          </Card>
          {index < blockedUsers.length - 1 && <Divider style={styles.divider} />}
        </React.Fragment>
      ))}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  infoCard: {
    margin: 15,
    marginBottom: 10,
    backgroundColor: '#e3f2fd',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  countContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  userCard: {
    marginHorizontal: 15,
    marginVertical: 5,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  blockedDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  divider: {
    marginHorizontal: 15,
  },
});
