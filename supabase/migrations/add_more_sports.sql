-- Add more sport types including GYM and other popular sports
-- Bu migration spor türü listesini genişletir

INSERT INTO sports (name, icon) VALUES
    ('Gym', 'weight-lifter'),
    ('Yoga', 'yoga'),
    ('Pilates', 'pilates'),
    ('Badminton', 'badminton'),
    ('Masa Tenisi', 'table-tennis'),
    ('Squash', 'racquetball'),
    ('Fitness', 'dumbbell'),
    ('CrossFit', 'run-fast'),
    ('Boks', 'boxing-glove'),
    ('Dövüş Sanatları', 'karate'),
    ('Kickboks', 'kickboxing'),
    ('Jimnastik', 'gymnastics'),
    ('Dans', 'dance-ballroom'),
    ('Zumba', 'music'),
    ('Yürüyüş', 'walk'),
    ('Dağ Tırmanışı', 'image-filter-hdr'),
    ('Kaya Tırmanışı', 'climbing'),
    ('Kayak', 'ski'),
    ('Snowboard', 'snowboard'),
    ('Paten', 'rollerblade'),
    ('Golf', 'golf'),
    ('Atletizm', 'run'),
    ('Triatlon', 'triathlon'),
    ('Güreş', 'wrestling'),
    ('Judo', 'judo'),
    ('Taekwondo', 'taekwondo'),
    ('Eskrim', 'fencing')
ON CONFLICT (name) DO NOTHING;

-- Yorum ekle
COMMENT ON TABLE sports IS 'Sports table now includes 34 different sport types including gym, fitness, martial arts, and outdoor activities.';
