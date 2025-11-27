import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from './src/services/notificationService';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { i18nInitPromise } from './src/i18n'; // Initialize i18n
import * as Sentry from '@sentry/react-native';
import { ActivityIndicator, View } from 'react-native';

// Initialize Sentry (only if DSN is configured)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn && !sentryDsn.includes('your-sentry-dsn')) {
  Sentry.init({
    dsn: sentryDsn,
    enableInExpoDevelopment: false, // Disable in development
    debug: __DEV__, // Enable debug in development
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
    environment: __DEV__ ? 'development' : 'production',
    integrations: [
      new Sentry.ReactNativeTracing({
        // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
        tracePropagationTargets: ['localhost', /^https:\/\/.*\.supabase\.co/],
      }),
    ],
  });
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [i18nReady, setI18nReady] = useState(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { theme } = useTheme();

  // Wait for i18n to be initialized
  useEffect(() => {
    i18nInitPromise.then(() => {
      console.log('[App] i18n initialization complete');
      setI18nReady(true);
    }).catch((error) => {
      console.error('[App] i18n initialization failed:', error);
      // Still set ready to avoid blocking the app
      setI18nReady(true);
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Push notification kurulumu
  useEffect(() => {
    if (session?.user) {
      // Push notification token'ı al ve kaydet
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          savePushTokenToDatabase(session.user.id, token);
        }
      });

      // Bildirim dinleyicilerini ekle
      notificationListener.current = addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = addNotificationResponseListener(response => {
        // Bildirime tıklandığında ilgili ekrana yönlendir
        const notificationData = response.notification.request.content.data;

        if (notificationData?.sessionId && navigationRef.current?.isReady()) {
          // Bildirim türüne göre yönlendirme yap
          if (notificationData.type === 'rating_reminder' ||
              notificationData.type === 'session_reminder' ||
              notificationData.type === 'join_request' ||
              notificationData.type === 'join_approved' ||
              notificationData.type === 'participant_joined') {
            // Seans detay sayfasına git
            navigationRef.current.navigate('SessionDetail', {
              sessionId: notificationData.sessionId
            });
          } else if (notificationData.type === 'new_message') {
            // Chat sayfasına git
            navigationRef.current.navigate('Chat', {
              sessionId: notificationData.sessionId
            });
          }
        }
      });

      return () => {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      };
    }
  }, [session]);

  // Show loading while i18n or auth is initializing
  if (!i18nReady || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <NavigationContainer ref={navigationRef} theme={theme}>
          {session ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LanguageProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Wrap with Sentry for error tracking (only if Sentry is initialized)
export default sentryDsn && !sentryDsn.includes('your-sentry-dsn') ? Sentry.wrap(App) : App;
