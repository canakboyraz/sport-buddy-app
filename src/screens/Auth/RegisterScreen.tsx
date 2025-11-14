import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
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
        full_name: fullName,
        phone: phone || null,
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <Text style={styles.title}>Kayıt Ol</Text>
          <Text style={styles.subtitle}>Sport Buddy'e katıl!</Text>

          <TextInput
            label="Ad Soyad *"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="E-posta *"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            label="Telefon"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TextInput
            label="Şifre *"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#6200ee',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
  loginButton: {
    marginTop: 15,
  },
});
