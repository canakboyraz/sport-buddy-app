import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Text, TextInput, Button, Card, Chip, ActivityIndicator, Avatar, Surface } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { submitRating, canRateSession } from '../../services/ratingService';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [canRate, setCanRate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scaleAnims] = useState([1, 2, 3, 4, 5].map(() => new Animated.Value(1)));
  const [glowAnims] = useState([1, 2, 3, 4, 5].map(() => new Animated.Value(0)));
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    checkRatingEligibility();
  }, [sessionId]);

  useEffect(() => {
    if (canRate && !checkingEligibility) {
      Animated.parallel([
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlideAnim, {
          toValue: 0,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [canRate, checkingEligibility]);

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

    // Animate all stars up to the selected one
    for (let i = 0; i < star; i++) {
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scaleAnims[i], {
            toValue: 1.3,
            tension: 300,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnims[i], {
            toValue: 1,
            tension: 100,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnims[i], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnims[i], {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t('common.error'), t('rating.selectRating'));
      return;
    }

    if (!user) {
      Alert.alert(t('common.error'), t('rating.userNotFound'));
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
      Alert.alert(t('common.error'), result.error || t('rating.ratingSaveFailed'));
    } else {
      Alert.alert(
        t('rating.ratingSuccess'),
        t('rating.ratingSuccessMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const renderStars = () => {
    const labels = [t('rating.veryPoor'), t('rating.poor'), t('rating.average'), t('rating.good'), t('rating.excellent')];
    const labelColors = ['#F44336', '#FF9800', '#FFC107', '#8BC34A', '#4CAF50'];

    return (
      <View style={styles.starsSection}>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isSelected = star <= rating;
            const glowOpacity = glowAnims[star - 1];

            return (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                disabled={!canRate}
                style={styles.starButton}
                activeOpacity={0.7}
              >
                <View>
                  {/* Glow effect */}
                  {isSelected && (
                    <Animated.View
                      style={[
                        styles.starGlow,
                        {
                          opacity: glowOpacity,
                          transform: [{ scale: scaleAnims[star - 1] }],
                        },
                      ]}
                    />
                  )}
                  {/* Star icon */}
                  <Animated.View
                    style={{
                      transform: [{ scale: scaleAnims[star - 1] }],
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'star' : 'star-outline'}
                      size={36}
                      color={isSelected ? '#FFD700' : theme.colors.onSurfaceDisabled}
                      style={isSelected && styles.starShadow}
                    />
                  </Animated.View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {rating > 0 && (
          <Animated.View
            style={[
              styles.ratingLabelContainer,
              { opacity: cardFadeAnim },
            ]}
          >
            <LinearGradient
              colors={[labelColors[rating - 1] + '20', labelColors[rating - 1] + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ratingLabel}
            >
              <MaterialCommunityIcons
                name={rating >= 4 ? 'emoticon-happy-outline' : rating >= 3 ? 'emoticon-neutral-outline' : 'emoticon-sad-outline'}
                size={20}
                color={labelColors[rating - 1]}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.ratingLabelText, { color: labelColors[rating - 1] }]}>
                {labels[rating - 1]}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    );
  };

  if (checkingEligibility) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          {t('rating.checking')}
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
              {t('rating.cannotRate')}
            </Text>
            <Text style={[styles.errorMessage, { color: theme.colors.onErrorContainer }]}>
              {errorMessage}
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              {t('rating.goBack')}
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={{
          opacity: cardFadeAnim,
          transform: [{ translateY: cardSlideAnim }],
        }}
      >
        {/* Header Card with Gradient */}
        <Surface style={styles.headerCard} elevation={3}>
          <LinearGradient
            colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow}>
                <Avatar.Text
                  size={80}
                  label={userName?.charAt(0)?.toUpperCase() || 'U'}
                  style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
                />
              </View>
            </View>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              {t('rating.rateUser')}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.primary }]}>{userName}</Text>
          </LinearGradient>
        </Surface>

        {/* Rating Card */}
        <Card style={styles.ratingCard} elevation={2}>
          <Card.Content>
            <View style={styles.ratingTitleRow}>
              <MaterialCommunityIcons name="star-circle" size={24} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                {t('rating.yourRating')}
              </Text>
            </View>

            {renderStars()}

            <Surface style={styles.helperCard} elevation={0}>
              <LinearGradient
                colors={['#4CAF5015', '#4CAF5005']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.helperGradient}
              >
                <MaterialCommunityIcons name="information-outline" size={18} color="#4CAF50" />
                <Text style={[styles.helperText, { color: '#4CAF50' }]}>
                  {t('rating.badgeHelper')}
                </Text>
              </LinearGradient>
            </Surface>
          </Card.Content>
        </Card>

        {/* Comment Card */}
        <Card style={styles.commentCard} elevation={2}>
          <Card.Content>
            <View style={styles.commentTitleRow}>
              <MaterialCommunityIcons name="message-text" size={22} color={theme.colors.primary} />
              <Text style={[styles.commentTitle, { color: theme.colors.onSurface }]}>
                {t('rating.commentOptional')}
              </Text>
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              mode="outlined"
              multiline
              numberOfLines={5}
              style={styles.input}
              maxLength={500}
              placeholder={t('rating.commentPlaceholder')}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              textColor={theme.colors.onSurface}
            />

            <View style={styles.characterCount}>
              <Text style={[styles.characterCountText, { color: theme.colors.onSurfaceVariant }]}>
                {t('rating.charactersCount', { count: comment.length, max: 500 })}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <LinearGradient
            colors={
              rating === 0
                ? ['#9E9E9E', '#757575']
                : [theme.colors.primary, theme.colors.primary + 'DD']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || rating === 0}
              style={styles.submitButton}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.submitText}>{t('rating.saveRating')}</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Info Card */}
        <Surface style={styles.infoCard} elevation={1}>
          <LinearGradient
            colors={[theme.colors.secondaryContainer + 'CC', theme.colors.secondaryContainer + '99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoGradient}
          >
            <MaterialCommunityIcons
              name="shield-star-outline"
              size={28}
              color={theme.colors.secondary}
            />
            <Text style={[styles.infoText, { color: theme.colors.onSecondaryContainer }]}>
              {t('rating.communityTrust')}
            </Text>
          </LinearGradient>
        </Surface>
      </Animated.View>
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
    fontWeight: '500',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  backButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  // Header Card
  headerCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGlow: {
    padding: 4,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  // Rating Card
  ratingCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ratingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  starsSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  starButton: {
    padding: 8,
    position: 'relative',
  },
  starGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    opacity: 0.3,
  },
  starShadow: {
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  ratingLabelContainer: {
    width: '100%',
    alignItems: 'center',
  },
  ratingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  ratingLabelText: {
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  helperCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  helperGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  // Comment Card
  commentCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  commentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'transparent',
    fontSize: 15,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Submit Button
  submitContainer: {
    margin: 16,
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitGradient: {
    borderRadius: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Info Card
  infoCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  infoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
});
