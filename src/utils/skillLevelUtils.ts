import i18n from '../i18n';

/**
 * Skill level değerlerini çeviren yardımcı fonksiyon
 */
export const getSkillLevelLabel = (skillLevel: string): string => {
  // Map skill level values to i18n keys
  const keyMap: { [key: string]: string } = {
    'any': 'skillLevel.any',
    'beginner': 'skillLevel.beginner',
    'intermediate': 'skillLevel.intermediate',
    'advanced': 'skillLevel.advanced',
    'professional': 'skillLevel.professional',
  };

  const translationKey = keyMap[skillLevel];
  if (translationKey) {
    return i18n.t(translationKey);
  }

  return skillLevel;
};

/**
 * Skill level seçenekleri listesi
 */
export const getSkillLevelOptions = () => [
  { value: 'any', label: i18n.t('skillLevel.any') },
  { value: 'beginner', label: i18n.t('skillLevel.beginner') },
  { value: 'intermediate', label: i18n.t('skillLevel.intermediate') },
  { value: 'advanced', label: i18n.t('skillLevel.advanced') },
];

// For backwards compatibility
export const skillLevelOptions = getSkillLevelOptions();
