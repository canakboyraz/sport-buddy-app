# 🚀 App Store Gönderim Öncesi Kontrol Listesi

Son güncelleme: 3 Aralık 2024

## 📱 1. TEMEL TESTLER

### Kritik Kullanıcı Akışları (User Flows)
Test hesabıyla her birini test edin:

- [ ] **Kayıt ve Giriş**
  - Yeni kullanıcı kaydı
  - Email/şifre ile giriş
  - Şifremi unuttum akışı
  - Çıkış yapma

- [ ] **Profil Yönetimi**
  - Profil bilgilerini görüntüleme
  - Profil fotoğrafı ekleme
  - Bio güncelleme
  - Telefon numarası ekleme

- [ ] **Session Oluşturma**
  - Manuel session oluşturma (tüm alanlar doldurulmuş)
  - AI ile başlık ve açıklama oluşturma
  - Konum seçme (harita)
  - Tekrarlayan session oluşturma

- [ ] **Session Katılımı**
  - Session'a katılım isteği gönderme
  - Katılım iptal etme
  - Session detaylarını görüntüleme

- [ ] **Mesajlaşma**
  - Session chat'e mesaj gönderme
  - Emoji kullanma
  - Mesaj bildirimleri

- [ ] **AI Özellikleri**
  - AI Assistant ile sohbet (Profile → AI Assistant)
  - AI ile session açıklaması oluşturma
  - Content moderation çalışıyor mu?

### Hata Durumları
- [ ] İnternet bağlantısı olmadan ne oluyor?
- [ ] Geçersiz giriş bilgileri
- [ ] Boş form gönderme
- [ ] Session kontenjanı dolu olanı seçme

---

## 🔒 2. GÜVENLİK VE GİZLİLİK

### API Key Güvenliği
- [ ] `.env` dosyası `.gitignore`'da mı?
- [ ] GitHub'da API key görünmüyor mu?
- [ ] Production build'de API key çalışıyor mu?

```bash
# Kontrol et:
cd "C:\Users\CANAKBOYRAZ\Desktop\Cursor\sport-buddy-app-master"
cat .gitignore | grep .env
git log --all --full-history --source -S "sk-proj" # OpenAI key leak kontrolü
```

### OpenAI Harcama Limiti
- [ ] OpenAI Dashboard'da spending limit ayarlandı mı?
- [ ] Hard limit: $5 (ücretsiz kredi bitince durur)
- [ ] Soft limit: $3 (uyarı için)
- [ ] Link: https://platform.openai.com/account/billing/limits

### Privacy Policy
- [ ] Gizlilik politikası AI kullanımını açıklıyor mu?
- [ ] Web sitesinde yayında mı?
- [ ] Uygulama içi link çalışıyor mu? (Settings → Privacy Policy)
- [ ] Hem TR hem EN versiyonlar erişilebilir mi?

---

## 🧪 3. TEKNİK TESTLER

### Build Testi
```bash
# Production build oluştur
cd "C:\Users\CANAKBOYRAZ\Desktop\Cursor\sport-buddy-app-master"
eas build --platform ios --profile production

# Build başarılı mı?
# - Hiç hata yok mu?
# - Warning'ler kritik mi?
# - Bundle size makul mü? (<50MB ideal)
```

### Performans
- [ ] Ana ekran 2 saniyeden hızlı yükleniyor mu?
- [ ] Session listesi akıcı scroll yapıyor mu?
- [ ] Harita düzgün çalışıyor mu?
- [ ] AI response süresi 5 saniyeden kısa mı?
- [ ] Resim yüklemeleri hızlı mı?

### Crash Test
- [ ] Son 7 gün içinde hiç crash olmadı mı?
- [ ] Console'da kritik error yok mu?
- [ ] Memory leak yok mu? (uzun süre kullanımda)

```bash
# React Native logs kontrol
npx react-native log-ios
# veya
npx react-native log-android

# Critical error aramak
npx react-native log-ios | grep -i "error\|crash\|fatal"
```

---

## 📸 4. SCREENSHOT VE MEDYA

### App Store Screenshots (Gerekli)
- [ ] 6.5" iPhone screenshots hazır (6-10 adet)
  - Ana ekran (session listesi)
  - Session detay
  - Session oluşturma + AI özelliği
  - AI Assistant ekranı
  - Profil ekranı
  - Chat/Mesajlaşma

### App Icon
- [ ] 1024x1024 app icon hazır
- [ ] Şeffaf background yok
- [ ] Alpha channel yok

### Preview Video (Opsiyonel ama Önerilen)
- [ ] 15-30 saniyelik app tanıtım videosu
- [ ] AI özelliklerini gösteriyor

---

## 👤 5. TEST HESABI

### Test Account Doğrulama
**Kritik:** Apple reviewers bu hesapla test edecek!

```
Email: test@sportbuddy.app
Password: TestAccount2024!
```

**Mutlaka kontrol edin:**
- [ ] Hesap giriş yapıyor mu?
- [ ] Profil tamamlanmış mı? (ad, bio, foto)
- [ ] En az 2-3 session oluşturulmuş mu?
- [ ] AI Assistant çalışıyor mu?
- [ ] Chat mesajlaşma aktif mi?

### Test Hesabı Hazırlama
```bash
# Test hesabına giriş yap ve şunları yap:
# 1. Profili düzenle (ad, bio, avatar)
# 2. 3 farklı spor için session oluştur
# 3. AI Assistant'a "I want to play basketball" yaz
# 4. Bir session'a katıl
# 5. Chat'te mesaj gönder
```

---

## 📝 6. APP STORE CONNECT AYARLARI

### App Information
- [ ] App name: **Sport Buddy**
- [ ] Subtitle: **Spor Arkadaşı Bul** (veya **Find Sport Partners**)
- [ ] Primary category: **Health & Fitness**
- [ ] Secondary category: **Social Networking**
- [ ] Age rating: **13+**

### App Description

**Türkçe (TR):**
```
Sport Buddy ile spor yapmak artık daha sosyal!

✨ ÖZELLİKLER:
🏃 Yakınınızdaki spor etkinliklerini keşfedin
👥 Spor arkadaşları bulun ve buluşun
🤖 AI Asistan - Kişiselleştirilmiş spor önerileri
✍️ Akıllı İçerik - Etkinliklerinizi AI ile oluşturun
💬 Güvenli mesajlaşma
⭐ Değerlendirme ve güvenlik sistemi

🛡️ GÜVENLİK:
• AI destekli içerik moderasyonu
• Kullanıcı değerlendirme sistemi
• Güvenli ve özel mesajlaşma

Aktif yaşam Sport Buddy ile başlar! 🎾⚽🏀
```

**İngilizce (EN):**
```
Sport Buddy makes sports more social!

✨ FEATURES:
🏃 Discover nearby sports events
👥 Find and meet sport buddies
🤖 AI Assistant - Personalized sport recommendations
✍️ Smart Generator - Create events with AI
💬 Secure messaging
⭐ Rating and safety system

🛡️ SAFETY:
• AI-powered content moderation
• User rating system
• Secure and private messaging

Start your active life with Sport Buddy! 🎾⚽🏀
```

### Keywords
```
spor, egzersiz, aktivite, arkadaş, buluşma, futbol, basketbol, tenis, koşu, fitness, AI, yapay zeka
```

```
sport, exercise, activity, friends, meetup, soccer, basketball, tennis, running, fitness, AI, workout
```

### App Review Notes

`docs/APP_STORE_REVIEW_NOTES.md` dosyasının içeriğini buraya kopyalayın:

```
AI Features Disclosure:

This app uses OpenAI GPT-4o-mini for:
1. AI Chatbot (Profile → AI Assistant) - Optional
2. Auto-generate descriptions (Create Session) - Optional
3. Content moderation - Automatic (for safety)

Privacy:
- No personal data (email, phone, passwords) sent to AI
- Only session details and user messages
- OpenAI privacy: https://openai.com/privacy
- All data encrypted (HTTPS)
- 30-day retention, then deleted
- Not used for training

Test Account:
Email: test@sportbuddy.app
Password: TestAccount2024!

Test Instructions:
1. Login → Profile → AI Assistant → Try: "I want to play basketball"
2. Create Session → Select sport & location → "Generate with AI"
3. Content moderation works automatically in background
```

### App Privacy Section

**Data Collection:**

1. **Name** - Linked to user
   - Purpose: App Functionality
   - Details: User's display name

2. **Email Address** - Linked to user
   - Purpose: App Functionality, Account Management
   - Details: For login and notifications

3. **User Content** - Linked to user
   - Purpose: App Functionality, Product Personalization
   - Details: Session descriptions, chat messages, AI assistant messages
   - **Third-party sharing: Yes (OpenAI for AI features)**

4. **Location** - Linked to user
   - Purpose: App Functionality
   - Details: Approximate location (city level) for finding nearby events

5. **Phone Number** - Linked to user (Optional)
   - Purpose: App Functionality
   - Details: For contact in events

**Third-Party Partners:**
- **OpenAI**
  - Purpose: Product Personalization, App Functionality
  - Data: User messages, event descriptions
  - Privacy: https://openai.com/privacy

---

## 🔍 7. SON KONTROLLER

### Code Quality
```bash
# TypeScript errors yok mu?
npm run type-check # veya tsc --noEmit

# Linting errors yok mu?
npm run lint

# Unused dependencies?
npx depcheck
```

### Documentation
- [ ] README.md güncel mi?
- [ ] CHANGELOG.md var mı?
- [ ] AI features dokümante edilmiş mi?

### Backup
```bash
# Son commit'leri push et
git push origin master

# Tag oluştur
git tag -a v1.0.0-submission -m "Initial App Store submission"
git push origin v1.0.0-submission
```

---

## 🎯 8. SUBMISSION

### EAS Build & Submit
```bash
# 1. Build oluştur
eas build --platform ios --profile production

# 2. Build tamamlandığında submit et
eas submit --platform ios

# Veya manuel:
# - Xcode'u aç
# - Archive oluştur
# - App Store Connect'e yükle
```

### App Store Connect'te Son Adımlar
1. [ ] Build seç
2. [ ] Test hesabı ekle
3. [ ] Review notes ekle
4. [ ] Screenshots yükle
5. [ ] **"Submit for Review"** butonuna bas!

### Bekleme Süresi
- İlk review: 1-3 gün
- Güncellemeler: 1-2 gün
- Bayram/tatillerde daha uzun olabilir

---

## ⚠️ 9. OLASI RET NEDENLERİ VE ÇÖZÜMLER

### Guideline 1.2 - User Generated Content
**Red nedeni:** "App lacks proper content moderation"

**Çözüm:**
✅ AI content moderation var
✅ User reporting sistemi var
✅ User blocking özelliği var
✅ Community guidelines var

### Guideline 5.1.1 - Privacy
**Red nedeni:** "Privacy policy doesn't mention AI usage"

**Çözüm:**
✅ Privacy policy updated (3 Aralık 2024)
✅ OpenAI kullanımı açıklandı
✅ Veri saklama süresi belirtildi

### Guideline 4.2 - Minimum Functionality
**Red nedeni:** "App crashes or doesn't work"

**Çözüm:**
- Test hesabını doğrula
- Tüm özellikleri test et
- Crash logs temiz olmalı

### Guideline 2.3.8 - Metadata
**Red nedeni:** "Screenshots don't match app functionality"

**Çözüm:**
- Güncel screenshot'lar kullan
- AI özelliklerini göster
- Hiçbir özelliği abartma

---

## ✅ FINAL CHECKLIST

Göndermeden hemen önce:

```
[ ] Test hesabı çalışıyor (test@sportbuddy.app)
[ ] AI özellikleri çalışıyor (Chatbot + Auto-generate)
[ ] Privacy policy güncel ve erişilebilir
[ ] OpenAI spending limit $5 (ücretsiz krediniz bitince durur)
[ ] Screenshots hazır (6-10 adet, 6.5" iPhone)
[ ] App Store Connect'te tüm bilgiler doldurulmuş
[ ] Review notes eklendi (AI disclosure)
[ ] Production build başarılı (no critical errors)
[ ] Tüm kritik user flows test edildi
[ ] GitHub'a son commit'ler push edildi
[ ] v1.0.0 tag oluşturuldu
```

---

## 📞 YARDIM

### Sorun Yaşarsanız

**Apple App Review:**
- https://developer.apple.com/contact/app-store/?topic=appeal
- Resolution Center: App Store Connect → App → App Review

**EAS/Expo:**
- https://docs.expo.dev/submit/ios/
- Expo Discord: https://chat.expo.dev

**OpenAI:**
- https://platform.openai.com/docs
- API Status: https://status.openai.com

---

## 🎉 BAŞARI!

Tüm checklistleri tamamladıysanız, **App Store'a göndermeye hazırsınız!**

**İyi şanslar!** 🚀

Apple review süreci 1-3 gün sürer. Approve edildikten sonra uygulamanız App Store'da yayınlanacak.

---

**Son güncelleme:** 3 Aralık 2024
**Commit:** 22 commits ahead of origin/master
**Status:** ✅ Ready for submission
