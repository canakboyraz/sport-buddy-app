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
    console.log('Push token:', token);
  } else {
    // Emulator/Simulator için uyarı
    console.log('Push notifications sadece fiziksel cihazda çalışır');
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
      console.error('Push token kaydetme hatası:', error);
    } else {
      console.log('Push token başarıyla kaydedildi');
    }
  } catch (error) {
    console.error('Push token kaydetme hatası:', error);
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
  // Burada Supabase Edge Function veya backend servisi kullanılmalı
  // Expo Push Notification API'si ile bildirim gönderilir
  console.log('Katılım isteği bildirimi:', {
    to: creatorPushToken,
    title: 'Yeni Katılım İsteği',
    body: `${participantName}, "${sessionTitle}" etkinliğine katılmak istiyor`,
  });
}

/**
 * Sohbet mesajı bildirimi
 */
export async function sendChatMessageNotification(
  recipientPushToken: string,
  senderName: string,
  message: string
) {
  console.log('Sohbet bildirimi:', {
    to: recipientPushToken,
    title: `Yeni mesaj: ${senderName}`,
    body: message,
  });
}

/**
 * Etkinlik hatırlatması bildirimi
 */
export async function sendEventReminderNotification(
  userPushToken: string,
  sessionTitle: string,
  timeUntilStart: string
) {
  console.log('Etkinlik hatırlatması:', {
    to: userPushToken,
    title: 'Etkinlik Hatırlatması',
    body: `"${sessionTitle}" ${timeUntilStart} sonra başlıyor`,
  });
}
