import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Modal, Portal, Text, Chip, RadioButton, Button, IconButton, Card, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PARTY_FILTERS, PARTY_SORTS } from '../../utils/partyListFilters';
import { PARTY_FILTER_LABEL_KEYS, PARTY_SORT_LABEL_KEYS } from '../../utils/filterLabelKeys';
import { useTranslation } from '../../i18n/useTranslation';

export default function PartyFilterSortModal({
  visible,
  filter,
  sort,
  titleKey = 'party.filterTitle',
  onClose,
  onApply,
}) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const insets = useSafeAreaInsets();
  const [draftFilter, setDraftFilter] = useState(filter);
  const [draftSort, setDraftSort] = useState(sort);

  useEffect(() => {
    if (visible) {
      setDraftFilter(filter);
      setDraftSort(sort);
    }
  }, [visible, filter, sort]);

  if (!visible) return null;

  const handleApply = () => {
    onApply({ filter: draftFilter, sort: draftSort });
    onClose();
  };

  return (
    <Portal>
      <Modal
        visible
        onDismiss={onClose}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        contentContainerStyle={{
          maxHeight: '88%',
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.roundness * 2,
          borderTopRightRadius: theme.roundness * 2,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          <Text variant="titleLarge" style={{ fontWeight: '700', marginLeft: 8, ...textDir }}>
            {t(titleKey)}
          </Text>
          <IconButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        >
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 10, ...textDir }}>
            {t('party.filterSection')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {PARTY_FILTERS.map((key) => {
              const selected = draftFilter === key;
              return (
                <Chip
                  key={key}
                  selected={selected}
                  onPress={() => setDraftFilter(key)}
                  mode={selected ? 'flat' : 'outlined'}
                  showSelectedOverlay
                  style={{
                    borderColor: selected ? theme.colors.primary : theme.colors.outline,
                  }}
                  textStyle={{
                    color: selected ? theme.colors.primary : theme.colors.onSurface,
                    ...textDir,
                  }}
                >
                  {t(PARTY_FILTER_LABEL_KEYS[key])}
                </Chip>
              );
            })}
          </View>

          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8, ...textDir }}>
            {t('party.sortTitle')}
          </Text>
          <Card mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
            <Card.Content style={{ paddingVertical: 4, paddingHorizontal: 0 }}>
              <RadioButton.Group onValueChange={setDraftSort} value={draftSort}>
                {PARTY_SORTS.map((key) => (
                  <RadioButton.Item
                    key={key}
                    label={t(PARTY_SORT_LABEL_KEYS[key])}
                    value={key}
                    position="leading"
                    color={theme.colors.primary}
                    labelStyle={{ ...textDir }}
                    style={{ paddingVertical: 2 }}
                  />
                ))}
              </RadioButton.Group>
            </Card.Content>
          </Card>
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Button mode="contained" onPress={handleApply} contentStyle={{ paddingVertical: 6 }}>
            {t('party.viewResults')}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
