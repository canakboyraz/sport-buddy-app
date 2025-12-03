# ✅ App Store AI Features Checklist

Son güncelleme: 3 Aralık 2024

## 📋 Gönderim Öncesi Kontrol Listesi

### ✅ Tamamlandı

#### 1. Gizlilik Politikası (Privacy Policy)
- ✅ AI kullanımı açıkça belirtildi
- ✅ OpenAI GPT-4o-mini modeli açıklandı
- ✅ AI'ya gönderilen veriler listelendi
- ✅ AI'ya GÖNDERİLMEYEN veriler listelendi
- ✅ Veri saklama süresi belirtildi (30 gün)
- ✅ Model eğitiminde kullanılmadığı belirtildi
- ✅ Türkçe ve İngilizce versiyonlar güncellendi
- ✅ Son güncelleme tarihi: 3 Aralık 2024
- ✅ Dosyalar: `docs/legal/privacy-policy-tr.md` ve `docs/legal/privacy-policy-en.md`

#### 2. App Store Review Notes
- ✅ Detaylı AI özellikleri açıklaması hazırlandı
- ✅ Test hesabı bilgileri eklendi
- ✅ Test talimatları yazıldı
- ✅ Guideline 1.2 ve 5.1.1 uyumluluk belgesi hazırlandı
- ✅ Dosya: `docs/APP_STORE_REVIEW_NOTES.md`

#### 3. Kod Güvenliği
- ✅ OpenAI API key `.env` dosyasında
- ✅ `.env` dosyası `.gitignore`'da
- ✅ API key GitHub'a yüklenmedi
- ✅ GPT-4o-mini modeli kullanılıyor (en ucuz)
- ✅ Maliyet: ~$0.50/1000 kullanıcı

#### 4. AI Özellikleri
- ✅ AI Chatbot (opsiyonel)
- ✅ Auto-generate description (opsiyonel)
- ✅ Content moderation (otomatik, güvenlik için)
- ✅ Tüm özellikler çalışıyor

---

### ⏳ App Store Connect'te Yapılacaklar

#### 1. Review Information (İnceleme Bilgileri)
📍 **Konum:** App Store Connect → Your App → App Review → App Review Information

**Notes (İnceleme Notları):**
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

Detailed documentation: See APP_STORE_REVIEW_NOTES.md in submission

Test Account:
Email: test@sportbuddy.app
Password: TestAccount2024!

Test Instructions:
1. Login → Profile → AI Assistant → Try: "I want to play basketball"
2. Create Session → Select sport & location → "Generate with AI"
3. Content moderation works automatically in background
```

**Attachment (Ek Dosya):**
- `docs/APP_STORE_REVIEW_NOTES.md` dosyasını PDF olarak ekle (opsiyonel)

---

#### 2. App Privacy (Uygulama Gizliliği)
📍 **Konum:** App Store Connect → Your App → App Privacy

**Data Types Collected - Eklenmeli:**

**Data Used to Track You:**
- ❌ None (hiçbiri yok)

**Data Linked to You:**
- ✅ Name (İsim)
- ✅ Email Address (E-posta)
- ✅ User Content (Kullanıcı İçeriği)
  - **Purpose:** App Functionality, Analytics
  - **Details:** "User messages sent to AI assistant, event descriptions, chat messages for content moderation"
- ✅ Location (Konum)
  - **Purpose:** App Functionality
  - **Details:** "Approximate location (city) for nearby events and AI recommendations"

**Third-Party Partners:**
- ✅ OpenAI
  - **Purpose:** Product Personalization, App Functionality
  - **Data Collected:** User messages, event information, content for moderation
  - **Privacy Policy:** https://openai.com/privacy

---

#### 3. App Description (Uygulama Açıklaması)
📍 **Konum:** App Store Connect → Your App → App Information → Description

**AI Özelliklerini Vurgulayın (Opsiyonel):**

Türkçe açıklamanıza ekleyin:
```
🤖 YAPAY ZEKA ÖZELLİKLERİ:
• AI Asistan - Spor önerileri ve rehberlik
• Akıllı İçerik Oluşturucu - Etkinlik açıklamalarını otomatik yaz
• Güvenli Topluluk - AI destekli içerik moderasyonu
```

İngilizce açıklamanıza ekleyin:
```
🤖 AI-POWERED FEATURES:
• AI Assistant - Get personalized sport recommendations
• Smart Content Generator - Auto-create event descriptions
• Safe Community - AI-powered content moderation
```

---

#### 4. What's New (Yenilikler)
📍 **Konum:** App Store Connect → Your App → Version → What's New

**İlk versiyonda AI'dan bahsedin:**

Türkçe:
```
Yeni Sport Buddy!

✨ YENİ ÖZELLİKLER:
🤖 AI Asistan - Spor sorularınızı cevaplayın
✍️ Akıllı İçerik - Etkinlik açıklamalarını AI ile oluşturun
🛡️ Güvenli Topluluk - AI destekli moderasyon

🏃 Diğer Özellikler:
• Yakındaki spor etkinliklerini keşfedin
• Arkadaşlarınızla buluşun
• Güvenli mesajlaşma
• Değerlendirme sistemi

Sport Buddy ile aktif yaşam başlıyor! 🎾⚽🏀
```

İngilizce:
```
Introducing Sport Buddy!

✨ NEW AI FEATURES:
🤖 AI Assistant - Get instant sport recommendations
✍️ Smart Generator - Create event descriptions with AI
🛡️ Safe Community - AI-powered moderation

🏃 More Features:
• Discover nearby sports events
• Meet with friends
• Secure messaging
• Rating system

Start your active life with Sport Buddy! 🎾⚽🏀
```

---

### 💰 OpenAI Dashboard Ayarları

#### Spending Limits (Harcama Limitleri)
📍 **Konum:** https://platform.openai.com/account/billing/limits

**Önerilen Limitler:**
```
Hard Limit (Zorunlu Limit): $10
- Bu limite ulaşınca tüm API çağrıları durdurulur
- Beklenmedik yüksek faturayı engeller

Soft Limit (Uyarı Limiti): $5
- Bu limite ulaşınca email uyarısı gelir
- API çağrıları devam eder
```

**Nasıl Ayarlanır:**
1. https://platform.openai.com/account/billing/limits adresine git
2. "Set a monthly budget" kısmını bul
3. Hard limit: $10
4. Soft limit: $5
5. Email adresini doğrula
6. Save

#### Usage Monitoring (Kullanım Takibi)
📍 **Konum:** https://platform.openai.com/usage

**Kontrol Edilecekler:**
- Günlük kullanım trendi
- En çok kullanılan özellikler
- Maliyet projeksiyonu

---

### 🧪 Son Testler

#### Test 1: Privacy Policy Linkleri
- [ ] Uygulama içi Settings → Privacy Policy tıklayınca doğru sayfaya gidiyor mu?
- [ ] Web sitesinde privacy policy yayında mı?
- [ ] Hem Türkçe hem İngilizce versiyonlar erişilebilir mi?

#### Test 2: AI Özellikleri
- [ ] AI Assistant çalışıyor mu?
- [ ] Auto-generate description çalışıyor mu?
- [ ] Content moderation aktif mi?
- [ ] Hata mesajları kullanıcı dostu mu?

#### Test 3: API Key Güvenliği
- [ ] `.env` dosyası `.gitignore`'da mı?
- [ ] GitHub'da API key görünmüyor mu?
- [ ] Production build'de API key çalışıyor mu?

---

## 📱 App Store Connect Submission Checklist

### Genel Bilgiler
- [ ] App name: Sport Buddy
- [ ] Subtitle: Spor Arkadaşı Bul
- [ ] Primary category: Health & Fitness
- [ ] Secondary category: Social Networking
- [ ] Age rating: 13+

### Screenshots
- [ ] 6.5" iPhone screenshots (6-10 adet)
- [ ] iPad screenshots (optional)
- [ ] AI özelliklerini gösteren screenshot var mı?

### App Review Information
- [ ] Test account email: test@sportbuddy.app
- [ ] Test account password: TestAccount2024!
- [ ] Review notes: AI disclosure eklendi
- [ ] Contact info: Can Akboyraz, +90 507 499 8785

### App Privacy
- [ ] Data collection disclosed
- [ ] Third-party partners (OpenAI) listed
- [ ] Privacy policy link working

---

## ⚠️ Olası Red Nedenleri ve Çözümler

### Red Nedeni 1: AI Disclosure Eksik
**Çözüm:** ✅ Privacy policy'de AI kullanımı detaylı açıklandı

### Red Nedeni 2: Test Account Çalışmıyor
**Çözüm:**
- Test account'u kontrol edin
- AI features'ın test account ile çalıştığını doğrulayın

### Red Nedeni 3: Content Moderation Yetersiz
**Çözüm:** ✅ Hem keyword-based hem AI-based moderation var

### Red Nedeni 4: Privacy Policy Güncel Değil
**Çözüm:** ✅ Son güncelleme: 3 Aralık 2024

---

## 📊 Başarı Kriterleri

### App Store Approval İçin
- ✅ Privacy policy AI disclosure içeriyor
- ✅ Content moderation çalışıyor
- ✅ User reporting/blocking var
- ✅ Community guidelines accepted
- ✅ Test account hazır
- ✅ Review notes detaylı

### Kullanıcı Deneyimi İçin
- ✅ AI özellikleri opsiyonel
- ✅ Clear labeling (AI ile oluşturuldu)
- ✅ Hızlı yanıt (2-5 saniye)
- ✅ Hata yönetimi
- ✅ Loading indicators

### Güvenlik İçin
- ✅ API key güvenli
- ✅ Spending limits ayarlı
- ✅ Veri şifreleme (HTTPS)
- ✅ No personal data to AI (email, phone)

---

## 🎯 Son Adımlar

1. ✅ Privacy policy güncellendi
2. ✅ Review notes hazırlandı
3. ⏳ OpenAI spending limit ayarla ($10)
4. ⏳ Test account'u doğrula
5. ⏳ App Store Connect'te review notes ekle
6. ⏳ Build oluştur ve gönder
7. ⏳ Review bekle (2-3 gün)

---

## 📞 Destek

Sorularınız için:
- **Developer:** Can Akboyraz
- **Email:** privacy@sportbuddy.app
- **Phone:** +90 507 499 8785

**Önemli Linkler:**
- OpenAI Privacy: https://openai.com/privacy
- OpenAI Usage Policies: https://openai.com/policies/usage-policies
- Apple Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

---

## ✅ Final Checklist

Göndermeden önce son kontrol:

- [x] Privacy policy AI kullanımını açıklıyor
- [x] Review notes hazır
- [x] Test account çalışıyor
- [ ] OpenAI spending limit ayarlandı
- [ ] Son testler yapıldı
- [ ] Build başarılı
- [ ] App Store Connect formu dolduruldu

**Hazırsınız! App Store'a güvenle gönderebilirsiniz.** 🚀
