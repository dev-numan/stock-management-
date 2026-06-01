import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { getSettings } from '../api/settings.api';
import { APP_NAME_URDU } from '../constants/branding';
import { buildPaymentReminderText } from './paymentReminder';
import { formatPhoneDisplay, toWhatsAppPhone } from './phone';
import { isTechnicalMessage } from './apiErrors';
import { getT } from '../stores/languageStore';

function getWhatsAppErrorMessage(err) {
  const t = getT();
  if (err?.response) {
    return t('reminder.whatsappFailedMessage');
  }
  const msg = typeof err?.message === 'string' ? err.message.trim() : '';
  if (msg && !isTechnicalMessage(msg)) {
    return msg;
  }
  return t('reminder.whatsappFailedMessage');
}

const loadShopSettings = async () => {
  try {
    const { data } = await getSettings();
    return data.data || {};
  } catch {
    return {};
  }
};

export const sendPaymentReminderSms = async ({ customerPhone, advanceBalance, shopSettings }) => {
  const t = getT();
  const phone = formatPhoneDisplay(customerPhone);
  if (!phone) {
    Alert.alert(t('reminder.noPhoneTitle'), t('reminder.noPhoneMessage'));
    return;
  }

  const settings = shopSettings || (await loadShopSettings());
  const body = buildPaymentReminderText({
    advanceBalance,
    shopNameUrdu: APP_NAME_URDU,
    shopPhone: settings.phone,
  });

  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert(t('reminder.smsUnavailableTitle'), t('reminder.smsUnavailableMessage'));
    return;
  }
  await Linking.openURL(url);
};

const openWhatsAppChat = async (waPhone, text) => {
  const url = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(text)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return;
  }
  const webUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
  await Linking.openURL(webUrl);
};

const shareWhatsAppAndroid = async (imageUri, waPhone, text) => {
  const contentUri = await FileSystem.getContentUriAsync(imageUri);
  await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
    type: 'image/png',
    packageName: 'com.whatsapp',
    extra: {
      'android.intent.extra.STREAM': contentUri,
      'android.intent.extra.TEXT': text,
      jid: `${waPhone}@s.whatsapp.net`,
    },
    flags: 1,
  });
};

export const sharePaymentReminderWhatsApp = async ({
  captureViewRef,
  customerPhone,
  advanceBalance,
  shopSettings,
}) => {
  const t = getT();
  const waPhone = toWhatsAppPhone(customerPhone);
  if (!waPhone) {
    Alert.alert(t('reminder.noPhoneTitle'), t('reminder.noPhoneMessage'));
    return;
  }

  try {
    const settings = shopSettings || (await loadShopSettings());
    const text = buildPaymentReminderText({
      advanceBalance,
      shopNameUrdu: APP_NAME_URDU,
      shopPhone: settings.phone,
    });

    if (Platform.OS === 'android') {
      if (!captureViewRef?.current) {
        Alert.alert('Error', t('reminder.imageFailed'));
        return;
      }
      const imageUri = await captureViewRef.current.capture();
      try {
        await shareWhatsAppAndroid(imageUri, waPhone, text);
      } catch {
        await openWhatsAppChat(waPhone, text);
      }
      return;
    }

    await openWhatsAppChat(waPhone, text);
  } catch (err) {
    Alert.alert(t('reminder.whatsappFailedTitle'), getWhatsAppErrorMessage(err));
  }
};

export const getPaymentReminderShopSettings = loadShopSettings;
