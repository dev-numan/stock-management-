import React from 'react';
import { Banner, Text, useTheme } from 'react-native-paper';
import { useNetworkStore } from '../../stores/networkStore';
import { useSyncStore } from '../../stores/syncStore';
import { processSyncQueue } from '../../services/syncService';
import { useTranslation } from '../../i18n/useTranslation';

export default function OfflineBanner() {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const queue = useSyncStore((s) => s.queue);
  const syncing = useSyncStore((s) => s.syncing);
  const lastSyncError = useSyncStore((s) => s.lastSyncError);

  const pending = queue.length;
  if (isOnline && pending === 0 && !lastSyncError) return null;

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    await processSyncQueue();
  };

  const subtitle = isOnline
    ? pending
      ? t('sync.pendingSubtitle', { count: pending })
      : String(lastSyncError || t('sync.retryHint'))
    : t('sync.offlineSubtitle');

  const title = isOnline ? t('sync.pendingTitle') : t('sync.offlineTitle');

  return (
    <Banner
      visible
      icon={isOnline ? 'cloud-sync' : 'cloud-off-outline'}
      actions={
        isOnline && pending > 0
          ? [{ label: syncing ? t('sync.syncing') : t('sync.syncNow'), onPress: handleSync, loading: syncing }]
          : []
      }
      style={{
        backgroundColor: isOnline ? theme.colors.secondaryContainer : theme.colors.surfaceVariant,
      }}
    >
      <Text style={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}>
        {title} · {subtitle}
      </Text>
    </Banner>
  );
}
