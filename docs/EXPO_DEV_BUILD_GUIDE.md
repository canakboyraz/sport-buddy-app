# 📱 Expo Dev Client Build ve Apple Developer Ayarları Rehberi

Son güncelleme: 3 Aralık 2024

## 🚀 Expo Dev Client ile Test (Hızlı Start)

### Neden Development Build?
- Production'a göndermeden önce gerçek cihazda test
- Hot reload ile hızlı geliştirme
- Native modülleri test etme (Camera, Location, Notifications)
- AI özelliklerini gerçek OpenAI API ile test

---

## 📋 Ön Gereksinimler

### 1. Expo Account (Ücretsiz)
```bash
# Expo'ya giriş yap
npx eas-cli login

# Veya yeni hesap oluştur
npx eas-cli register
```

### 2. Apple Developer Account (Gerekli)
- **Ücretsiz hesap:** Sadece kendi cihazında test (7 gün geçerli)
- **Ücretli hesap ($99/yıl):** App Store'a gönderme + TestFlight

👉 https://developer.apple.com/account

### 3. EAS CLI Kurulumu
```bash
npm install -g eas-cli

# Versiyon kontrol
eas --version
# Minimum: 5.2.0
```

---

## 🔧 1. DEVELOPMENT BUILD OLUŞTURMA

### Adım 1: EAS Projesi Başlat (İlk kez)

```bash
cd "C:\Users\CANAKBOYRAZ\Desktop\Cursor\sport-buddy-app-master"

# EAS configure (zaten yapılmış!)
eas build:configure
```

✅ **Durum:** `eas.json` zaten hazır!

### Adım 2: iOS Development Build Oluştur

```bash
# Development build (internal distribution)
eas build --profile development --platform ios
```

**Ne soracak:**
1. ✅ "Would you like to automatically create provisioning profile?" → **Yes**
2. ✅ "Register new Apple Devices?" → **Yes** (iPhone'unuzu ekleyin)
3. ✅ "Apple ID" → Apple Developer hesabınızın email'i
4. ✅ "Apple ID Password" → Şifreniz (keychain'e kaydeder)

**Build süresi:** ~10-15 dakika

### Adım 3: Build'i İndir ve Yükle

Build tamamlandığında:

```bash
# QR kod gelecek - iPhone'unuzla tarat
# Veya link paylaşılacak
```

**iPhone'a yükleme:**
1. QR kodu iPhone Camera ile tarat
2. Safari'de açılacak link'e tıkla
3. "Install" butonuna bas
4. Settings → General → VPN & Device Management → Trust developer

---

## 🍎 2. APPLE DEVELOPER HESABI AYARLARI

### Senaryo A: Ücretsiz Apple Developer (Test İçin)

✅ **Avantajları:**
- Kendi cihazında test edebilirsin
- Hiç ücret ödemeden

❌ **Dezavantajları:**
- App Store'a gönderemezsin
- 7 günde bir yeniden yükleme gerekir
- En fazla 3 cihaz

**Yapman gerekenler:**
```
Hiçbir şey! 🎉
EAS otomatik halleder.
```

---

### Senaryo B: Ücretli Apple Developer ($99/yıl)

Apple Developer Program'a katıl:
👉 https://developer.apple.com/programs/enroll/

✅ **Avantajları:**
- App Store'a gönderebilirsin
- TestFlight ile beta test (10,000 kullanıcıya kadar)
- Sınırsız cihaz
- 1 yıl geçerli

---

## 📱 3. APP STORE CONNECT AYARLARI

### Mevcut Ayarlarınız

`eas.json` dosyanızda:
```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6755889355",
        "appleTeamId": "6GN56ZPR45"
      }
    }
  }
}
```

✅ **ascAppId:** App Store Connect'teki app ID'niz (zaten var!)
✅ **appleTeamId:** Apple Developer Team ID'niz (zaten var!)

---

### Yapmanız Gereken Değişiklikler

#### 1. App Store Connect'te App Bilgileri

👉 https://appstoreconnect.apple.com/apps/6755889355/appstore

**✏️ Güncellenecekler:**

**a) App Information:**
- [ ] **Name:** Sport Buddy
- [ ] **Subtitle:** Spor Arkadaşı Bul (veya: Find Sport Buddies)
- [ ] **Primary Category:** Health & Fitness
- [ ] **Secondary Category:** Social Networking

**b) App Privacy:**
- [ ] **Privacy Policy URL:**
  ```
  https://canakboyraz.github.io/sport-buddy-app/privacy-policy-tr.html
  ```
- [ ] **Privacy Choices:** Güncelle (AI usage ekle)

👉 **App Privacy güncelleme:**
```
Data Linked to User:
✅ Name
✅ Email Address
✅ User Content (Shared with OpenAI for AI features)
✅ Location (Approximate - City level)
✅ Phone Number (Optional)

Third-Party Partners:
✅ OpenAI - AI features (Chatbot, Content generation, Moderation)
```

**c) Age Rating:**
- [ ] **Age Rating:** 13+ (Social networking features)

---

#### 2. Certificates, Identifiers & Profiles

👉 https://developer.apple.com/account/resources/

**Mevcut Bundle ID:** `com.sportbuddy.app2`

**✏️ Kontrol edilecekler:**

**a) App ID:**
- [ ] Name: Sport Buddy
- [ ] Bundle ID: `com.sportbuddy.app2` ✅
- [ ] Capabilities (şunlar açık olmalı):
  - ✅ Push Notifications
  - ✅ Sign in with Apple
  - ✅ Associated Domains (optional)

**b) Provisioning Profiles:**
```
EAS otomatik oluşturur - manuel yapmana gerek yok! 🎉
```

**c) Certificates:**
```
EAS otomatik oluşturur - manuel yapmana gerek yok! 🎉
```

---

#### 3. App Store Connect → App Review

**Review Notes (ÇOK ÖNEMLİ!):**

```
AI Features Disclosure:

This app uses OpenAI GPT-4o-mini for:
1. AI Chatbot (Profile → AI Assistant) - Optional feature
2. Auto-generate session descriptions (Create Session) - Optional
3. Content moderation - Automatic (for safety)

Privacy & Security:
- No personal data (email, phone, passwords) sent to AI
- Only session details and user messages
- OpenAI Privacy: https://openai.com/privacy
- All data encrypted via HTTPS
- 30-day retention, then deleted
- Not used for AI training

Test Account:
Email: test@sportbuddy.app
Password: TestAccount2024!

Testing Instructions:
1. Login with test account
2. Go to Profile → AI Assistant
3. Type: "I want to play basketball"
4. AI will respond with recommendations
5. Create Session → Select sport/location → Tap "Generate with AI"
6. AI will create title and description

Content Moderation:
- Works automatically in background
- No action needed from reviewer

Compliance:
- Guideline 1.2: User Generated Content ✅
- Guideline 5.1.1: Privacy Policy ✅
- Guideline 2.3.8: Accurate Metadata ✅

Contact:
Can Akboyraz
privacy@sportbuddy.app
+90 507 499 8785
```

---

#### 4. App Icon & Screenshots

**a) App Icon:**
- [ ] 1024x1024 PNG
- [ ] No transparency
- [ ] No alpha channel

Mevcut: `./assets/icon.png`

**b) Screenshots (6.5" iPhone için):**

Mutlaka çek:
1. ✅ Ana ekran (session listesi)
2. ✅ Session detay
3. ✅ **AI ile session oluşturma** (Önemli!)
4. ✅ **AI Assistant** (Önemli!)
5. ✅ Profil sayfası
6. ✅ Chat/Mesajlaşma

---

## 🔐 4. GÜVENLİK VE SECRET'LER

### Environment Variables (Production)

**eas.json → production:**

```json
{
  "production": {
    "env": {
      "EXPO_PUBLIC_SUPABASE_URL": "$EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "EXPO_PUBLIC_OPENAI_API_KEY": "$EXPO_PUBLIC_OPENAI_API_KEY"
    }
  }
}
```

**❌ EKSİK:** `EXPO_PUBLIC_OPENAI_API_KEY` yok!

### Düzeltme:

```json
{
  "production": {
    "autoIncrement": true,
    "env": {
      "EXPO_PUBLIC_SUPABASE_URL": "$EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "EXPO_PUBLIC_OPENAI_API_KEY": "$EXPO_PUBLIC_OPENAI_API_KEY"
    }
  }
}
```

**EAS Secret'leri Ayarla:**

```bash
# OpenAI API Key ekle
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-proj-..."

# Supabase URL ekle
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."

# Supabase Anon Key ekle
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhb..."

# Kontrol et
eas secret:list
```

---

## 🏗️ 5. PRODUCTION BUILD (App Store İçin)

### Adım 1: eas.json Güncelle

OpenAI key'i ekle (yukarıda gösterildi).

### Adım 2: Production Build Oluştur

```bash
cd "C:\Users\CANAKBOYRAZ\Desktop\Cursor\sport-buddy-app-master"

# Production build
eas build --profile production --platform ios
```

**Ne soracak:**
1. ✅ "Create App Store distribution certificate?" → **Yes**
2. ✅ "Apple ID" → Developer hesabı email
3. ✅ "Password" → Developer hesabı şifresi

**Build süresi:** ~15-20 dakika

### Adım 3: App Store'a Submit

```bash
# Otomatik submit (build tamamlandığında)
eas submit --platform ios --latest

# Veya manuel:
# App Store Connect'te "TestFlight" sekmesinden build seç
```

---

## 📝 6. CHECKLIST - DEVELOPER HESABI AYARLARI

### Apple Developer Account
- [ ] Apple ID var (developer.apple.com/account)
- [ ] Ücretli hesap aktif ($99/yıl) veya ücretsiz
- [ ] Team ID doğru: `6GN56ZPR45`

### App Store Connect
- [ ] App ID: `6755889355`
- [ ] App adı: Sport Buddy
- [ ] Bundle ID: `com.sportbuddy.app2`
- [ ] Privacy Policy URL güncel
- [ ] Review notes eklendi (AI disclosure)
- [ ] Test account hazır: test@sportbuddy.app

### Certificates & Profiles
- [ ] EAS otomatik oluşturacak (manuel yapma!)

### Environment Variables
- [ ] `EXPO_PUBLIC_OPENAI_API_KEY` eklendi
- [ ] `EXPO_PUBLIC_SUPABASE_URL` eklendi
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` eklendi
- [ ] `eas secret:list` ile doğrulandı

### App Bilgileri
- [ ] App icon 1024x1024
- [ ] 6-10 screenshot (AI features'ı göster!)
- [ ] Age rating: 13+
- [ ] Categories: Health & Fitness + Social Networking

---

## 🎯 ADIM ADIM PLAN

### 🔴 ŞİMDİ YAP (Kritik - 30 dk):

1. **OpenAI API Key'i EAS Secret olarak ekle:**
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "your_key_here"
   ```

2. **eas.json'u güncelle:**
   - Production env'e OpenAI key ekle

3. **Development build oluştur:**
   ```bash
   eas build --profile development --platform ios
   ```

4. **iPhone'a yükle ve test et:**
   - AI Chatbot çalışıyor mu?
   - Session creation AI ile çalışıyor mu?

---

### 🟡 SONRA YAP (Önemli - 1 saat):

1. **App Store Connect'i güncelle:**
   - Review notes ekle (AI disclosure)
   - Privacy Policy URL'i güncelle
   - App Privacy ekle (OpenAI third-party)

2. **Screenshots çek:**
   - 6-10 adet, 6.5" iPhone
   - AI features'ı mutlaka göster

3. **Test hesabını hazırla:**
   - test@sportbuddy.app
   - Profil tamamla
   - 2-3 session oluştur

---

### 🟢 EN SON YAP (Production - 2 saat):

1. **Production build:**
   ```bash
   eas build --profile production --platform ios
   ```

2. **Submit to App Store:**
   ```bash
   eas submit --platform ios --latest
   ```

3. **Apple review bekle:**
   - 1-3 gün
   - Eğer red gelirse: Feedback'e göre düzelt

---

## ❓ Sık Sorulan Sorular

### "EAS hesabım yok, oluşturmalı mıyım?"
✅ Evet, ücretsiz: `npx eas-cli register`

### "Apple Developer hesabım yok, almam gerekir mi?"
- Test için: ❌ Hayır (ücretsiz hesap yeterli)
- App Store için: ✅ Evet ($99/yıl gerekli)

### "Provisioning profile manuel oluşturmalı mıyım?"
❌ Hayır! EAS otomatik oluşturur.

### "Bundle ID değiştirebilir miyim?"
⚠️ Şu an `com.sportbuddy.app2` - İstersan değiştir ama her yerde güncelle!

### "OpenAI API key nasıl eklerim?"
```bash
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-..."
```

### "GitHub'a push engelleniyorsa?"
Yukarıdaki "GitHub Push Sorunu" bölümüne bak.

---

## 🚀 HADİ BAŞLAYALIM!

**İlk komut:**
```bash
cd "C:\Users\CANAKBOYRAZ\Desktop\Cursor\sport-buddy-app-master"

# EAS'a giriş yap
eas login

# Development build başlat
eas build --profile development --platform ios
```

**İyi şanslar!** 🎉

---

**Sorular?**
- EAS Docs: https://docs.expo.dev/build/introduction/
- Apple Developer: https://developer.apple.com/support/
- Bu dosya: `docs/EXPO_DEV_BUILD_GUIDE.md`
