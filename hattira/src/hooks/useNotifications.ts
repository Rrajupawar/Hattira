// src/hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/config/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const { user } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    // Register but don't crash if it fails (Expo Go limitation)
    registerForPushNotifications(user.id).catch((e) =>
      console.warn('Push setup skipped:', e.message)
    );

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          matchId?: string;
        };
        console.log('Notification tapped:', data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);
}

async function registerForPushNotifications(userId: string): Promise<void> {
  // Must be a real device
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return;
  }

  // Check if running in Expo Go (notifications not supported in SDK 53+)
  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.warn(
      'Push notifications are not supported in Expo Go. ' +
      'Build a dev client: eas build --platform android --profile development'
    );
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied.');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  // Get projectId from app.json extra.eas.projectId
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
    console.warn(
      'EAS projectId not set. Run: npx eas init\n' +
      'Then restart: npx expo start --clear'
    );
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase
      .from('profiles')
      .update({ push_token: tokenData.data })
      .eq('id', userId);
    console.log('✅ Push token registered');
  } catch (error) {
    console.error('Push token registration failed:', error);
  }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, sound: 'default', title, body, data: data ?? {} }),
  });
}