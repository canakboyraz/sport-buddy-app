/**
 * Content Moderation Service
 * Provides basic content filtering and moderation features
 * to comply with App Store guidelines for user-generated content
 */

// Inappropriate words list (basic example - extend as needed)
const INAPPROPRIATE_WORDS_TR = [
  'küfür', 'hakaret', 'spam', 'dolandırıcı', 'sahte',
  // Add more Turkish inappropriate words as needed
];

const INAPPROPRIATE_WORDS_EN = [
  'spam', 'scam', 'fake', 'fraud', 'abuse',
  // Add more English inappropriate words as needed
];

// Combined list
const INAPPROPRIATE_WORDS = [
  ...INAPPROPRIATE_WORDS_TR,
  ...INAPPROPRIATE_WORDS_EN,
];

// Spam patterns (repeated characters, excessive caps, etc.)
const SPAM_PATTERNS = [
  /(.)\1{5,}/i, // Same character repeated 5+ times
  /[A-Z\s]{20,}/, // 20+ consecutive capital letters
  /(http|https|www\.).{5,}/gi, // URLs (may want to block external links)
];

export interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
  filteredContent?: string;
}

/**
 * Check if content contains inappropriate words
 */
function containsInappropriateWords(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return INAPPROPRIATE_WORDS.some(word => lowerContent.includes(word));
}

/**
 * Check if content matches spam patterns
 */
function matchesSpamPatterns(content: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if content is too short (potential spam)
 */
function isTooShort(content: string, minLength: number = 2): boolean {
  return content.trim().length < minLength;
}

/**
 * Check if content is excessively long
 */
function isTooLong(content: string, maxLength: number = 2000): boolean {
  return content.length > maxLength;
}

/**
 * Main moderation function for chat messages
 */
export function moderateChatMessage(content: string): ModerationResult {
  // Empty or whitespace only
  if (!content || !content.trim()) {
    return {
      isAllowed: false,
      reason: 'Message cannot be empty',
    };
  }

  // Too short
  if (isTooShort(content, 1)) {
    return {
      isAllowed: false,
      reason: 'Message is too short',
    };
  }

  // Too long
  if (isTooLong(content, 2000)) {
    return {
      isAllowed: false,
      reason: 'Message is too long (max 2000 characters)',
    };
  }

  // Check for inappropriate words
  if (containsInappropriateWords(content)) {
    return {
      isAllowed: false,
      reason: 'Message contains inappropriate content',
    };
  }

  // Check for spam patterns
  if (matchesSpamPatterns(content)) {
    return {
      isAllowed: false,
      reason: 'Message appears to be spam',
    };
  }

  return {
    isAllowed: true,
    filteredContent: content.trim(),
  };
}

/**
 * Moderation for session titles
 */
export function moderateSessionTitle(title: string): ModerationResult {
  if (!title || !title.trim()) {
    return {
      isAllowed: false,
      reason: 'Title cannot be empty',
    };
  }

  if (isTooShort(title, 3)) {
    return {
      isAllowed: false,
      reason: 'Title is too short (min 3 characters)',
    };
  }

  if (isTooLong(title, 100)) {
    return {
      isAllowed: false,
      reason: 'Title is too long (max 100 characters)',
    };
  }

  if (containsInappropriateWords(title)) {
    return {
      isAllowed: false,
      reason: 'Title contains inappropriate content',
    };
  }

  return {
    isAllowed: true,
    filteredContent: title.trim(),
  };
}

/**
 * Moderation for session descriptions
 */
export function moderateSessionDescription(description: string): ModerationResult {
  if (!description || !description.trim()) {
    return {
      isAllowed: true, // Description is optional
      filteredContent: '',
    };
  }

  if (isTooLong(description, 1000)) {
    return {
      isAllowed: false,
      reason: 'Description is too long (max 1000 characters)',
    };
  }

  if (containsInappropriateWords(description)) {
    return {
      isAllowed: false,
      reason: 'Description contains inappropriate content',
    };
  }

  if (matchesSpamPatterns(description)) {
    return {
      isAllowed: false,
      reason: 'Description appears to be spam',
    };
  }

  return {
    isAllowed: true,
    filteredContent: description.trim(),
  };
}

/**
 * Moderation for user bio
 */
export function moderateUserBio(bio: string): ModerationResult {
  if (!bio || !bio.trim()) {
    return {
      isAllowed: true, // Bio is optional
      filteredContent: '',
    };
  }

  if (isTooLong(bio, 500)) {
    return {
      isAllowed: false,
      reason: 'Bio is too long (max 500 characters)',
    };
  }

  if (containsInappropriateWords(bio)) {
    return {
      isAllowed: false,
      reason: 'Bio contains inappropriate content',
    };
  }

  return {
    isAllowed: true,
    filteredContent: bio.trim(),
  };
}

/**
 * Add a custom inappropriate word to the filter
 * (Can be used to dynamically update the filter based on reports)
 */
export function addInappropriateWord(word: string): void {
  if (word && !INAPPROPRIATE_WORDS.includes(word.toLowerCase())) {
    INAPPROPRIATE_WORDS.push(word.toLowerCase());
  }
}

/**
 * Rate limit check for preventing spam
 * Returns true if user is sending too many messages too quickly
 */
const messageTimestamps: { [userId: string]: number[] } = {};

export function checkRateLimit(
  userId: string,
  maxMessages: number = 5,
  timeWindowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();

  if (!messageTimestamps[userId]) {
    messageTimestamps[userId] = [];
  }

  // Remove old timestamps outside the time window
  messageTimestamps[userId] = messageTimestamps[userId].filter(
    timestamp => now - timestamp < timeWindowMs
  );

  // Check if user exceeded rate limit
  if (messageTimestamps[userId].length >= maxMessages) {
    return true; // Rate limit exceeded
  }

  // Add current timestamp
  messageTimestamps[userId].push(now);

  return false; // Within rate limit
}
