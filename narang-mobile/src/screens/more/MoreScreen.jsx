import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Card, Text, List, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import AppButton from '../../components/common/AppButton';
import ConfirmModal from '../../components/common/ConfirmModal';
import AppLogo from '../../components/common/AppLogo';
import ScreenContainer from '../../components/common/ScreenContainer';
import LanguageSettingsSection from '../../components/settings/LanguageSettingsSection';
import { APP_NAME } from '../../constants/branding';
import { backupPendingData } from '../../services/backupService';
import { useSyncStore } from '../../stores/syncStore';
import { useNetworkStore } from '../../stores/networkStore';
import { useLanguageStore } from '../../stores/languageStore';

const menuItems = [
  { titleKey: 'more.profit', screen: 'Profit', icon: 'cash-plus', adminOnly: true },
  { titleKey: 'more.reports', screen: 'Reports', icon: 'chart-bar', adminOnly: true },
  { titleKey: 'more.parties', screen: 'Parties', icon: 'account-multiple' },
  { titleKey: 'more.customers', screen: 'Customers', icon: 'account-group' },
  { titleKey: 'more.suppliers', screen: 'Suppliers', icon: 'store' },
  { titleKey: 'more.expenses', screen: 'Expenses', icon: 'cash-minus' },
  { titleKey: 'more.settings', screen: 'Settings', icon: 'cog', adminOnly: true },
];

export default function MoreScreen({ navigation }) {
  const theme = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const t = useLanguageStore((s) => s.t);
  const isRtl = useLanguageStore((s) => s.locale) === 'ur';
  const items = menuItems.filter((item) => !item.adminOnly || isAdmin);
  const pendingCount = useSyncStore((s) => s.queue.length);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [backingUp, setBackingUp] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setLogoutVisible(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleBackup = async () => {
    if (backingUp) return;
    if (!isOnline) {
      Alert.alert(t('backup.offlineTitle'), t('backup.offlineMessage'));
      return;
    }
    setBackingUp(true);
    try {
      const result = await backupPendingData();
      if (result.offline) {
        Alert.alert(t('backup.offlineTitle'), t('backup.offlineMessage'));
        return;
      }
      if (result.alreadySynced) {
        Alert.alert(t('backup.alreadySyncedTitle'), t('backup.alreadySyncedMessage'));
        return;
      }
      if (result.failed > 0) {
        Alert.alert(
          t('backup.incompleteTitle'),
          t('backup.incompleteMessage', { synced: result.synced, failed: result.failed })
        );
        return;
      }
      Alert.alert(t('backup.completeTitle'), t('backup.completeMessage', { count: result.synced }));
    } finally {
      setBackingUp(false);
    }
  };

  if (showLanguage) {
    return (
      <ScreenContainer>
        <List.Item
          title={t('tabs.more')}
          left={(props) => <List.Icon {...props} icon="arrow-left" />}
          onPress={() => setShowLanguage(false)}
          style={{ paddingVertical: 4, marginBottom: 8 }}
        />
        <LanguageSettingsSection />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
        <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
          <AppLogo size={72} style={{ marginBottom: 8 }} />
          <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {APP_NAME}
          </Text>
          <Text variant="bodyLarge" style={{ marginTop: 4 }}>
            {user?.name}
          </Text>
          {user?.email ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {user.email}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: theme.roundness }}>
        <List.Section>
          <List.Item
            title={t('more.language')}
            left={(props) => <List.Icon {...props} icon="translate" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setShowLanguage(true)}
            style={{ paddingVertical: 4 }}
            titleStyle={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}
          />
          <Divider />
          {items.map((item, index) => (
            <React.Fragment key={item.screen}>
              {index > 0 ? <Divider /> : null}
              <List.Item
                title={t(item.titleKey)}
                left={(props) => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate(item.screen)}
                style={{ paddingVertical: 4 }}
                titleStyle={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}
              />
            </React.Fragment>
          ))}
        </List.Section>
      </Card>

      <Card mode="elevated" style={{ marginTop: 16, borderRadius: theme.roundness }}>
        <List.Item
          title={t('more.backupData')}
          description={
            pendingCount > 0
              ? t('more.backupPending', { count: pendingCount })
              : t('more.backupDesc')
          }
          left={(props) => <List.Icon {...props} icon="cloud-upload" color={theme.colors.primary} />}
          right={() =>
            backingUp ? <ActivityIndicator style={{ marginRight: 16 }} /> : null
          }
          onPress={handleBackup}
          disabled={backingUp}
          style={{ paddingVertical: 4 }}
          titleStyle={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}
          descriptionStyle={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}
        />
      </Card>

      <View style={{ marginTop: 24, marginBottom: 16 }}>
        <AppButton
          title={t('more.logout')}
          variant="danger"
          onPress={() => setLogoutVisible(true)}
          icon="logout"
        />
      </View>
      <ConfirmModal
        visible={logoutVisible}
        title={t('more.logoutConfirmTitle')}
        message={t('more.logoutConfirmMessage')}
        confirmLabel={t('more.logout')}
        onConfirm={handleLogout}
        onCancel={() => setLogoutVisible(false)}
        loading={loggingOut}
      />
    </ScreenContainer>
  );
}
