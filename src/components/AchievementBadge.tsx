import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Achievement, UserAchievement } from '../types';
import { getAchievementRarityColor } from '../services/achievementService';
import { useLanguage } from '../contexts/LanguageContext';

interface AchievementBadgeProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showLocked?: boolean;
}

export default function AchievementBadge({
  achievement,
  userAchievement,
  size = 'medium',
  onPress,
  showLocked = true,
}: AchievementBadgeProps) {
  const { t } = useLanguage();
  const isUnlocked = !!userAchievement;

  // Calculate rarity from points if not provided
  let rarity = achievement.rarity || 'common';
  if (!achievement.rarity) {
    const points = achievement.points || 0;
    if (points >= 100) rarity = 'legendary';
    else if (points >= 50) rarity = 'epic';
    else if (points >= 25) rarity = 'rare';
    else rarity = 'common';
  }

  const colors = getAchievementRarityColor(rarity);

  const sizeConfig = {
    small: { iconSize: 32, containerSize: 60, fontSize: 10 },
    medium: { iconSize: 48, containerSize: 80, fontSize: 12 },
    large: { iconSize: 64, containerSize: 100, fontSize: 14 },
  };

  const config = sizeConfig[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.container, { width: config.containerSize }]}
    >
      <View
        style={[
          styles.badge,
          {
            backgroundColor: isUnlocked ? colors.bg : '#E0E0E0',
            borderColor: isUnlocked ? colors.border : '#BDBDBD',
            width: config.iconSize + 16,
            height: config.iconSize + 16,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={achievement.icon as any}
          size={config.iconSize}
          color={isUnlocked ? colors.text : '#9E9E9E'}
        />
        {!isUnlocked && showLocked && (
          <View style={styles.lockOverlay}>
            <MaterialCommunityIcons name="lock" size={config.iconSize / 2} color="#757575" />
          </View>
        )}
      </View>
      <Text
        style={[
          styles.name,
          {
            fontSize: config.fontSize,
            color: isUnlocked ? '#333' : '#999',
          },
        ]}
        numberOfLines={2}
      >
        {achievement.name}
      </Text>
      <Text style={[styles.points, { fontSize: config.fontSize - 2 }]}>
        {achievement.points} {t('achievement.points').toLowerCase()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 8,
  },
  badge: {
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  points: {
    color: '#666',
    textAlign: 'center',
  },
});
