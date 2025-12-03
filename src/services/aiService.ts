/**
 * AI Service
 * OpenAI GPT-4o-mini integration for intelligent features
 * Using GPT-4o-mini for cost efficiency and faster responses
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // For React Native
});

/**
 * AI Chatbot Assistant
 * Helps users with questions, event search, sport tips
 */
export async function getChatbotResponse(
  userMessage: string,
  userContext?: {
    userName?: string;
    location?: string;
    favoriteSports?: string[];
    language?: 'tr' | 'en';
  }
): Promise<string> {
  try {
    const language = userContext?.language || 'tr';

    const systemPrompt = language === 'tr'
      ? `Sen Sport Buddy uygulamasının AI asistanısın. Adın SportBot.

Görevin:
- Kullanıcılara spor etkinlikleri bulma konusunda yardımcı olmak
- Spor ipuçları ve motivasyon vermek
- Genel sorularını cevaplamak
- Uygulama kullanımında destek sağlamak

Kurallar:
- Her zaman samimi, dostça ve motive edici ol
- Kısa ve öz cevaplar ver (max 3-4 cümle)
- Emoji kullan ama abartma (her cümlede değil)
- Türkçe konuş, günlük dil kullan
- Spor ve sağlık konularında uzman gibi davran
- Eğer bir şeyi bilmiyorsan dürüstçe söyle

Kullanıcı bilgileri:
${userContext?.userName ? `- İsim: ${userContext.userName}` : ''}
${userContext?.location ? `- Konum: ${userContext.location}` : ''}
${userContext?.favoriteSports?.length ? `- Favori Sporlar: ${userContext.favoriteSports.join(', ')}` : ''}`
      : `You are SportBot, the AI assistant for Sport Buddy app.

Your role:
- Help users find sports events
- Provide sports tips and motivation
- Answer general questions
- Support app usage

Rules:
- Be friendly, casual, and motivating
- Keep responses short (max 3-4 sentences)
- Use emojis moderately
- Act as a sports and health expert
- Be honest if you don't know something

User info:
${userContext?.userName ? `- Name: ${userContext.userName}` : ''}
${userContext?.location ? `- Location: ${userContext.location}` : ''}
${userContext?.favoriteSports?.length ? `- Favorite Sports: ${userContext.favoriteSports.join(', ')}` : ''}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 250,
      temperature: 0.8,
    });

    return response.choices[0].message.content ||
      (language === 'tr' ? 'Üzgünüm, anlayamadım. Tekrar söyler misin?' : 'Sorry, I didn\'t understand. Can you rephrase?');
  } catch (error) {
    console.error('AI Chatbot error:', error);
    const language = userContext?.language || 'tr';
    return language === 'tr'
      ? 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar dene.'
      : 'Sorry, I can\'t respond right now. Please try again later.';
  }
}

/**
 * Auto-generate session description
 * Creates engaging descriptions for sports sessions
 */
export async function generateSessionDescription(params: {
  sportName: string;
  date: string;
  time: string;
  location: string;
  skillLevel: string;
  maxParticipants?: number;
  language?: 'tr' | 'en';
}): Promise<string> {
  try {
    const { sportName, date, time, location, skillLevel, maxParticipants, language = 'tr' } = params;

    const prompt = language === 'tr'
      ? `Bir spor seansı için çekici ve motive edici açıklama yaz.

Bilgiler:
- Spor: ${sportName}
- Tarih: ${date}
- Saat: ${time}
- Konum: ${location}
- Seviye: ${skillLevel}
${maxParticipants ? `- Maksimum Katılımcı: ${maxParticipants}` : ''}

Gereksinimler:
1. Başlık (emoji ile başla)
2. Kısa tanıtım paragrafı (2-3 cümle, motive edici)
3. Bilgiler bölümü:
   📍 Konum
   ⏰ Saat
   🎯 Seviye
   👥 Kontenjan
4. Getirilmesi gerekenler listesi (3-4 madde, emoji ile)
5. Alakalı hashtag'ler (3-4 tane)

Ton: Samimi, enerjik, motive edici
Uzunluk: Orta (200-300 kelime)`
      : `Write an engaging and motivating description for a sports session.

Information:
- Sport: ${sportName}
- Date: ${date}
- Time: ${time}
- Location: ${location}
- Skill Level: ${skillLevel}
${maxParticipants ? `- Max Participants: ${maxParticipants}` : ''}

Requirements:
1. Title (start with emoji)
2. Brief intro (2-3 sentences, motivating)
3. Info section:
   📍 Location
   ⏰ Time
   🎯 Level
   👥 Capacity
4. What to bring (3-4 items with emoji)
5. Relevant hashtags (3-4)

Tone: Friendly, energetic, motivating
Length: Medium (200-300 words)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.9,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Generate description error:', error);
    return '';
  }
}

/**
 * Enhanced content moderation with AI
 * Context-aware moderation beyond simple keyword filtering
 */
export async function moderateContentWithAI(
  content: string,
  context: 'chat' | 'profile' | 'session',
  language: 'tr' | 'en' = 'tr'
): Promise<{
  isAllowed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}> {
  try {
    const prompt = language === 'tr'
      ? `Aşağıdaki içeriği spor uygulaması bağlamında değerlendir.
Bağlam: ${context === 'chat' ? 'Sohbet mesajı' : context === 'profile' ? 'Profil bilgisi' : 'Seans açıklaması'}

İçerik: "${content}"

Değerlendir:
1. Hakaret veya küfür var mı?
2. Zorbalık (bullying) var mı?
3. Cinsel/uygunsuz içerik var mı?
4. Spam veya reklam var mı?
5. Bağlama uygun mu? (örn: "berbat maç" uygun, "sen berbatsın" uygunsuz)

JSON formatında cevap ver:
{
  "uygun": true/false,
  "sebep": "kısa açıklama (varsa)",
  "siddet": "low/medium/high (varsa)"
}`
      : `Evaluate the following content in a sports app context.
Context: ${context === 'chat' ? 'Chat message' : context === 'profile' ? 'Profile info' : 'Session description'}

Content: "${content}"

Evaluate:
1. Any insults or profanity?
2. Any bullying?
3. Any sexual/inappropriate content?
4. Any spam or advertising?
5. Is it contextually appropriate? (e.g., "terrible match" is ok, "you're terrible" is not)

Respond in JSON format:
{
  "allowed": true/false,
  "reason": "brief explanation (if any)",
  "severity": "low/medium/high (if any)"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      isAllowed: language === 'tr' ? result.uygun !== false : result.allowed !== false,
      reason: language === 'tr' ? result.sebep : result.reason,
      severity: language === 'tr' ? result.siddet : result.severity,
    };
  } catch (error) {
    console.error('AI moderation error:', error);
    // Fallback to allowing content if AI fails
    return { isAllowed: true };
  }
}

/**
 * Generate personalized notification message
 * Creates context-aware, personalized push notification text
 */
export async function generatePersonalizedNotification(params: {
  userName: string;
  notificationType: 'new_session' | 'session_reminder' | 'achievement' | 'weekly_summary';
  sessionInfo?: {
    sportName: string;
    location: string;
    time: string;
  };
  userPreferences?: {
    favoriteSport?: string;
    usualTime?: string;
  };
  achievementInfo?: {
    type: string;
    count: number;
  };
  language?: 'tr' | 'en';
}): Promise<string> {
  try {
    const { userName, notificationType, sessionInfo, userPreferences, achievementInfo, language = 'tr' } = params;

    let prompt = '';

    if (language === 'tr') {
      switch (notificationType) {
        case 'new_session':
          prompt = `Kullanıcı adı: ${userName}
Favori spor: ${userPreferences?.favoriteSport || 'Bilinmiyor'}
Yeni seans: ${sessionInfo?.sportName} - ${sessionInfo?.location} - ${sessionInfo?.time}

Kişiselleştirilmiş bildirim metni yaz (max 60 karakter, emoji kullan, samimi):`;
          break;
        case 'session_reminder':
          prompt = `${userName} için seans hatırlatması yaz.
Seans: ${sessionInfo?.sportName} - ${sessionInfo?.time}
Ton: Motive edici, samimi (max 60 karakter, emoji ekle):`;
          break;
        case 'achievement':
          prompt = `${userName} için başarı kutlama mesajı yaz.
Başarı: ${achievementInfo?.count} ${achievementInfo?.type}
Ton: Kutlayıcı, motive edici (max 60 karakter, emoji ekle):`;
          break;
        case 'weekly_summary':
          prompt = `${userName} için haftalık özet bildirimi yaz.
Ton: Motive edici (max 60 karakter, emoji ekle):`;
          break;
      }
    } else {
      switch (notificationType) {
        case 'new_session':
          prompt = `User name: ${userName}
Favorite sport: ${userPreferences?.favoriteSport || 'Unknown'}
New session: ${sessionInfo?.sportName} - ${sessionInfo?.location} - ${sessionInfo?.time}

Write personalized notification (max 60 chars, use emoji, friendly):`;
          break;
        case 'session_reminder':
          prompt = `Write session reminder for ${userName}.
Session: ${sessionInfo?.sportName} - ${sessionInfo?.time}
Tone: Motivating, friendly (max 60 chars, add emoji):`;
          break;
        case 'achievement':
          prompt = `Write achievement celebration for ${userName}.
Achievement: ${achievementInfo?.count} ${achievementInfo?.type}
Tone: Celebratory, motivating (max 60 chars, add emoji):`;
          break;
        case 'weekly_summary':
          prompt = `Write weekly summary notification for ${userName}.
Tone: Motivating (max 60 chars, add emoji):`;
          break;
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0.9,
    });

    return response.choices[0].message.content?.trim() || '';
  } catch (error) {
    console.error('Generate notification error:', error);
    return '';
  }
}

/**
 * Smart session matching
 * Uses AI to match users with compatible sessions
 */
export async function getSessionMatchScore(params: {
  userProfile: {
    skillLevel: string;
    location: string;
    favoriteSports: string[];
    usualActivityTimes: string[];
  };
  session: {
    sportName: string;
    location: string;
    time: string;
    skillLevel: string;
    creatorRating?: number;
  };
}): Promise<{
  score: number; // 0-100
  reasons: string[];
}> {
  try {
    // Simple scoring algorithm (can be enhanced with ML later)
    let score = 0;
    const reasons: string[] = [];

    // Sport match (40 points)
    if (params.userProfile.favoriteSports.includes(params.session.sportName)) {
      score += 40;
      reasons.push(`Favori sporun: ${params.session.sportName}`);
    }

    // Skill level match (30 points)
    if (params.userProfile.skillLevel === params.session.skillLevel) {
      score += 30;
      reasons.push('Seviye uyumlu');
    } else if (
      (params.userProfile.skillLevel === 'intermediate' && ['beginner', 'advanced'].includes(params.session.skillLevel)) ||
      (params.userProfile.skillLevel === 'advanced' && params.session.skillLevel === 'intermediate')
    ) {
      score += 15;
      reasons.push('Yakın seviye');
    }

    // Location match (20 points)
    const userCity = params.userProfile.location.split(',')[0].trim();
    const sessionCity = params.session.location.split(',')[0].trim();
    if (userCity === sessionCity) {
      score += 20;
      reasons.push('Yakın konum');
    } else if (params.userProfile.location.toLowerCase().includes(sessionCity.toLowerCase())) {
      score += 10;
      reasons.push('Aynı bölge');
    }

    // Time match (10 points)
    const sessionHour = new Date(params.session.time).getHours();
    const userUsualHours = params.userProfile.usualActivityTimes.map(t => parseInt(t.split(':')[0]));
    if (userUsualHours.some(h => Math.abs(h - sessionHour) <= 2)) {
      score += 10;
      reasons.push('Uygun saat');
    }

    return { score, reasons };
  } catch (error) {
    console.error('Session match score error:', error);
    return { score: 0, reasons: [] };
  }
}
