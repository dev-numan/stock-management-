import React from 'react';
import { View } from 'react-native';
import { Banner, Button, useTheme } from 'react-native-paper';
import { useNetworkStore } from '../../stores/networkStore';
import { useSyncStore } from '../../stores/syncStore';
import { processSyncQueue } from '../../services/syncService';

export default function OfflineBanner() {
  const theme = useTheme();
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
      ? `${pending} change(s) waiting to upload`
      : lastSyncError || 'Tap to retry sync'
    : 'Using saved data · sales will sync when online';

  return (
    <Banner
      visible
      icon={isOnline ? 'cloud-sync' : 'cloud-off-outline'}
      actions={
        isOnline && pending > 0
          ? [{ label: syncing ? 'Syncing…' : 'Sync now', onPress: handleSync, loading: syncing }]
          : []
      }
      style={{
        backgroundColor: isOnline ? theme.colors.secondaryContainer : theme.colors.surfaceVariant,
      }}
    >
      {`${isOnline ? 'Sync pending' : 'Offline mode'} · ${subtitle}`}
    </Banner>
  );
}
