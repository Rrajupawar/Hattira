// src/features/auth/screens/SignupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { AuthStackParamList } from '@/navigation/types';
import { authService } from '../services/authService';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
}

export function SignupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Name is required';
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid email required';
    if (password.length < 6) newErrors.password = 'Minimum 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await authService.signup({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
      });
      Alert.alert('Success', 'Account created! Check your email to verify.');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || t('auth.signup_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🗺️</Text>
          <Text style={styles.title}>Join {t('app_name')}</Text>
          <Text style={styles.subtitle}>ಹತ್ತಿರದ ಜನರನ್ನು ಭೇಟಿಯಾಗಿ</Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('auth.full_name')}
            placeholder={t('auth.name_placeholder')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={errors.fullName}
          />
          <Input
            label={t('auth.email')}
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label={t('auth.password')}
            placeholder={t('auth.password_placeholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Button
            title={t('auth.signup')}
            onPress={handleSignup}
            loading={isLoading}
            style={styles.signupButton}
          />

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.switchLink}
          >
            <Text style={styles.switchText}>{t('auth.have_account')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, padding: Spacing.base, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logo: { fontSize: 60, marginBottom: Spacing.md },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.extrabold, color: Colors.primary },
  subtitle: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, marginTop: 4 },
  form: { gap: Spacing.md },
  signupButton: { marginTop: Spacing.sm },
  switchLink: { alignItems: 'center', paddingVertical: Spacing.md },
  switchText: { color: Colors.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
});