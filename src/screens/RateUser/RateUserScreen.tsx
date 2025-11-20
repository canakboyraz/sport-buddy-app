import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type RateUserScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RateUser'>;
type RateUserScreenRouteProp = RouteProp<RootStackParamList, 'RateUser'>;

type Props = {
  navigation: RateUserScreenNavigationProp;
  route: RateUserScreenRouteProp;
};

export default function RateUserScreen({ navigation, route }: Props) {
  const { sessionId, userId, userName } = route.params;
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Hata', 'Lütfen bir puan seçin');
      return;
    }

    if (!user) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('ratings').insert({
      session_id: sessionId,
      rated_user_id: userId,
      rater_user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });

    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Hata', 'Bu kullanıcıyı bu seans için zaten değerlendirdiniz');
      } else {
        Alert.alert('Hata', error.message);
      }
    } else {
      Alert.alert('Başarılı', 'Değerlendirmeniz kaydedildi', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={48}
            color={star <= rating ? '#FFD700' : '#ccc'}
            onPress={() => setRating(star)}
            style={styles.star}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Kullanıcıyı Değerlendir</Text>
        <Text style={styles.userName}>{userName}</Text>

        <Text style={styles.label}>Puan:</Text>
        {renderStars()}

        <TextInput
          label="Yorum (İsteğe bağlı)"
          value={comment}
          onChangeText={setComment}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
          maxLength={500}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || rating === 0}
          style={styles.button}
        >
          Değerlendirmeyi Kaydet
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    textAlign: 'center',
    color: '#6200ee',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  star: {
    marginHorizontal: 5,
  },
  input: {
    marginBottom: 20,
  },
  button: {
    paddingVertical: 8,
  },
});
