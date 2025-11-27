import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Avatar, ActivityIndicator, Surface, Chip, IconButton, useTheme as usePaperTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Notification, NotificationType } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '../../utils/dateLocale';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
  navigation: any;
}

export default function NotificationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const theme = usePaperTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useFocusEffect(
    useCallback(() => {
      loadNotifications();

      // Subscribe to new notifications
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        }, () => {
          loadNotifications();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }, [user, filter])
  );

  const loadNotifications = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(id, full_name, avatar_url),
          session:sport_sessions!notifications_session_id_fkey(id, title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
        navigation.navigate('Friends');
        break;
      case 'session_join_request':
      case 'session_join_approved':
      case 'session_reminder':
        if (notification.data?.sessionId) {
          navigation.navigate('SessionDetail', { sessionId: notification.data.sessionId });
        }
        break;
      case 'new_message':
        if (notification.data?.sessionId) {
          navigation.navigate('Chat', { sessionId: notification.data.sessionId });
        }
        break;
      case 'achievement_unlocked':
        navigation.navigate('Achievements');
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return 'account-plus';
      case 'session_join_request':
        return 'account-clock';
      case 'session_join_approved':
        return 'check-circle';
      case 'session_join_rejected':
        return 'close-circle';
      case 'session_reminder':
        return 'bell-ring';
      case 'new_message':
        return 'message';
      case 'rating_received':
        return 'star';
      case 'achievement_unlocked':
        return 'trophy';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return '#2196F3';
      case 'session_join_approved':
        return '#4CAF50';
      case 'session_join_rejected':
        return '#F44336';
      case 'session_reminder':
        return '#FF9800';
      case 'new_message':
        return '#9C27B0';
      case 'rating_received':
        return '#FFD700';
      case 'achievement_unlocked':
        return '#FF5722';
      default:
        return theme.colors.primary;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity onPress={() => handleNotificationPress(item)}>
      <Surface
        style={[
          styles.notificationCard,
          { backgroundColor: theme.colors.surface },
          !item.is_read && { backgroundColor: theme.colors.primaryContainer + '20' }
        ]}
        elevation={1}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
            <MaterialCommunityIcons
              name={getNotificationIcon(item.type) as any}
              size={24}
              color={getNotificationColor(item.type)}
            />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.is_read && (
                <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
              )}
            </View>
            <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
                locale: getDateLocale()
              })}
            </Text>
          </View>

          <IconButton
            icon="close"
            size={20}
            iconColor={theme.colors.onSurfaceVariant}
            onPress={(e) => {
              e?.stopPropagation();
              deleteNotification(item.id);
            }}
          />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name="bell-outline" size={64} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
        {filter === 'unread' ? t('notifications.noUnreadNotifications') : t('notifications.noNotifications')}
      </Text>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={
        isDarkMode
          ? [theme.colors.background, theme.colors.background]
          : [theme.colors.primaryContainer + '20', theme.colors.background]
      }
      style={styles.container}
    >
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.filterContainer}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={[filter === 'all' && { backgroundColor: theme.colors.secondaryContainer }]}
          >
            {t('notifications.all')}
          </Chip>
          <Chip
            selected={filter === 'unread'}
            onPress={() => setFilter('unread')}
            style={[filter === 'unread' && { backgroundColor: theme.colors.secondaryContainer }]}
          >
            {t('notifications.unread')} {unreadCount > 0 && `(${unreadCount})`}
          </Chip>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>
              {t('notifications.markAllRead')}
            </Text>
          </TouchableOpacity>
        )}
      </Surface>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
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
  header: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  markAllButton: {
    alignSelf: 'flex-end',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  notificationCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
