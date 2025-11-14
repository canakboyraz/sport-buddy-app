# Sport Buddy

Sport Buddy, spor yapmak isteyen kişileri bir araya getiren bir React Native mobil uygulamasıdır.

## Özellikler

- **Kullanıcı Kimlik Doğrulama**: Supabase ile giriş ve kayıt
- **Spor Seanslarını Keşfet**: Spor türüne ve şehre göre filtreleme
- **Seans Oluşturma**: Harita tabanlı konum seçimi ile yeni etkinlikler oluştur
- **Etkinliklerim**: Katıldığınız ve oluşturduğunuz etkinlikleri görüntüle
- **Gerçek Zamanlı Sohbet**: Seans katılımcıları ile anlık mesajlaşma
- **Kullanıcı Değerlendirme**: 5 yıldızlı puan ve yorum sistemi
- **Kullanıcı Profilleri**: Ortalama puan ve değerlendirme geçmişi

## Teknik Özellikler

- **React Native** + **Expo** + **TypeScript**
- **Supabase** (Backend, Auth, Realtime)
- **React Native Paper** (UI Bileşenleri)
- **React Navigation** (Yönlendirme)
- **react-native-maps** (Harita Entegrasyonu)
- **expo-location** (Konum Servisleri)
- **date-fns** (Tarih Formatlama)

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env` dosyası oluşturun ve Supabase bilgilerinizi ekleyin:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Veritabanı şemasını Supabase'e uygulayın:
- `supabase-schema.sql` dosyasındaki SQL komutlarını Supabase SQL Editor'de çalıştırın

4. Uygulamayı başlatın:
```bash
npm start
```

## Platform Desteği

- ✅ Android
- ✅ iOS
- ⚠️ Web (sınırlı özellikler - harita desteği yok)

## Lisans

MIT
