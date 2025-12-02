import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { TextInput, Button, Text, Avatar, useTheme, ActivityIndicator, IconButton, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { getChatbotResponse } from '../../services/aiService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

export default function AIAssistantScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t('aiAssistant.welcomeMessage'),
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Quick action suggestions
  const quickActions = [
    { icon: 'calendar-search', text: t('aiAssistant.findEvents'), query: t('aiAssistant.findEventsQuery') },
    { icon: 'run', text: t('aiAssistant.sportTips'), query: t('aiAssistant.sportTipsQuery') },
    { icon: 'help-circle', text: t('aiAssistant.howToUse'), query: t('aiAssistant.howToUseQuery') },
  ];

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      // Get AI response
      const response = await getChatbotResponse(messageText, {
        userName: user?.user_metadata?.full_name,
        language: t('common.languageCode') as 'tr' | 'en',
      });

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: t('aiAssistant.errorMessage'),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    handleSend(query);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        {!item.isUser && (
          <Avatar.Icon
            size={32}
            icon="robot"
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            item.isUser
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: item.isUser ? theme.colors.onPrimary : theme.colors.onSurface }
            ]}
          >
            {item.text}
          </Text>
        </View>
        {item.isUser && (
          <Avatar.Icon
            size={32}
            icon="account"
            style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}
          />
        )}
      </View>
    );
  };

  const renderQuickActions = () => {
    if (messages.length > 1) return null; // Only show on first screen

    return (
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.quickActionsTitle, { color: theme.colors.onSurfaceVariant }]}>
          {t('aiAssistant.quickActions')}
        </Text>
        {quickActions.map((action, index) => (
          <Card
            key={index}
            style={styles.quickActionCard}
            onPress={() => handleQuickAction(action.query)}
          >
            <Card.Content style={styles.quickActionContent}>
              <MaterialCommunityIcons
                name={action.icon as any}
                size={24}
                color={theme.colors.primary}
              />
              <Text style={[styles.quickActionText, { color: theme.colors.onSurface }]}>
                {action.text}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          ListFooterComponent={renderQuickActions}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              SportBot {t('aiAssistant.thinking')}
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            mode="outlined"
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('aiAssistant.typeMessage')}
            style={styles.input}
            multiline
            maxLength={500}
            disabled={isLoading}
            onSubmitEditing={() => handleSend()}
            right={
              <TextInput.Icon
                icon="send"
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    padding: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    maxHeight: 100,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickActionCard: {
    marginBottom: 8,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 15,
    marginLeft: 12,
  },
});
