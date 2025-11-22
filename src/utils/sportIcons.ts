/**
 * Spor türlerine göre Material Community Icons simgesi eşleştirmesi
 * @param sportName - Spor adı
 * @returns Material Community Icons simge adı
 */
export const getSportIcon = (sportName: string): string => {
  const iconMap: { [key: string]: string } = {
    // Takım Sporları
    'Futbol': 'soccer',
    'Basketbol': 'basketball',
    'Voleybol': 'volleyball',
    'Hentbol': 'handball',
    'Rugby': 'rugby',
    'Beyzbol': 'baseball',

    // Raket Sporları
    'Tenis': 'tennis',
    'Badminton': 'badminton',
    'Masa Tenisi': 'table-tennis',
    'Squash': 'racquetball',

    // Su Sporları
    'Yüzme': 'swim',
    'Su Topu': 'water',
    'Sörf': 'surfing',

    // Bireysel Sporlar
    'Koşu': 'run',
    'Bisiklet': 'bike',
    'Yürüyüş': 'walk',
    'Atletizm': 'run',

    // Fitness & Gym
    'Gym': 'weight-lifter',
    'Fitness': 'dumbbell',
    'CrossFit': 'run-fast',
    'Yoga': 'yoga',
    'Pilates': 'yoga',

    // Dövüş Sanatları
    'Boks': 'boxing-glove',
    'Dövüş Sanatları': 'karate',
    'Kickboks': 'karate',
    'Judo': 'karate',
    'Taekwondo': 'karate',
    'Güreş': 'arm-flex',
    'Eskrim': 'fencing',

    // Dans ve Hareket
    'Dans': 'dance-ballroom',
    'Zumba': 'music',
    'Jimnastik': 'gymnastics',

    // Kış Sporları
    'Kayak': 'ski',
    'Snowboard': 'snowboard',
    'Paten': 'rollerblade',
    'Buz Pateni': 'ice-skate',
    'Buz Hokeyi': 'hockey-sticks',

    // Outdoor
    'Dağ Tırmanışı': 'image-filter-hdr',
    'Kaya Tırmanışı': 'slope-uphill',
    'Golf': 'golf',

    // Diğer
    'Triatlon': 'medal',
  };

  return iconMap[sportName] || 'trophy';
};
