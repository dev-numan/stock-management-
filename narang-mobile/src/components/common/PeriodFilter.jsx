import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  Card,
  Text,
  SegmentedButtons,
  IconButton,
  Chip,
  useTheme,
} from 'react-native-paper';
import { daysInMonth, shiftCalendarDay, getMonthName, getPeriodLabel } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';
import ActiveFilterChips from './ActiveFilterChips';

export default function PeriodFilter({
  mode,
  year,
  month,
  day = 1,
  onModeChange,
  onYearChange,
  onMonthChange,
  onDayChange,
  summaryText,
  modes = ['all', 'day', 'month', 'year'],
  showMonthPicker = true,
  title,
  compact = false,
  defaultMode = 'all',
  showActiveChips = true,
}) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const allModes = useMemo(
    () => [
      { value: 'all', label: t('period.all') },
      { value: 'day', label: t('period.day') },
      { value: 'month', label: t('period.month') },
      { value: 'year', label: t('period.year') },
    ],
    [t]
  );
  const visibleModes = allModes.filter((m) => modes.includes(m.value));
  const resolvedTitle = title === undefined ? t('period.filterTitle') : title;

  const clampDay = (y, m, d) => Math.min(d, daysInMonth(y, m));

  const handleMonthChange = (m) => {
    onMonthChange(m);
    if (onDayChange) onDayChange(clampDay(year, m, day));
  };

  const handleYearChange = (y) => {
    onYearChange(y);
    if (onDayChange) onDayChange(clampDay(y, month, day));
  };

  const shiftDay = (delta) => {
    if (!onDayChange) return;
    const next = shiftCalendarDay(year, month, day, delta);
    onYearChange(next.year);
    onMonthChange(next.month);
    onDayChange(next.day);
  };

  const resetPeriodToDefault = () => {
    const now = new Date();
    onModeChange(defaultMode);
    onYearChange(now.getFullYear());
    onMonthChange(now.getMonth() + 1);
    if (onDayChange) onDayChange(now.getDate());
  };

  const periodActive = mode !== defaultMode;
  const periodTags =
    showActiveChips && periodActive
      ? [
          {
            id: 'period',
            label: getPeriodLabel(mode, year, month, day),
            onRemove: resetPeriodToDefault,
          },
        ]
      : [];

  const content = (
    <>
      {resolvedTitle ? (
        <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.onSurface, ...textDir }}>
          {resolvedTitle}
        </Text>
      ) : null}
      <SegmentedButtons
        value={mode}
        onValueChange={onModeChange}
        buttons={visibleModes}
        style={{ marginBottom: 12 }}
      />
      {mode !== 'all' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <IconButton icon="chevron-left" mode="contained-tonal" onPress={() => handleYearChange(year - 1)} />
          <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700', ...textDir }}>
            {year}
          </Text>
          <IconButton icon="chevron-right" mode="contained-tonal" onPress={() => handleYearChange(year + 1)} />
        </View>
      ) : null}
      {(mode === 'month' || mode === 'day') && showMonthPicker ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {Array.from({ length: 12 }, (_, index) => {
            const m = index + 1;
            const selected = month === m;
            const name = getMonthName(index);
            return (
              <Chip
                key={name}
                selected={selected}
                onPress={() => handleMonthChange(m)}
                mode={selected ? 'flat' : 'outlined'}
                showSelectedOverlay
                style={{ marginBottom: 4 }}
              >
                {name}
              </Chip>
            );
          })}
        </View>
      ) : null}
      {mode === 'day' && onDayChange ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <IconButton icon="chevron-left" mode="contained-tonal" onPress={() => shiftDay(-1)} />
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700', ...textDir }}>
            {day} {getMonthName(month - 1)}
          </Text>
          <IconButton icon="chevron-right" mode="contained-tonal" onPress={() => shiftDay(1)} />
        </View>
      ) : null}
      <ActiveFilterChips tags={periodTags} />
      {summaryText ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', ...textDir }}>
          {summaryText}
        </Text>
      ) : null}
    </>
  );

  if (compact) {
    return <View>{content}</View>;
  }

  return (
    <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
      <Card.Content>{content}</Card.Content>
    </Card>
  );
}
