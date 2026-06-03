import { Alert, Platform } from 'react-native';
import { getSettings } from '../api/settings.api';
import { APP_NAME_URDU } from '../constants/branding';
import { buildPaymentReminderText } from './paymentReminder';
import { toWhatsAppPhone } from './phone';
import {
  openSmsApp,
  openWhatsAppChat,
  shareImageToWhatsAppContact,
} from './openMessaging';
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
  if (!toWhatsAppPhone(customerPhone)) {
    Alert.alert(t('reminder.noPhoneTitle'), t('reminder.noPhoneMessage'));
    return;
  }

  const settings = shopSettings || (await loadShopSettings());
  const body = buildPaymentReminderText({
    advanceBalance,
    shopNameUrdu: APP_NAME_URDU,
    shopPhone: settings.phone,
  });

  try {
    await openSmsApp(customerPhone, body);
  } catch {
    Alert.alert(t('reminder.smsUnavailableTitle'), t('reminder.smsUnavailableMessage'));
  }
};

export const sharePaymentReminderWhatsApp = async ({
  captureViewRef,
  customerPhone,
  advanceBalance,
  shopSettings,
}) => {
  const t = getT();
  if (!toWhatsAppPhone(customerPhone)) {
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

    if (Platform.OS === 'android' && captureViewRef?.current) {
      try {
        const imageUri = await captureViewRef.current.capture();
        try {
          await shareImageToWhatsAppContact(imageUri, customerPhone, text);
          return;
        } catch {
          await openWhatsAppChat(customerPhone, text);
          return;
        }
      } catch {
        await openWhatsAppChat(customerPhone, text);
        return;
      }
    }

    await openWhatsAppChat(customerPhone, text);
  } catch (err) {
    Alert.alert(t('reminder.whatsappFailedTitle'), getWhatsAppErrorMessage(err));
  }
};

export const getPaymentReminderShopSettings = loadShopSettings;
