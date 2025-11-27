import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { validateEmail, validatePassword, validateName } from '../../utils/validation';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useTranslation } from 'react-i18next';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun');
      return;
    }

    if (!validateName(fullName)) {
      Alert.alert('Hata', 'Ad Soyad en az 2 karakter olmalıdır');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert('Hata', passwordValidation.message || 'Geçersiz şifre');
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      Alert.alert('Kayıt Hatası', authError.message);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });

      setLoading(false);

      if (profileError) {
        Alert.alert('Profil Hatası', profileError.message);
      } else {
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu!', [
          { text: 'Tamam', onPress: () => navigation.navigate('Login') },
        ]);
      }
    }
  };

  return (
    <LinearGradient
      colors={theme.dark
        ? [theme.colors.primaryContainer, theme.colors.secondaryContainer]
        : ['#6200ee', '#9c27b0']
      }
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>Kayıt Ol</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Sport Buddy'e katıl!</Text>

            <TextInput
              label="Ad Soyad *"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="E-posta *"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              left={<TextInput.Icon icon="email" />}
            />

            <TextInput
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              left={<TextInput.Icon icon="phone" />}
            />

            <TextInput
              label="Şifre *"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              left={<TextInput.Icon icon="lock" />}
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ height: 48 }}
            >
              Kayıt Ol
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
            >
              Zaten hesabın var mı? Giriş Yap
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  loginButton: {
    marginTop: 16,
  },
});
