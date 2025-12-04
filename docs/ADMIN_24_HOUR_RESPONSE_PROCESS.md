# 🛡️ Admin 24-Hour Response Process

**Compliance:** App Store Guideline 1.2 - User-Generated Content

**Effective Date:** December 3, 2024

---

## 📋 OVERVIEW

Sport Buddy is committed to maintaining a safe and respectful community. All user reports are reviewed and actioned within 24 hours of submission.

---

## 🎯 COMMITMENT

**We guarantee:**
- ✅ All reports reviewed within 24 hours
- ✅ Immediate action for severe violations
- ✅ Clear communication with reporters
- ✅ Complete audit trail

---

## 📊 REPORT MONITORING

### 1. Daily Report Review

**Schedule:**
- Morning: 9:00 AM (UTC+3)
- Afternoon: 2:00 PM (UTC+3)
- Evening: 7:00 PM (UTC+3)

**Process:**
```sql
-- Check pending reports
SELECT
  id,
  reporter_id,
  reported_user_id,
  report_type,
  description,
  created_at,
  EXTRACT(HOUR FROM (NOW() - created_at)) as hours_pending
FROM user_reports
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### 2. Automated Alerts

**Email Alert Triggers:**

**20-Hour Warning (4 hours before deadline):**
```
To: privacy@sportbuddy.app
Subject: URGENT: Reports pending for 20+ hours

Reports needing immediate review:
- Report ID: 123 (harassment)
- Report ID: 124 (spam)
- Report ID: 125 (inappropriate)

Action required within 4 hours.

Dashboard: https://supabase.com/dashboard/project/[project-id]/editor
```

**23-Hour Critical Alert:**
```
To: privacy@sportbuddy.app
Subject: CRITICAL: Reports about to exceed 24-hour deadline

IMMEDIATE ACTION REQUIRED!

Reports pending for 23+ hours:
- Report ID: 126 (fake_profile) - Submitted: [timestamp]

You have 1 hour remaining to review.
```

---

## ⚡ SEVERITY CLASSIFICATION

### Critical (Immediate Action - 1 hour)
- Threats of violence
- Sexual harassment
- Hate speech
- Sharing personal information
- Child safety concerns

**Action:** Immediate account suspension + content removal

### High (Within 6 hours)
- Repeated harassment
- Explicit inappropriate content
- Impersonation
- Scam attempts

**Action:** Account warning or temporary suspension

### Medium (Within 12 hours)
- Spam
- Minor inappropriate content
- Aggressive behavior

**Action:** Content removal + warning

### Low (Within 24 hours)
- General complaints
- Minor disputes
- False reports

**Action:** Review and dismiss if no violation

---

## 🔧 REVIEW PROCESS

### Step 1: Access Supabase Dashboard
```
https://supabase.com/dashboard/project/[your-project-id]/editor
```

### Step 2: Query Pending Reports
```sql
-- Get report details with user information
SELECT
  ur.id as report_id,
  ur.report_type,
  ur.description,
  ur.created_at,
  EXTRACT(HOUR FROM (NOW() - ur.created_at)) as hours_pending,
  reporter.full_name as reporter_name,
  reporter.email as reporter_email,
  reported.full_name as reported_user_name,
  reported.email as reported_user_email
FROM user_reports ur
LEFT JOIN profiles reporter ON reporter.id = ur.reporter_id
LEFT JOIN profiles reported ON reported.id = ur.reported_user_id
WHERE ur.status = 'pending'
ORDER BY ur.created_at ASC;
```

### Step 3: Investigate Reported Content
```sql
-- Check reported user's recent activity
SELECT
  ss.id,
  ss.title,
  ss.description,
  ss.created_at
FROM sport_sessions ss
WHERE ss.creator_id = '[reported_user_id]'
ORDER BY ss.created_at DESC
LIMIT 10;

-- Check reported user's messages
SELECT
  cm.id,
  cm.message,
  cm.created_at
FROM chat_messages cm
WHERE cm.sender_id = '[reported_user_id]'
ORDER BY cm.created_at DESC
LIMIT 20;
```

### Step 4: Take Action

**A) Warning (First Offense)**
```sql
-- Update report status
UPDATE user_reports
SET
  status = 'reviewed',
  reviewed_at = NOW(),
  reviewed_by = '[admin_user_id]',
  admin_notes = 'Warning issued to user'
WHERE id = [report_id];

-- Send warning email to reported user
-- (Manual email for now, automated system coming soon)
```

**B) Content Removal**
```sql
-- Delete specific session
DELETE FROM sport_sessions WHERE id = '[session_id]';

-- Delete specific messages
DELETE FROM chat_messages WHERE id = '[message_id]';

-- Update report
UPDATE user_reports
SET
  status = 'resolved',
  reviewed_at = NOW(),
  reviewed_by = '[admin_user_id]',
  admin_notes = 'Content removed'
WHERE id = [report_id];
```

**C) Account Suspension (Temporary - 7 days)**
```sql
-- Add suspension flag to profile
UPDATE profiles
SET
  is_suspended = TRUE,
  suspension_until = NOW() + INTERVAL '7 days',
  suspension_reason = '[reason]'
WHERE id = '[reported_user_id]';

-- Update report
UPDATE user_reports
SET
  status = 'resolved',
  reviewed_at = NOW(),
  reviewed_by = '[admin_user_id]',
  admin_notes = 'User suspended for 7 days'
WHERE id = [report_id];
```

**D) Permanent Ban**
```sql
-- Delete all user content and account
SELECT delete_user_account('[reported_user_id]');

-- Update report
UPDATE user_reports
SET
  status = 'resolved',
  reviewed_at = NOW(),
  reviewed_by = '[admin_user_id]',
  admin_notes = 'User permanently banned and account deleted'
WHERE id = [report_id];
```

**E) Dismiss (False Report)**
```sql
-- Update report status
UPDATE user_reports
SET
  status = 'dismissed',
  reviewed_at = NOW(),
  reviewed_by = '[admin_user_id]',
  admin_notes = 'No violation found after investigation'
WHERE id = [report_id];
```

### Step 5: Notify Reporter
```
Subject: Your Report Has Been Reviewed

Dear [Reporter Name],

Thank you for reporting inappropriate content on Sport Buddy. We have reviewed your report (#[report_id]) and taken appropriate action.

Report Type: [type]
Submitted: [date]
Action Taken: [action summary]

Your vigilance helps keep Sport Buddy safe for everyone.

Best regards,
Sport Buddy Team
privacy@sportbuddy.app
```

---

## 🔄 AUTOMATED MONITORING (Future Implementation)

**Planned Features:**
- Supabase Edge Function for email alerts
- Admin dashboard web interface
- Mobile admin app
- Slack/Discord notifications
- AI-powered content flagging

**Current Workaround:**
- Manual Supabase dashboard checks (3x daily)
- Email reminders via calendar
- Manual SQL queries

---

## 📈 METRICS & REPORTING

### Weekly Report Format
```
Date Range: [start] - [end]

Total Reports: 45
├─ Reviewed: 42 (93%)
├─ Pending: 3 (7%)
└─ Average Response Time: 8 hours

Actions Taken:
├─ Warnings: 15 (36%)
├─ Content Removed: 18 (43%)
├─ Suspensions: 5 (12%)
├─ Permanent Bans: 4 (9%)
└─ Dismissed: 0 (0%)

Report Types:
├─ Harassment: 12 (27%)
├─ Spam: 18 (40%)
├─ Inappropriate: 8 (18%)
├─ Fake Profile: 5 (11%)
└─ Other: 2 (4%)

Compliance: ✅ 100% reviewed within 24 hours
```

---

## 🆘 ESCALATION PROCEDURES

**Emergency Contact:**
- Primary: Can Akboyraz (privacy@sportbuddy.app)
- Phone: +90 507 499 8785
- Response Time: 1 hour (for critical issues)

**Emergency Actions:**
1. Immediate account suspension
2. Content removal
3. Law enforcement notification (if required)
4. User notification

---

## 📚 REFERENCE DOCUMENTS

- Community Guidelines: `docs/legal/community-guidelines.md`
- Terms of Service: `docs/legal/terms-of-service-en.md`
- Privacy Policy: `docs/legal/privacy-policy-en.md`
- Supabase Admin Guide: `docs/SUPABASE_ADMIN_GUIDE.md`

---

## ✅ COMPLIANCE CHECKLIST

**Daily:**
- [ ] Check Supabase dashboard at 9 AM, 2 PM, 7 PM
- [ ] Review all pending reports
- [ ] Take action on reports older than 20 hours
- [ ] Send notifications to reporters

**Weekly:**
- [ ] Generate metrics report
- [ ] Review repeat offenders
- [ ] Update processes based on trends

**Monthly:**
- [ ] Review and update community guidelines
- [ ] Analyze report patterns
- [ ] Train any new admin team members

---

## 🔐 ADMIN ACCESS

**Supabase Dashboard:**
```
URL: https://supabase.com/dashboard
Project: [your-project-id]
Tables: user_reports, profiles, sport_sessions, chat_messages
```

**Required Permissions:**
- Read: All tables
- Write: user_reports (status updates)
- Delete: sport_sessions, chat_messages (for content removal)
- Execute: delete_user_account() function (for permanent bans)

---

## 📧 CONTACT

**For urgent safety concerns:**
- Email: privacy@sportbuddy.app
- Response Time: Within 1 hour for critical issues
- Available: 24/7

---

**Last Updated:** December 3, 2024
**Next Review:** January 3, 2025
**Owner:** Can Akboyraz
