import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
