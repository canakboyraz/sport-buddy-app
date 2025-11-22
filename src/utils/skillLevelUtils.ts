/**
 * Skill level değerlerini Türkçeye çeviren yardımcı fonksiyon
 */
export const getSkillLevelLabel = (skillLevel: string): string => {
  const labels: { [key: string]: string } = {
    'any': 'Herkes',
    'beginner': 'Başlangıç',
    'intermediate': 'Orta',
    'advanced': 'İleri',
  };

  return labels[skillLevel] || skillLevel;
};

/**
 * Skill level seçenekleri listesi
 */
export const skillLevelOptions = [
  { value: 'any', label: 'Herkes' },
  { value: 'beginner', label: 'Başlangıç' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'İleri' },
];
