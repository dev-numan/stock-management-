import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Card, Text, List, Portal, Dialog, RadioButton, Button, useTheme } from 'react-native-paper';
import { LOCALE_LABELS, LOCALES, translate } from '../../i18n/translations';
import { useLanguageStore } from '../../stores/languageStore';

export default function LanguageSettingsSection() {
  const theme = useTheme();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const t = useLanguageStore((s) => s.t);
  const isRtl = locale === 'ur';

  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(locale);

  const openPicker = () => {
    setDraft(locale);
    setVisible(true);
  };

  const handleConfirm = () => {
    setLocale(draft);
    setVisible(false);
    Alert.alert(
      translate(draft, 'language.savedTitle'),
      translate(draft, 'language.savedMessage')
    );
  };

  return (
    <>
      <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
        <Card.Content>
          <Text
            variant="titleLarge"
            style={{ fontWeight: '700', marginBottom: 4, writingDirection: isRtl ? 'rtl' : 'ltr' }}
          >
            {t('language.title')}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, writingDirection: isRtl ? 'rtl' : 'ltr' }}
          >
            {t('language.subtitle')}
          </Text>
          <List.Item
            title={t('language.current')}
            description={LOCALE_LABELS[locale]}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={openPicker}
            style={{ paddingHorizontal: 0 }}
            titleStyle={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}
            descriptionStyle={{ fontWeight: '600' }}
          />
          <Button mode="outlined" onPress={openPicker} style={{ marginTop: 4 }}>
            {t('language.change')}
          </Button>
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ borderRadius: 12 }}>
          <Dialog.Title style={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}>
            {t('language.selectTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodyMedium"
              style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant, writingDirection: isRtl ? 'rtl' : 'ltr' }}
            >
              {t('language.selectHint')}
            </Text>
            <RadioButton.Group onValueChange={setDraft} value={draft}>
              {LOCALES.map((code) => (
                <View key={code}>
                  <RadioButton.Item
                    label={LOCALE_LABELS[code]}
                    value={code}
                    position="leading"
                    labelStyle={{ writingDirection: code === 'ur' ? 'rtl' : 'ltr' }}
                  />
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>{t('language.cancel')}</Button>
            <Button mode="contained" onPress={handleConfirm}>
              {t('language.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
