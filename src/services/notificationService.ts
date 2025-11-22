import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Push notification token'ı al ve kaydet
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Bildirim izni verilmedi!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    // TODO: Implement proper logging service for production
  } else {
    // Push notifications only work on physical devices
    // TODO: Show user-friendly message in development mode
  }

  return token;
}

/**
 * Kullanıcının push token'ını veritabanına kaydet
 */
export async function savePushTokenToDatabase(userId: string, token: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      // TODO: Implement proper error logging service (e.g., Sentry)
      throw error;
    }
  } catch (error) {
    // TODO: Implement proper error logging service (e.g., Sentry)
    // Silent fail - token will be registered on next app launch
  }
}

/**
 * Yerel bildirim gönder (test için)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  seconds: number = 0
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: seconds > 0 ? { seconds } : null,
  });
}

/**
 * Bildirim tıklama listener'ı ekle
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Bildirim alma listener'ı ekle (uygulama açıkken)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Yeni katılım isteği bildirimi
 */
export async function sendParticipationRequestNotification(
  creatorPushToken: string,
  participantName: string,
  sessionTitle: string
) {
  // TODO: Implement with Supabase Edge Function or backend service
  // TODO: Send notification via Expo Push Notification API
}

/**
 * Sohbet mesajı bildirimi
 */
export async function sendChatMessageNotification(
  recipientPushToken: string,
  senderName: string,
  message: string
) {
  // TODO: Implement with Supabase Edge Function or backend service
  // TODO: Send notification via Expo Push Notification API
}

/**
 * Etkinlik hatırlatması bildirimi
 */
export async function sendEventReminderNotification(
  userPushToken: string,
  sessionTitle: string,
  timeUntilStart: string
) {
  // TODO: Implement with Supabase Edge Function or backend service
  // TODO: Send notification via Expo Push Notification API
}

/**
 * Schedule smart session reminders
 * Schedules notifications at 2 hours, 1 hour, and 30 minutes before session
 * Also schedules a rating reminder 1 hour after session ends
 */
export async function scheduleSessionReminders(
  sessionId: number,
  sessionTitle: string,
  sessionDate: string,
  location: string
) {
  const sessionTime = new Date(sessionDate);
  const now = new Date();

  // Calculate time differences
  const twoHoursBefore = new Date(sessionTime.getTime() - 2 * 60 * 60 * 1000);
  const oneHourBefore = new Date(sessionTime.getTime() - 60 * 60 * 1000);
  const thirtyMinsBefore = new Date(sessionTime.getTime() - 30 * 60 * 1000);
  const oneHourAfter = new Date(sessionTime.getTime() + 60 * 60 * 1000);

  // Schedule 2 hours before reminder
  if (twoHoursBefore > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Seansın 2 saat sonra!',
        body: `${sessionTitle} - ${location}`,
        data: { sessionId, type: 'session_reminder', timeUntil: '2 hours' },
        sound: true,
      },
      trigger: twoHoursBefore,
    });
  }

  // Schedule 1 hour before reminder
  if (oneHourBefore > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Seansın 1 saat sonra!',
        body: `${sessionTitle} - ${location}`,
        data: { sessionId, type: 'session_reminder', timeUntil: '1 hour' },
        sound: true,
      },
      trigger: oneHourBefore,
    });
  }

  // Schedule 30 minutes before reminder
  if (thirtyMinsBefore > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏃 Seansın 30 dakika sonra!',
        body: `${sessionTitle} - Hazırlanma zamanı!`,
        data: { sessionId, type: 'session_reminder', timeUntil: '30 minutes' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: thirtyMinsBefore,
    });
  }

  // Schedule rating reminder 1 hour after session ends
  if (oneHourAfter > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⭐ Katılımcıları Değerlendir',
        body: `"${sessionTitle}" seansı nasıl geçti? Katılımcıları değerlendirin!`,
        data: { sessionId, type: 'rating_reminder' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: oneHourAfter,
    });
  }
}

/**
 * Cancel all scheduled reminders for a session
 */
export async function cancelSessionReminders(sessionId: number) {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.sessionId === sessionId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Get all scheduled session reminders
 */
export async function getScheduledSessionReminders(): Promise<
  Array<{ sessionId: number; identifier: string; trigger: Date }>
> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  return scheduledNotifications
    .filter((n) => n.content.data?.type === 'session_reminder')
    .map((n) => ({
      sessionId: n.content.data.sessionId,
      identifier: n.identifier,
      trigger: n.trigger as any as Date,
    }));
}

/**
 * Send achievement unlocked notification
 */
export async function sendAchievementNotification(
  achievementName: string,
  achievementDescription: string,
  points: number
) {
  await scheduleLocalNotification(
    `🏆 Yeni Başarı: ${achievementName}`,
    `${achievementDescription} (+${points} puan)`,
    { type: 'achievement_unlocked' },
    0
  );
}

/**
 * Send new message notification
 */
export async function sendNewMessageNotification(
  sessionTitle: string,
  senderName: string,
  messagePreview: string,
  sessionId: number
) {
  await scheduleLocalNotification(
    `💬 ${senderName}`,
    `${sessionTitle}: ${messagePreview}`,
    { type: 'new_message', sessionId },
    0
  );
}

/**
 * Send session participant joined notification
 */
export async function sendParticipantJoinedNotification(
  sessionTitle: string,
  participantName: string,
  sessionId: number
) {
  await scheduleLocalNotification(
    '🎉 Yeni Katılımcı',
    `${participantName}, "${sessionTitle}" seansına katıldı!`,
    { type: 'participant_joined', sessionId },
    0
  );
}
