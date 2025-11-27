/**
 * Skill level değerlerini çeviren yardımcı fonksiyon
 * NOT: Bu fonksiyon t fonksiyonunu parametre olarak alır
 */
export const getSkillLevelLabel = (skillLevel: string, t: (key: string) => string): string => {
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
    return t(translationKey);
  }

  return skillLevel;
};

/**
 * Skill level seçenekleri listesi
 * NOT: Bu fonksiyon t fonksiyonunu parametre olarak alır
 */
export const getSkillLevelOptions = (t: (key: string) => string) => [
  { value: 'any', label: t('skillLevel.any') },
  { value: 'beginner', label: t('skillLevel.beginner') },
  { value: 'intermediate', label: t('skillLevel.intermediate') },
  { value: 'advanced', label: t('skillLevel.advanced') },
  { value: 'professional', label: t('skillLevel.professional') },
];
