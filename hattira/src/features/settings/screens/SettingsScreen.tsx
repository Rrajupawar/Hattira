// src/features/settings/screens/SettingsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from 'src/stores/settingsStore';
import { LanguageCode } from '@/i18n';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { Theme } from '@/theme';

interface SettingRowProps {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: object;
}

function SettingRow({ label, value, right, onPress, style }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, style]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {right ?? (onPress && <Text style={styles.chevron}>›</Text>)}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const { language, setLanguage, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logout_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleLanguageChange = async (lang: LanguageCode) => {
    await setLanguage(lang);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Language */}
      <SectionHeader title={t('settings.language')} />
      <View style={styles.section}>
        <SettingRow
          label={t('settings.english')}
          right={
            <TouchableOpacity
              onPress={() => handleLanguageChange('en')}
              style={[styles.langButton, language === 'en' && styles.langButtonActive]}
            >
              <Text style={[styles.langButtonText, language === 'en' && styles.langButtonTextActive]}>
                {language === 'en' ? '✓ Selected' : 'Select'}
              </Text>
            </TouchableOpacity>
          }
        />
        <View style={styles.divider} />
        <SettingRow
          label={t('settings.kannada')}
          right={
            <TouchableOpacity
              onPress={() => handleLanguageChange('kn')}
              style={[styles.langButton, language === 'kn' && styles.langButtonActive]}
            >
              <Text style={[styles.langButtonText, language === 'kn' && styles.langButtonTextActive]}>
                {language === 'kn' ? '✓ ಆಯ್ಕೆ' : 'ಆಯ್ಕೆ'}
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Notifications */}
      <SectionHeader title={t('settings.notifications')} />
      <View style={styles.section}>
        <SettingRow
          label={t('settings.notifications_enabled')}
          right={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          }
        />
      </View>

      {/* About */}
      <SectionHeader title={t('settings.about')} />
      <View style={styles.section}>
        <SettingRow
          label={t('settings.privacy_policy')}
          onPress={() => {}}
        />
        <View style={styles.divider} />
        <SettingRow
          label={t('settings.version', { version: appVersion })}
        />
      </View>

      {/* Logout */}
      <View style={[styles.section, styles.logoutSection]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  sectionHeader: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: Typography.fontSize.base, color: Colors.text },
  rowValue: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.base },
  langButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  langButtonText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, fontWeight: Typography.fontWeight.medium },
  langButtonTextActive: { color: Colors.white },
  logoutSection: { marginTop: Spacing['2xl'], marginBottom: Spacing.xl },
  logoutButton: { padding: Spacing.base, alignItems: 'center' },
  logoutText: { color: Colors.error, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
});