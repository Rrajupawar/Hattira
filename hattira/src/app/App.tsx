// src/app/App.tsx — FINAL VERSION
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/i18n';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useNotifications } from '@/hooks/useNotifications';

function NotificationSetup() {
  useNotifications(); // side-effect only
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