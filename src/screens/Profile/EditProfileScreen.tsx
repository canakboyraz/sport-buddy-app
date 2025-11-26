import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, ActivityIndicator, HelperText } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Profile } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { validateBio, validateName } from '../../utils/validation';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [favoriteSports, setFavoriteSports] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({
    fullName: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setLoading(false);

    if (!error && data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setBio(data.bio || '');
      setCity(data.city || '');
      setFavoriteSports(data.favorite_sports || '');
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      fullName: '',
      phone: '',
      bio: '',
    };

    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = 'Ad Soyad gereklidir';
    } else if (!validateName(fullName)) {
      newErrors.fullName = 'Ad Soyad en az 2 karakter olmalıdır';
    }

    // Validate phone
    if (phone && !/^[0-9]{10,11}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası girin (10-11 rakam)';
    }

    // Validate bio
    if (bio) {
      const bioValidation = validateBio(bio);
      if (!bioValidation.isValid) {
        newErrors.bio = bioValidation.message || '';
      }
    }

    setErrors(newErrors);
    return !newErrors.fullName && !newErrors.phone && !newErrors.bio;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        favorite_sports: favoriteSports.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
      console.error('Profile update error:', error);
    } else {
      Alert.alert('Başarılı', 'Profiliniz güncellendi', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TextInput
        label="Ad Soyad *"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        style={styles.input}
        error={!!errors.fullName}
      />
      <HelperText type="error" visible={!!errors.fullName}>
        {errors.fullName}
      </HelperText>

      <TextInput
        label="Telefon"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        style={styles.input}
        keyboardType="phone-pad"
        placeholder="5XX XXX XX XX"
        error={!!errors.phone}
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>

      <TextInput
        label="Şehir"
        value={city}
        onChangeText={setCity}
        mode="outlined"
        style={styles.input}
        placeholder="İstanbul"
      />

      <TextInput
        label="Favori Sporlar"
        value={favoriteSports}
        onChangeText={setFavoriteSports}
        mode="outlined"
        style={styles.input}
        placeholder="Futbol, Basketbol, Tenis"
        multiline
        numberOfLines={2}
      />

      <TextInput
        label="Hakkımda"
        value={bio}
        onChangeText={setBio}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder="Kendiniz hakkında birkaç kelime yazın..."
      />

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      >
        Kaydet
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        disabled={saving}
        style={styles.cancelButton}
      >
        İptal
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 5,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  cancelButton: {
    marginBottom: 20,
  },
});
