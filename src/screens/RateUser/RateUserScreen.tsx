import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Animated } from 'react-native';
import { Text, TextInput, Button, Card, Chip, ActivityIndicator, Avatar } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { submitRating, canRateSession } from '../../services/ratingService';
import { useTheme } from '../../contexts/ThemeContext';

type RateUserScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RateUser'>;
type RateUserScreenRouteProp = RouteProp<RootStackParamList, 'RateUser'>;

type Props = {
  navigation: RateUserScreenNavigationProp;
  route: RateUserScreenRouteProp;
};

export default function RateUserScreen({ navigation, route }: Props) {
  const { sessionId, userId, userName } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [canRate, setCanRate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scaleAnims] = useState([1, 2, 3, 4, 5].map(() => new Animated.Value(1)));

  useEffect(() => {
    checkRatingEligibility();
  }, [sessionId]);

  const checkRatingEligibility = async () => {
    setCheckingEligibility(true);
    const result = await canRateSession(sessionId);
    setCanRate(result.canRate);
    if (!result.canRate && result.reason) {
      setErrorMessage(result.reason);
    }
    setCheckingEligibility(false);
  };

  const handleStarPress = (star: number) => {
    setRating(star);
    // Animate the selected star
    Animated.sequence([
      Animated.timing(scaleAnims[star - 1], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[star - 1], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

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

    const result = await submitRating({
      sessionId,
      ratedUserId: userId,
      raterUserId: user.id,
      rating,
      comment: comment.trim() || undefined,
      isPositive: rating >= 4,
    });

    setLoading(false);

    if (!result.success) {
      Alert.alert('Hata', result.error || 'Değerlendirme kaydedilemedi');
    } else {
      Alert.alert(
        'Başarılı!',
        'Değerlendirmeniz kaydedildi. Olumlu yorumlarınız sayesinde kullanıcılar rozet kazanabilir!',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const renderStars = () => {
    const labels = ['Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'];
    return (
      <View style={styles.starsSection}>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleStarPress(star)}
              disabled={!canRate}
              style={styles.starButton}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnims[star - 1] }] }}>
                <MaterialCommunityIcons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={56}
                  color={star <= rating ? '#FFD700' : theme.colors.onSurfaceDisabled}
                />
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <View style={[styles.ratingLabel, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.ratingLabelText, { color: theme.colors.onPrimaryContainer }]}>
              {labels[rating - 1]}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (checkingEligibility) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          Kontrol ediliyor...
        </Text>
      </View>
    );
  }

  if (!canRate) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Card style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content style={styles.errorContent}>
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={64}
              color={theme.colors.error}
            />
            <Text style={[styles.errorTitle, { color: theme.colors.onErrorContainer }]}>
              Değerlendirme Yapılamıyor
            </Text>
            <Text style={[styles.errorMessage, { color: theme.colors.onErrorContainer }]}>
              {errorMessage}
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              Geri Dön
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.header}>
            <Avatar.Text
              size={72}
              label={userName?.charAt(0)?.toUpperCase() || 'U'}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Kullanıcıyı Değerlendir
            </Text>
            <Text style={[styles.userName, { color: theme.colors.primary }]}>{userName}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Puanınız
          </Text>
          {renderStars()}

          <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
            4+ yıldız olumlu değerlendirme sayılır ve rozet kazanmaya yardımcı olur
          </Text>

          <TextInput
            label="Yorumunuz (İsteğe bağlı)"
            value={comment}
            onChangeText={setComment}
            mode="outlined"
            multiline
            numberOfLines={5}
            style={styles.input}
            maxLength={500}
            placeholder="Bu kullanıcı ile oynarken deneyiminizi paylaşın..."
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            textColor={theme.colors.onSurface}
          />

          <View style={styles.characterCount}>
            <Text style={[styles.characterCountText, { color: theme.colors.onSurfaceVariant }]}>
              {comment.length}/500
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || rating === 0}
            style={styles.button}
            icon="check-circle"
            contentStyle={styles.buttonContent}
          >
            Değerlendirmeyi Kaydet
          </Button>
        </Card.Content>
      </Card>

      <Card style={[styles.infoCard, { backgroundColor: theme.colors.secondaryContainer }]}>
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="information"
              size={24}
              color={theme.colors.onSecondaryContainer}
            />
            <Text style={[styles.infoText, { color: theme.colors.onSecondaryContainer }]}>
              Değerlendirmeleriniz sayesinde kullanıcılar rozet kazanır ve toplulukta güven oluşturulur.
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  backButton: {
    marginTop: 8,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ratingLabelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  characterCountText: {
    fontSize: 12,
  },
  button: {
    paddingVertical: 6,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
