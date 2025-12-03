# 🤖 AI Features Documentation

Sport Buddy now includes powerful AI features powered by OpenAI GPT-4o-mini to enhance user experience and engagement.

## 🎯 Features Overview

### 1. AI Chatbot Assistant (SportBot)
**Location:** Profile → AI Assistant

**What it does:**
- Answers user questions in natural language
- Provides sport tips and motivation
- Helps find events and activities
- Offers app usage support

**Example Conversations:**
```
User: "I want to play tennis this Saturday"
Bot: "Great idea! There are 3 tennis sessions on Saturday in your area:
1. 🎾 Kadıköy Tennis Court - 10:00 (Intermediate)
2. 🎾 Moda Beach - 14:00 (Beginner)
3. 🎾 Bağdat Avenue - 17:00 (Advanced)
Which one would you like to join?"

User: "I'm new to running, any advice?"
Bot: "Welcome to the running world! 🏃‍♂️ Here are my tips:
1. ⏰ Start with 3 days/week, 20-30 minutes
2. 👟 Get good running shoes (very important!)
3. 💧 Drink plenty of water
4. 🎵 Listen to music for motivation
..."
```

---

### 2. Auto-Generate Session Descriptions
**Location:** Create Session → "Generate with AI" button

**What it does:**
- Creates professional, engaging session descriptions with one click
- Automatically adds emojis, hashtags, and checklist items
- Tailored to sport type and skill level

**Before:**
```
User enters:
- Sport: Basketball
- Title: "Sunday morning basketball"
- Location: Kadıköy Beach
- Date: April 15, 10:00 AM
- Level: Intermediate
```

**After (AI Generated):**
```
🏀 Sunday Morning Basketball Fun!

Let's meet at Kadıköy beach for an amazing Sunday morning!
5v5 match for intermediate players. Experienced and beginners welcome! 🙌

📍 Location: Kadıköy Beach Basketball Court
⏰ Time: 10:00 - 12:00
🎯 Level: Intermediate
👥 Capacity: 10 people

Bring with you:
• Water bottle 💧
• Sports shoes required 👟
• Good energy! ⚡

#Basketball #Kadıköy #SundayMorning #SportBuddy
```

---

### 3. Smart Session Matching
**Location:** Home Screen (can be integrated)

**What it does:**
- Calculates compatibility score (0-100) between user and session
- Multi-factor analysis:
  - Favorite sport match (40 points)
  - Skill level compatibility (30 points)
  - Location proximity (20 points)
  - Time preference (10 points)
- Provides match reasons

**Example Output:**
```typescript
{
  score: 95,
  reasons: [
    "Your favorite sport: Basketball",
    "Compatible skill level",
    "Close location",
    "Suitable time"
  ]
}
```

**Integration:**
```typescript
// After loading sessions
const userProfile = {
  skillLevel: 'intermediate',
  location: 'Kadıköy',
  favoriteSports: ['Basketball', 'Volleyball'],
  usualActivityTimes: ['18:00', '19:00']
};

for (const session of sessions) {
  const match = await getSessionMatchScore({
    userProfile,
    session
  });

  if (match.score > 70) {
    // Show in "Recommended for You" section
  }
}
```

---

### 4. Personalized Notifications
**Location:** Notification Service (can be integrated)

**What it does:**
- Generates personalized push notification messages
- Context-aware (new session, reminder, achievement, weekly summary)
- Uses emojis and friendly language
- Includes user's name

**Notification Types:**

**New Session:**
```
"Ahmet, how about some sports tonight? There's basketball in your favorite Kadıköy! 🏀"
```

**Reminder:**
```
"Your yoga session starts in 2 hours! Are you ready? 🧘‍♀️"
```

**Achievement:**
```
"Congratulations! You've attended 10 sessions! 🎉"
```

**Weekly Summary:**
```
"Great week! You attended 6 sessions 💪"
```

**Integration:**
```typescript
// Before sending notification
const message = await generatePersonalizedNotification({
  userName: user.full_name,
  notificationType: 'new_session',
  sessionInfo: {
    sportName: 'Basketball',
    location: 'Kadıköy',
    time: '18:00'
  },
  userPreferences: {
    favoriteSport: 'Basketball'
  },
  language: 'tr'
});

// Then send notification with personalized message
await sendPushNotification(userId, message);
```

---

### 5. Advanced AI Content Moderation
**Location:** All content inputs (chat, profile, sessions)

**What it does:**
- Context-aware moderation beyond simple keyword filtering
- Understands intent and context
- Multi-language support
- Provides severity level (low/medium/high)

**Examples:**

✅ **Allowed:**
```
"That was a terrible match" → OK (talking about the match)
"What bad weather today" → OK (talking about weather)
```

❌ **Blocked:**
```
"You're terrible at this" → BLOCKED (personal attack)
"Go play somewhere else, bad player" → BLOCKED (bullying detected, even though individual words aren't offensive)
```

**Usage:**
```typescript
const result = await moderateContentWithAI(
  userMessage,
  'chat',
  'tr'
);

if (!result.isAllowed) {
  Alert.alert('Warning', result.reason);
}
```

---

## 💰 Cost Estimation

**OpenAI GPT-4o-mini Pricing:**
- Input: $0.00015 / 1K tokens (200x cheaper than GPT-4)
- Output: $0.0006 / 1K tokens (100x cheaper than GPT-4)

**Approximate Costs Per Action:**
- Chatbot message: ~$0.00001 (1000 messages = $0.01)
- Description generation: ~$0.00003 (1000 generations = $0.03)
- Content moderation: ~$0.000005 (1000 moderations = $0.005)
- Notification personalization: ~$0.000005 (1000 notifications = $0.005)

**Monthly Estimate (1000 active users):**
- 5 chatbot messages/user: $0.05
- 2 description generations/user: $0.06
- 50 moderations/user: $0.25
- 20 notifications/user: $0.10
- **Total: ~$0.50/month** (180x cheaper than GPT-4!)

**Optimization Tips:**
- Cache common responses to reduce API calls
- Implement rate limiting (e.g., 20 AI requests/user/hour)
- Batch similar requests when possible
- Monitor usage with analytics
- Consider increasing feature limits with these low costs

---

## 🚀 Setup Instructions

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### 2. Add to Environment Variables

Add to `.env` file:
```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-key-here
```

### 3. Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Start with clear cache
npx expo start --clear
```

### 4. Test Features

1. **Test AI Assistant:**
   - Go to Profile → AI Assistant
   - Ask: "I want to play basketball"

2. **Test Auto-Description:**
   - Go to Create Session
   - Fill sport, title, location
   - Click "Generate with AI"

3. **Test Content Moderation:**
   - Try sending inappropriate messages in chat
   - Should be blocked with reason

---

## 🔧 Configuration

### Adjust AI Behavior

Edit `src/services/aiService.ts`:

```typescript
// Change chatbot personality
const systemPrompt = `You are SportBot...
- Be friendly and motivating  // Modify this
- Use emojis moderately        // Modify this
- Keep responses short         // Modify this
...`;

// Adjust response length
max_tokens: 250,  // Increase/decrease

// Adjust creativity
temperature: 0.8,  // 0.0 = deterministic, 1.0 = creative
```

### Model Selection

**Currently Using: GPT-4o-mini** ✅

We're already using the most cost-effective model! GPT-4o-mini provides:
- 🎯 High quality responses
- ⚡ Fast response times
- 💰 Lowest cost of all GPT models
- 🌍 Excellent multilingual support (Turkish & English)

**Cost Comparison:**
- GPT-4: $0.03 input / $0.06 output
- GPT-3.5-Turbo: $0.001 input / $0.002 output
- **GPT-4o-mini: $0.00015 input / $0.0006 output** (Best value!)
- **200x cheaper than GPT-4, 7x cheaper than GPT-3.5-Turbo!**

No need to optimize further - you're already using the best model for cost efficiency!

---

## 📊 Monitoring & Analytics

### Track AI Usage

Add logging to track costs:

```typescript
// In aiService.ts
const logAIUsage = (feature: string, inputTokens: number, outputTokens: number) => {
  // GPT-4o-mini pricing: $0.00015 input, $0.0006 output per 1K tokens
  const cost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;
  console.log(`[AI] ${feature}: $${cost.toFixed(6)}`);

  // Send to analytics service
  analytics.track('ai_usage', {
    feature,
    cost,
    tokens: inputTokens + outputTokens
  });
};
```

### Monitor Errors

```typescript
try {
  const response = await openai.chat.completions.create({...});
} catch (error) {
  if (error.status === 429) {
    // Rate limit exceeded
    console.error('OpenAI rate limit hit');
  } else if (error.status === 401) {
    // Invalid API key
    console.error('Invalid OpenAI API key');
  } else {
    console.error('OpenAI error:', error);
  }
}
```

---

## 🛡️ Security Best Practices

1. **Never expose API key:**
   - ✅ Use environment variables
   - ❌ Never commit `.env` to git
   - ✅ API key is in `.gitignore`

2. **Rate limiting:**
   ```typescript
   // Limit AI calls per user
   const aiCallsThisHour = await redis.get(`ai:${userId}:hour`);
   if (aiCallsThisHour > 20) {
     throw new Error('Rate limit exceeded');
   }
   ```

3. **Input validation:**
   ```typescript
   // Limit input length
   if (userMessage.length > 500) {
     throw new Error('Message too long');
   }
   ```

4. **Content filtering:**
   ```typescript
   // Don't send sensitive data to AI
   const sanitizedMessage = userMessage
     .replace(/\b\d{16}\b/g, '[CARD]')  // Remove credit cards
     .replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '[EMAIL]');  // Remove emails
   ```

---

## 🐛 Troubleshooting

### "OpenAI API key not found"
- Check `.env` file has `EXPO_PUBLIC_OPENAI_API_KEY=sk-...`
- Restart Expo dev server with `--clear` flag
- Key must start with `EXPO_PUBLIC_` for React Native

### "Rate limit exceeded"
- You've hit OpenAI's rate limit
- Wait a few minutes
- Upgrade to paid plan for higher limits
- Implement caching to reduce API calls

### "Invalid API key"
- Check key is correct (starts with `sk-proj-` or `sk-`)
- Check key hasn't expired
- Regenerate key from OpenAI dashboard

### AI responses are slow
- Normal for GPT-4 (2-5 seconds)
- Switch to GPT-3.5-Turbo for faster responses
- Add loading indicators for better UX

### Responses are in wrong language
- Check `language` parameter is correct ('tr' or 'en')
- Check system prompt specifies language
- Verify `t('common.languageCode')` returns correct value

---

## 📝 Future Enhancements

### 1. Voice Assistant
- Add speech-to-text for AI chatbot
- Voice commands: "Find me basketball sessions"

### 2. Image Analysis
- Analyze workout form from photos/videos
- Detect exercise type from images

### 3. Predictive Analytics
- Predict which users will attend which sessions
- Suggest optimal session times based on historical data

### 4. Automated Coach
- Generate personalized workout plans
- Track progress and adjust recommendations

### 5. Multi-lingual Support
- Auto-detect user language
- Support more languages (Arabic, German, etc.)

---

## 🤝 Support

For issues or questions:
- GitHub: [sport-buddy-app/issues](https://github.com/your-repo/issues)
- Email: support@sportbuddy.app
- OpenAI Docs: https://platform.openai.com/docs

---

## 📄 License

AI features are part of Sport Buddy application.
OpenAI API usage subject to [OpenAI Terms of Service](https://openai.com/policies/terms-of-use).
