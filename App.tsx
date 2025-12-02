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
// NOTE: i18n is now initialized in LanguageContext, not here
import * as Sentry from '@sentry/react-native';
import { ActivityIndicator, View } from 'react-native';
import PrivacyConsentScreen, { checkPrivacyConsent } from './src/screens/PrivacyConsent/PrivacyConsentScreen';
import CommunityGuidelinesScreen, { checkGuidelinesConsent } from './src/screens/CommunityGuidelines/CommunityGuidelinesScreen';

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
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState<boolean>(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState<boolean>(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
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

  // Check privacy consent and guidelines when session exists
  useEffect(() => {
    const checkConsent = async () => {
      if (session) {
        const [hasAcceptedPrivacy, hasAcceptedGuidelines] = await Promise.all([
          checkPrivacyConsent(),
          checkGuidelinesConsent()
        ]);
        setPrivacyConsentAccepted(hasAcceptedPrivacy);
        setGuidelinesAccepted(hasAcceptedGuidelines);
      }
      setCheckingConsent(false);
    };

    checkConsent();
  }, [session]);

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

  // Show loading while auth is initializing
  if (loading || checkingConsent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show privacy consent screen if user is logged in but hasn't accepted
  if (session && !privacyConsentAccepted) {
    return (
      <ErrorBoundary>
        <PaperProvider theme={theme}>
          <PrivacyConsentScreen onAccept={() => setPrivacyConsentAccepted(true)} />
        </PaperProvider>
      </ErrorBoundary>
    );
  }

  // Show community guidelines screen if privacy accepted but guidelines not accepted
  if (session && privacyConsentAccepted && !guidelinesAccepted) {
    return (
      <ErrorBoundary>
        <PaperProvider theme={theme}>
          <CommunityGuidelinesScreen onAccept={() => setGuidelinesAccepted(true)} />
        </PaperProvider>
      </ErrorBoundary>
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
