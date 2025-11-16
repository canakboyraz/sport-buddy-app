# Sport Buddy 🏃‍♂️⚽🏀

Sport Buddy, spor yapmak isteyenleri bir araya getiren gelişmiş bir React Native mobil uygulamasıdır. Kullanıcılar spor seansları oluşturabilir, başkalarının seanslarına katılabilir ve yeni spor arkadaşları bulabilir.

## 🌟 Özellikler

### ✅ Temel Özellikler
- 👤 **Kullanıcı Kimlik Doğrulama** - Supabase Auth ile güvenli kayıt/giriş
- 📝 **Seans Oluşturma** - Harita üzerinde konum seçerek etkinlik oluşturma
- 🔍 **Seans Arama ve Filtreleme** - Spor türü ve şehre göre filtreleme
- 📅 **Etkinliklerim** - Katıldığınız ve oluşturduğunuz etkinlikleri görüntüleme
- 💬 **Gerçek Zamanlı Sohbet** - Supabase Realtime ile anlık mesajlaşma
- ⭐ **Kullanıcı Değerlendirme** - 5 yıldızlı puan ve yorum sistemi
- 👥 **Kullanıcı Profilleri** - Ortalama puan ve değerlendirme geçmişi

### 🆕 Gelişmiş Özellikler (Yeni!)
- 📸 **Profil Fotoğrafı Yükleme** - Kamera ve galeriden fotoğraf yükleme
- 🌓 **Dark Mode** - Koyu/Açık tema desteği ve kalıcı tema tercihi
- 🗺️ **Harita Görünümü** - Tüm seansları harita üzerinde görüntüleme
- 📍 **GPS Entegrasyonu** - Gerçek zamanlı konum ve "Konumum" özelliği
- ❤️ **Favoriler** - Beğenilen seansları kaydetme
- 🔖 **Kayıtlı Seanslar** - İlgi çekici seansları notlarla birlikte saklama
- 🔔 **Push Notifications** - Expo Notifications ile bildirim sistemi
- 🎨 **Modern UI** - Material Design 3 ile responsive ve güzel tasarım

## 🛠️ Teknoloji Yığını

### Frontend
- **React Native** + **Expo** (~52.0.11) - Cross-platform mobil geliştirme
- **TypeScript** - Tip güvenli kod
- **React Navigation** - Sayfa yönlendirme
- **React Native Paper** - Material Design 3 UI bileşenleri

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL veritabanı
  - Authentication
  - Realtime subscriptions
  - Storage (profil fotoğrafları)
  - Row Level Security (RLS)

### Önemli Kütüphaneler
- `expo-location` - GPS ve konum servisleri
- `react-native-maps` - Harita entegrasyonu
- `expo-notifications` - Push notifications
- `expo-image-picker` - Fotoğraf seçme/çekme
- `date-fns` - Tarih işlemleri
- `@react-native-async-storage/async-storage` - Yerel veri saklama

## 📦 Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn
- Expo CLI
- iOS Simulator (macOS) veya Android Emulator
- Supabase hesabı

### Adımlar

1. **Bağımlılıkları yükleyin**
```bash
npm install --legacy-peer-deps
```

2. **Supabase yapılandırması**

`src/services/supabase.ts` dosyasını düzenleyin:
```typescript
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

3. **Veritabanı tablolarını oluşturun**

Supabase Dashboard > SQL Editor'de migration scriptlerini çalıştırın:
- `supabase/migrations/create_favorites_table.sql`

4. **Google Maps API Key (Android için)**

`app.json` dosyasında Google Maps API anahtarınızı ekleyin:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

5. **Uygulamayı başlatın**
```bash
npm start
```
veya
```bash
npx expo start
```

## 📱 Platform Desteği

- ✅ **iOS** - iPhone ve iPad
- ✅ **Android** - Telefonlar ve tabletler
- ⚠️ **Web** - Sınırlı özelliklerle (harita desteği yok)

## 🏗️ Proje Yapısı

```
sport-buddy-app/
├── src/
│   ├── components/       # Yeniden kullanılabilir bileşenler
│   ├── contexts/         # React Context API (Theme)
│   ├── hooks/            # Custom hooks (useAuth)
│   ├── navigation/       # Navigation yapısı
│   ├── screens/          # Ekran bileşenleri
│   │   ├── Auth/         # Giriş/Kayıt
│   │   ├── Home/         # Ana ekran (liste)
│   │   ├── Map/          # Harita görünümü
│   │   ├── Favorites/    # Favoriler ve kayıtlılar
│   │   ├── Profile/      # Profil ve ayarlar
│   │   └── ...
│   ├── services/         # API servisleri
│   │   ├── supabase.ts
│   │   ├── notificationService.ts
│   │   ├── imageService.ts
│   │   └── favoritesService.ts
│   └── types/            # TypeScript tipleri
├── supabase/
│   └── migrations/       # Veritabanı migration'ları
├── app.json              # Expo yapılandırması
└── App.tsx               # Ana uygulama

```

## 🔐 Güvenlik

- **Row Level Security (RLS)** - Tüm Supabase tablolarında aktif
- **Dosya Yükleme Güvenliği** - Kullanıcı başına izole storage
- **Otomatik Fotoğraf Sıkıştırma** - quality: 0.7

## 📝 Lisans

MIT
