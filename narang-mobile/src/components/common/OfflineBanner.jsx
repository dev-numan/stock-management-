import React from 'react';
import { Banner, Text, useTheme } from 'react-native-paper';
import { useNetworkStore } from '../../stores/networkStore';
import { useSyncStore } from '../../stores/syncStore';
import { processSyncQueue } from '../../services/syncService';
import { useTranslation } from '../../i18n/useTranslation';
import { countQueueStates } from '../../utils/syncQueueHelpers';

export default function OfflineBanner() {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const queue = useSyncStore((s) => s.queue);
  const syncing = useSyncStore((s) => s.syncing);
  const lastSyncError = useSyncStore((s) => s.lastSyncError);

  const { pending, blocked, total } = countQueueStates(queue);
  if (isOnline && total === 0 && !lastSyncError) return null;

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    await processSyncQueue({ retryBlocked: true });
  };

  let subtitle;
  if (!isOnline) {
    subtitle = t('sync.offlineSubtitle');
  } else if (blocked > 0 && pending > 0) {
    subtitle = t('sync.mixedSubtitle', { pending, blocked });
  } else if (blocked > 0) {
    subtitle = t('sync.blockedSubtitle', { count: blocked });
  } else if (pending > 0) {
    subtitle = t('sync.pendingSubtitle', { count: pending });
  } else if (lastSyncError === 'blocked') {
    subtitle = t('sync.blockedSubtitle', { count: blocked });
  } else {
    subtitle = String(lastSyncError || t('sync.retryHint'));
  }

  const title = isOnline ? t('sync.pendingTitle') : t('sync.offlineTitle');

  return (
    <Banner
      visible
      icon={isOnline ? 'cloud-sync' : 'cloud-off-outline'}
      actions={
        isOnline && total > 0
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
