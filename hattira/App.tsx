// App.tsx (project root)
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/i18n';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useNotifications } from './src/hooks/useNotifications';
function NotificationSetup() {
  useNotifications();
  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NotificationSetup />
      <RootNavigator />
    </SafeAreaProvider>
  );
}