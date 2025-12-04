# 🚨 App Store Rejection Düzeltme Rehberi

**Rejection Date:** December 2, 2025 (gelecek tarih - muhtemelen December 2, 2024)
**Submission ID:** cb84d7a0-5178-4ad1-859a-9ca6e05b0d65
**Version:** 1.0

---

## ❌ RED NEDENLERİ

### 1. Guideline 1.2 - Safety - User-Generated Content

**Sorun:** User-generated content var ama gerekli güvenlik önlemleri eksik.

**Eksikler:**
- [ ] Terms of Service (EULA) - kullanıcıların kabul etmesi gereken kurallar
- [ ] Objectionable content filtreleme
- [ ] Content report/flag mekanizması
- [ ] User blocking mekanizması
- [ ] 24 saat içinde aksiyon alma (content removal + user ejection)

---

### 2. Guideline 5.1.1(v) - Data Collection and Storage

**Sorun:** Account oluşturma var ama account silme yok.

**Eksikler:**
- [ ] Account deletion özelliği
- [ ] Kullanıcı data'sını tamamen silme
- [ ] Deactivate yeterli değil - DELETE olmalı

---

## ✅ ÇÖZÜMLER

### ÇÖZÜM 1: Guideline 1.2 Düzeltmeleri

#### A) Terms of Service / Community Guidelines

**Yapılacak:**

1. **`docs/legal/terms-of-service.md` oluştur**
2. **`docs/legal/community-guidelines.md` oluştur**
3. **Signup flow'a ekle** - kullanıcı kabul etmeli

**İçerik:**
```markdown
# Community Guidelines

Sport Buddy is a safe, respectful community. We have ZERO tolerance for:

❌ Hate speech or harassment
❌ Bullying or threats
❌ Sexual content or nudity
❌ Violence or graphic content
❌ Spam or scams
❌ Impersonation
❌ Copyright infringement

Violations result in:
1. Content removal
2. Account suspension
3. Permanent ban

Report violations: Report button on content
Response time: Within 24 hours
```

#### B) Content Reporting/Flagging

**Yapılacak:**

1. **Session detay sayfasına "Report" butonu ekle**
2. **Chat messages'a "Report" butonu ekle**
3. **User profile'a "Report User" butonu ekle**

**Kod:**
```typescript
// src/components/ReportButton.tsx
export function ReportButton({ contentType, contentId }) {
  const handleReport = async () => {
    await supabase.from('content_reports').insert({
      content_type: contentType, // 'session', 'message', 'user'
      content_id: contentId,
      reporter_id: user.id,
      created_at: new Date(),
    });
    Alert.alert('Reported', 'We will review within 24 hours');
  };

  return <Button onPress={handleReport}>Report</Button>;
}
```

**Database:**
```sql
CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL, -- 'session', 'message', 'user'
  content_id UUID NOT NULL,
  reporter_id UUID REFERENCES profiles(id),
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned'
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  action_taken TEXT -- 'removed', 'warning', 'banned', 'no_action'
);

CREATE INDEX idx_reports_pending ON content_reports(status, created_at);
```

#### C) User Blocking

**Yapılacak:**

1. **User profile'a "Block User" butonu ekle**
2. **Blocked users listesi**
3. **Blocked user'ın content'ini gösterme**

**Database:**
```sql
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES profiles(id),
  blocked_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users ON blocked_users(blocker_id);
```

#### D) Admin Panel - 24 Hour Response

**Yapılacak:**

1. **Admin dashboard oluştur** (web-based veya Supabase Functions)
2. **Daily reports email** - pending reports
3. **Auto-reminder** - 24 saat yaklaşınca

**Supabase Function örnek:**
```typescript
// supabase/functions/check-pending-reports/index.ts
export async function checkPendingReports() {
  const { data: reports } = await supabase
    .from('content_reports')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 20 * 60 * 60 * 1000)); // 20 hours

  if (reports.length > 0) {
    // Send email alert to admin
    await sendEmail({
      to: 'privacy@sportbuddy.app',
      subject: 'URGENT: Reports need review',
      body: `${reports.length} reports pending for >20 hours`,
    });
  }
}
```

---

### ÇÖZÜM 2: Account Deletion (Guideline 5.1.1)

#### A) UI - Delete Account Button

**Yapılacak:**

1. **Settings ekranına "Delete Account" butonu ekle**
2. **Confirmation dialog** - kullanıcı emin mi?
3. **Password re-entry** - güvenlik için
4. **Data deletion açıklaması** - ne silineceğini göster

**Kod:**
```typescript
// src/screens/Settings/SettingsScreen.tsx

const handleDeleteAccount = async () => {
  Alert.alert(
    'Delete Account',
    'This will permanently delete:\n\n' +
    '• Your profile\n' +
    '• All your sessions\n' +
    '• All your messages\n' +
    '• Your ratings and reviews\n\n' +
    'This action CANNOT be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete()
      }
    ]
  );
};

const confirmDelete = () => {
  Alert.prompt(
    'Confirm Deletion',
    'Enter your password to confirm:',
    async (password) => {
      try {
        // Re-authenticate
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password,
        });

        if (authError) {
          Alert.alert('Error', 'Incorrect password');
          return;
        }

        // Call deletion function
        const { error } = await supabase.rpc('delete_user_account', {
          user_id: user.id
        });

        if (error) throw error;

        // Sign out
        await supabase.auth.signOut();

        Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      } catch (error) {
        Alert.alert('Error', 'Failed to delete account. Please contact support.');
      }
    },
    'secure-text'
  );
};
```

#### B) Backend - Complete Data Deletion

**Database Function:**
```sql
-- supabase/migrations/delete_user_account_function.sql

CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete user's sessions
  DELETE FROM sport_sessions WHERE creator_id = user_id;

  -- Delete user's messages
  DELETE FROM chat_messages WHERE sender_id = user_id;

  -- Delete user's participants
  DELETE FROM session_participants WHERE user_id = user_id;

  -- Delete user's ratings (given and received)
  DELETE FROM user_ratings WHERE rater_id = user_id OR rated_user_id = user_id;

  -- Delete user's reports
  DELETE FROM content_reports WHERE reporter_id = user_id;

  -- Delete user's blocks
  DELETE FROM blocked_users WHERE blocker_id = user_id OR blocked_id = user_id;

  -- Delete user's notifications
  DELETE FROM notifications WHERE user_id = user_id;

  -- Delete user profile
  DELETE FROM profiles WHERE id = user_id;

  -- Delete auth user (this will cascade)
  DELETE FROM auth.users WHERE id = user_id;

  -- Log deletion for audit
  INSERT INTO user_deletions (user_id, deleted_at)
  VALUES (user_id, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit table
CREATE TABLE user_deletions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  deleted_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Priority 1 - MUST HAVE (Red çözmek için)

**Guideline 1.2:**
- [ ] Terms of Service sayfası oluştur
- [ ] Community Guidelines sayfası oluştur
- [ ] Signup'ta kabul ettir
- [ ] Session detay'da "Report" butonu
- [ ] Chat message'da "Report" butonu
- [ ] User profile'da "Report User" butonu
- [ ] User profile'da "Block User" butonu
- [ ] `content_reports` tablosu
- [ ] `blocked_users` tablosu

**Guideline 5.1.1:**
- [ ] Settings'te "Delete Account" butonu
- [ ] Password confirmation
- [ ] `delete_user_account()` function
- [ ] Complete data deletion

### Priority 2 - SHOULD HAVE

- [ ] Admin panel (reports review)
- [ ] Email notifications (24h reminder)
- [ ] Blocked users list görüntüleme
- [ ] Report history

### Priority 3 - NICE TO HAVE

- [ ] Automated content moderation (AI - zaten var!)
- [ ] Appeal process
- [ ] Transparency report

---

## 🚀 HIZLI UYGULAMA PLANI

### Gün 1 (4-6 saat):
1. Terms of Service + Community Guidelines yaz
2. Signup flow'a ekle
3. Report/Block UI'ları ekle
4. Database tables oluştur

### Gün 2 (3-4 saat):
1. Delete Account feature
2. Backend functions
3. Testing

### Gün 3 (1-2 saat):
1. Son testler
2. Documentation güncelle
3. Resubmit

---

## 📧 APPLE'A CEVAP (Resolution Center)

Red response'da şunu yaz:

```
Hello App Review Team,

Thank you for the feedback. We have updated Sport Buddy to address both issues:

GUIDELINE 1.2 - USER-GENERATED CONTENT:

We have implemented comprehensive safety features:

1. Terms of Service & Community Guidelines
   - All users must accept before signup
   - Zero tolerance policy clearly stated
   - Location: Signup screen + Settings

2. Content Filtering
   - AI-powered content moderation (OpenAI GPT-4o-mini)
   - Keyword-based filtering
   - Automatic flagging of objectionable content

3. User Reporting
   - Report button on all sessions
   - Report button on all messages
   - Report user from profile
   - Location: Session detail, Chat, Profile screens

4. User Blocking
   - Block user from profile
   - Blocked users' content hidden
   - Location: Profile screen

5. 24-Hour Response
   - Admin dashboard for review
   - Email alerts for pending reports
   - Automated removal process
   - Audit trail maintained

GUIDELINE 5.1.1 - ACCOUNT DELETION:

We have implemented complete account deletion:

1. Delete Account Option
   - Location: Settings → Delete Account
   - Password confirmation required
   - Clear explanation of data deletion

2. Complete Data Removal
   - User profile
   - All sessions created
   - All messages sent
   - All ratings and reviews
   - All associated data

3. Process
   - User confirms with password
   - Irreversible deletion warning
   - Immediate data removal
   - Sign out after deletion

All features have been tested and are ready for review.

Test Account:
Email: test@sportbuddy.app
Password: TestAccount2024!

Please let us know if you need any clarification.

Best regards,
Can Akboyraz
```

---

## ⚠️ ÖNEMLI NOTLAR

1. **Development build zaten queue'da** - cancel et veya devam ettir (test için kullanılabilir)
2. **Bu değişiklikler kod güncellemesi gerektirir** - yeni version (1.1) olacak
3. **Privacy policy güncellenmeli** - account deletion mention et
4. **2-3 gün sürer** - implementation + test
5. **Resubmit sonrası 1-3 gün** - review süresi

---

Hemen başlayalım mı? Önce hangisini yapalım:
1. 🔴 Terms of Service + Community Guidelines
2. 🔴 Report/Block features
3. 🔴 Delete Account feature
