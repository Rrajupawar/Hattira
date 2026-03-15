// src/features/profile/screens/EditProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/stores/authStore';
import { profileService } from '../services/profileService';
import { Avatar } from '@/components/common/Avatar';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { CONSTANTS } from '@/config/constants';

// FIX: ensure named export (not default export) matches AppNavigator import
export function EditProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { profile, user, setProfile } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      const url = await profileService.pickAndUploadAvatar(user.id);
      setAvatarUrl(url);
    } catch (error: unknown) {
      if (error instanceof Error && error.message !== 'Cancelled') {
        Alert.alert('Upload Failed', error.message);
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user || !fullName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile(user.id, {
        full_name: fullName.trim(),
        username: username.trim() || profile?.username,
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });
      setProfile(updated);
      navigation.goBack();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.avatarSection}>
        <Avatar uri={avatarUrl} name={fullName} size={90} />
        <TouchableOpacity onPress={handlePickAvatar} disabled={isUploadingAvatar}>
          <Text style={styles.changePhotoText}>
            {isUploadingAvatar ? 'Uploading...' : t('profile.change_photo')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Input
          label={t('auth.full_name')}
          value={fullName}
          onChangeText={setFullName}
          maxLength={CONSTANTS.MAX_NAME_LENGTH}
          autoCapitalize="words"
        />
        <Input
          label={t('profile.username')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          leftIcon="@"
          placeholder={t('profile.username_placeholder')}
        />
        <Input
          label={t('profile.bio')}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          maxLength={CONSTANTS.MAX_BIO_LENGTH}
          placeholder={t('profile.bio_placeholder')}
          hint={`${bio.length}/${CONSTANTS.MAX_BIO_LENGTH}`}
        />
        <Button
          title={t('profile.save_changes')}
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  avatarSection: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  changePhotoText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  form: { padding: Spacing.base, gap: Spacing.md },
  saveButton: { marginTop: Spacing.sm },
});