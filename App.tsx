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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

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
        console.log('Bildirim alındı:', notification);
      });

      responseListener.current = addNotificationResponseListener(response => {
        console.log('Bildirim tıklandı:', response);
        // Burada navigation yapılabilir
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
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          {session ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
