import React from 'react';
import { View } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * @param {{ id: string, label: string, onRemove: () => void }[]} tags
 * @param {() => void} [onClearAll]
 */
export default function ActiveFilterChips({ tags = [], onClearAll, style }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  if (!tags.length) return null;

  return (
    <View style={[{ marginBottom: 8 }, style]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            mode="flat"
            closeIcon="close"
            onClose={tag.onRemove}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            textStyle={{ color: theme.colors.onPrimaryContainer, ...textDir }}
          >
            {tag.label}
          </Chip>
        ))}
        {onClearAll && tags.length > 1 ? (
          <Chip
            compact
            icon="filter-remove-outline"
            onPress={onClearAll}
            mode="outlined"
            textStyle={textDir}
          >
            {t('filters.clearAll')}
          </Chip>
        ) : null}
      </View>
    </View>
  );
}
