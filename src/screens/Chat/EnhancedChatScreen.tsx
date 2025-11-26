import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, Avatar, IconButton, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Message } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { pickImageFromGallery } from '../../services/imageService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

type Props = {
  navigation: ChatScreenNavigationProp;
  route: ChatScreenRouteProp;
};

export default function EnhancedChatScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [sessionId]);

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
      setMessages(data);
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

    setSending(true);
    setTypingIndicator(false);

    const { error } = await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      content: newMessage.trim(),
    });

    setSending(false);

    if (!error) {
      setNewMessage('');
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
        Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
      }

      setUploadingImage(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.user_id === user?.id;
    const hasImage = !!item.image_url;

    return (
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
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {!isOwnMessage && (
            <Text style={styles.senderName}>{item.user?.full_name}</Text>
          )}

          {hasImage && (
            <Image source={{ uri: item.image_url }} style={styles.messageImage} />
          )}

          {item.content && (
            <Text style={isOwnMessage ? styles.ownMessageText : styles.messageText}>
              {item.content}
            </Text>
          )}

          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && { color: 'rgba(255, 255, 255, 0.8)' }]}>
              {format(new Date(item.created_at), 'HH:mm', { locale: tr })}
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
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
              <ActivityIndicator size="small" color="#6200ee" />
              <Text style={styles.typingText}>
                {typingUsers.join(', ')} yazıyor...
              </Text>
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <IconButton
          icon="image"
          size={24}
          onPress={handleImagePick}
          disabled={uploadingImage}
        />
        <TextInput
          value={newMessage}
          onChangeText={handleTextChange}
          placeholder="Mesaj yaz..."
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
          iconColor="#6200ee"
        />
      </View>

      {uploadingImage && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.uploadingText}>Fotoğraf yükleniyor...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  ownBubble: {
    backgroundColor: '#B39DDB',
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#6200ee',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  ownMessageText: {
    fontSize: 16,
    color: 'white',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
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
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
