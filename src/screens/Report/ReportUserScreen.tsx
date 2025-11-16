import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  RadioButton,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ReportUser'>;
  route: RouteProp<RootStackParamList, 'ReportUser'>;
};

const REPORT_TYPES = [
  { value: 'harassment', label: 'Taciz veya Zorbalık', icon: 'account-alert' },
  { value: 'spam', label: 'Spam veya Yanıltıcı İçerik', icon: 'alert-circle' },
  { value: 'inappropriate', label: 'Uygunsuz İçerik', icon: 'cancel' },
  { value: 'fake_profile', label: 'Sahte Profil', icon: 'account-off' },
  { value: 'other', label: 'Diğer', icon: 'dots-horizontal' },
];

export default function ReportUserScreen({ navigation, route }: Props) {
  const { userId, userName } = route.params;
  const { user } = useAuth();
  const [reportType, setReportType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!reportType) {
      Alert.alert('Uyarı', 'Lütfen bir şikayet türü seçin.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Uyarı', 'Lütfen şikayetinizi açıklayın.');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Uyarı', 'Açıklama en az 10 karakter olmalıdır.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.rpc('report_user', {
        p_reporter_id: user.id,
        p_reported_user_id: userId,
        p_report_type: reportType,
        p_description: description.trim(),
      });

      if (error) {
        if (error.message.includes('already reported')) {
          Alert.alert('Bilgi', 'Bu kullanıcıyı yakın zamanda zaten şikayet ettiniz.');
        } else {
          console.error('Error reporting user:', error);
          Alert.alert('Hata', 'Şikayet gönderilirken bir hata oluştu.');
        }
      } else {
        Alert.alert(
          'Başarılı',
          'Şikayetiniz alındı. İnceleme sonucu size bildirilecektir.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      Alert.alert('Hata', 'Şikayet gönderilirken bir hata oluştu.');
    }

    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard} mode="outlined">
        <Card.Content>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="shield-alert" size={40} color="#f44336" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Kullanıcıyı Şikayet Et</Text>
              <Text style={styles.subtitle}>{userName}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.infoCard} mode="outlined">
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information" size={24} color="#6200ee" />
            <Text style={styles.infoText}>
              Şikayetiniz gizli tutulacak ve ekibimiz tarafından incelenecektir. Yanlış veya
              kötü niyetli şikayetler hesabınıza yaptırım uygulanmasına neden olabilir.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.formCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>Şikayet Türü</Text>
          <RadioButton.Group onValueChange={setReportType} value={reportType}>
            {REPORT_TYPES.map((type) => (
              <View key={type.value} style={styles.radioItem}>
                <View style={styles.radioLabel}>
                  <MaterialCommunityIcons
                    name={type.icon as any}
                    size={24}
                    color={reportType === type.value ? '#6200ee' : '#999'}
                  />
                  <Text
                    style={[
                      styles.radioText,
                      reportType === type.value && styles.radioTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </View>
                <RadioButton value={type.value} />
              </View>
            ))}
          </RadioButton.Group>

          <Text style={[styles.sectionTitle, styles.marginTop]}>Açıklama</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={6}
            placeholder="Şikayetinizi detaylı olarak açıklayın... (En az 10 karakter)"
            value={description}
            onChangeText={setDescription}
            style={styles.textInput}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={submitting || !reportType || description.trim().length < 10}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            loading={submitting}
          >
            {submitting ? 'Gönderiliyor...' : 'Şikayeti Gönder'}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 15,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#e3f2fd',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  formCard: {
    margin: 15,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  marginTop: {
    marginTop: 24,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  radioLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  radioTextSelected: {
    fontWeight: '600',
    color: '#6200ee',
  },
  textInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    marginTop: 20,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
