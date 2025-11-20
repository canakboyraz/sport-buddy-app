import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import ErrorBoundary from './src/components/ErrorBoundary';
import './src/i18n'; // Initialize i18n
import * as Sentry from '@sentry/react-native';

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
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const { theme } = useTheme();

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
        // TODO: Handle notification received (e.g., update badge count)
      });

      responseListener.current = addNotificationResponseListener(response => {
        // TODO: Handle notification tap - navigate to relevant screen
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [session]);

  if (loading) {
    return null;
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme}>
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
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Wrap with Sentry for error tracking (only if Sentry is initialized)
export default sentryDsn && !sentryDsn.includes('your-sentry-dsn') ? Sentry.wrap(App) : App;
