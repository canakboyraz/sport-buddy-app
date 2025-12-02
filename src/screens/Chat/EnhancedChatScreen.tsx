import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, Avatar, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Message } from '../../types';
import { format } from 'date-fns';
import { StackNavigationProp } from '@react-navigation/stack';
import { getDateLocale } from '../../utils/dateLocale';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { pickImageFromGallery } from '../../services/imageService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { moderateChatMessage, checkRateLimit } from '../../services/contentModerationService';
import { getBlockedUserIds, getBlockerUserIds } from '../../services/blockService';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

type Props = {
  navigation: ChatScreenNavigationProp;
  route: ChatScreenRouteProp;
};

export default function EnhancedChatScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadBlockedUsers();
    }
  }, [user]);

  useEffect(() => {
    loadMessages();
    markMessagesAsRead();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`session-${sessionId}-messages`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadMessages();
            markMessagesAsRead();
          } else if (payload.eventType === 'UPDATE') {
            loadMessages();
          }
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`session-${sessionId}-typing`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          loadTypingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      setTypingIndicator(false);
    };
  }, [sessionId, blockedUserIds]);

  const loadBlockedUsers = async () => {
    if (!user) return;

    try {
      const [blocked, blockers] = await Promise.all([
        getBlockedUserIds(user.id),
        getBlockerUserIds(user.id)
      ]);

      // Combine both lists - hide messages from users we blocked and users who blocked us
      const allBlockedIds = [...new Set([...blocked, ...blockers])];
      setBlockedUserIds(allBlockedIds);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:profiles(*)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Filter out messages from blocked users
      const filteredMessages = data.filter(msg => !blockedUserIds.includes(msg.user_id));
      setMessages(filteredMessages);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    await supabase
      .from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .neq('user_id', user.id)
      .eq('is_read', false);
  };

  const loadTypingUsers = async () => {
    const { data } = await supabase
      .from('typing_indicators')
      .select('user:profiles(full_name)')
      .eq('session_id', sessionId)
      .eq('is_typing', true)
      .neq('user_id', user?.id || '');

    if (data) {
      const names = data.map((item: any) => item.user?.full_name).filter(Boolean);
      setTypingUsers(names);
    } else {
      setTypingUsers([]);
    }
  };

  const setTypingIndicator = async (isTyping: boolean) => {
    if (!user) return;

    if (isTyping) {
      await supabase
        .from('typing_indicators')
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          is_typing: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'session_id,user_id'
        });
    } else {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);

    // Set typing indicator
    setTypingIndicator(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Remove typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTypingIndicator(false);
    }, 3000);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    // Check rate limit
    if (checkRateLimit(user.id, 10, 60000)) {
      Alert.alert(
        t('chat.rateLimitTitle'),
        t('chat.rateLimitMessage')
      );
      return;
    }

    // Content moderation check
    const moderationResult = moderateChatMessage(newMessage);
    if (!moderationResult.isAllowed) {
      Alert.alert(
        t('chat.contentWarningTitle'),
        moderationResult.reason || t('chat.contentWarningMessage')
      );
      return;
    }

    setSending(true);
    setTypingIndicator(false);

    const { error } = await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      content: moderationResult.filteredContent || newMessage.trim(),
    });

    setSending(false);

    if (!error) {
      setNewMessage('');
    } else {
      Alert.alert(t('common.error'), t('chat.sendError'));
    }
  };

  const handleImagePick = async () => {
    const result = await pickImageFromGallery();
    if (result && user) {
      setUploadingImage(true);

      // Upload image to Supabase Storage
      const fileName = `chat/${sessionId}/${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: result.uri,
        type: 'image/jpeg',
        name: fileName,
      } as any);

      try {
        const arrayBuffer = await fetch(result.uri).then(r => r.arrayBuffer());

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, arrayBuffer, {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        // Send message with image
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          user_id: user.id,
          content: '',
          image_url: publicUrl,
        });

      } catch (error) {
        console.error('Image upload error:', error);
        Alert.alert(t('common.error'), t('chat.uploadError'));
      }

      setUploadingImage(false);
    }
  };

  const handleReportMessage = (messageId: number, senderId: string, senderName: string) => {
    Alert.alert(
      t('chat.reportMessage'),
      t('chat.reportMessageConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.report'),
          style: 'destructive',
          onPress: () => {
            navigation.navigate('ReportUser', {
              userId: senderId,
              userName: senderName,
            });
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.user_id === user?.id;
    const hasImage = !!item.image_url;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => {
          if (!isOwnMessage) {
            handleReportMessage(item.id, item.user_id, item.user?.full_name);
          }
        }}
        delayLongPress={500}
      >
        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {!isOwnMessage && (
            <Avatar.Text
              size={32}
              label={item.user?.full_name?.charAt(0) || 'U'}
              style={styles.avatar}
            />
          )}
          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? { backgroundColor: theme.colors.primary }
                : {
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.outline
                  },
            ]}
          >
            {!isOwnMessage && (
              <Text style={[styles.senderName, { color: theme.colors.primary }]}>
                {item.user?.full_name}
              </Text>
            )}

            {hasImage && (
              <Image source={{ uri: item.image_url }} style={styles.messageImage} />
            )}

            {item.content && (
              <Text style={[
                styles.messageText,
                { color: isOwnMessage ? theme.colors.onPrimary : theme.colors.onSurface }
              ]}>
                {item.content}
              </Text>
            )}

            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                { color: isOwnMessage ? 'rgba(255, 255, 255, 0.8)' : theme.colors.onSurfaceVariant }
              ]}>
                {format(new Date(item.created_at), 'HH:mm', { locale: getDateLocale() })}
              </Text>
              {isOwnMessage && item.is_read && (
                <MaterialCommunityIcons
                  name="check-all"
                  size={16}
                  color="rgba(255, 255, 255, 0.8)"
                  style={styles.readIcon}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          typingUsers.length > 0 ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.typingText, { color: theme.colors.onSurfaceVariant }]}>
                {typingUsers.join(', ')} {t('chat.typing')}
              </Text>
            </View>
          ) : null
        }
      />

      <View style={[
        styles.inputContainer,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline
        }
      ]}>
        <IconButton
          icon="image"
          size={24}
          onPress={handleImagePick}
          disabled={uploadingImage}
        />
        <TextInput
          value={newMessage}
          onChangeText={handleTextChange}
          placeholder={t('chat.typeMessage')}
          mode="outlined"
          style={styles.input}
          multiline
          maxLength={500}
        />
        <IconButton
          icon="send"
          size={24}
          onPress={handleSend}
          disabled={sending || (!newMessage.trim() && !uploadingImage)}
          iconColor={theme.colors.primary}
        />
      </View>

      {uploadingImage && (
        <View style={[styles.uploadingOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.uploadingText}>{t('chat.uploadingImage')}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 12,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  readIcon: {
    marginLeft: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginHorizontal: 5,
    maxHeight: 100,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
});
