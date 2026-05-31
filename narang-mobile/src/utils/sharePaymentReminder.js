import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { getSettings } from '../api/settings.api';
import { APP_NAME_URDU } from '../constants/branding';
import { buildPaymentReminderText } from './paymentReminder';
import { formatPhoneDisplay, toWhatsAppPhone } from './phone';
import { getFriendlyErrorMessage } from './apiErrors';

const loadShopSettings = async () => {
  try {
    const { data } = await getSettings();
    return data.data || {};
  } catch {
    return {};
  }
};

export const sendPaymentReminderSms = async ({ customerPhone, amountDue, shopSettings }) => {
  const phone = formatPhoneDisplay(customerPhone);
  if (!phone) {
    Alert.alert('No phone number', 'This customer has no phone number on file.');
    return;
  }

  const settings = shopSettings || (await loadShopSettings());
  const body = buildPaymentReminderText({
    amountDue,
    shopNameUrdu: APP_NAME_URDU,
    shopPhone: settings.phone,
  });

  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('SMS not available', 'Could not open the SMS app on this device.');
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

const shareWhatsAppAndroid = async (imageUri, waPhone) => {
  const contentUri = await FileSystem.getContentUriAsync(imageUri);
  await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
    type: 'image/png',
    packageName: 'com.whatsapp',
    extra: {
      'android.intent.extra.STREAM': contentUri,
      jid: `${waPhone}@s.whatsapp.net`,
    },
    flags: 1,
  });
};

export const sharePaymentReminderWhatsApp = async ({
  captureViewRef,
  customerPhone,
  amountDue,
  shopSettings,
}) => {
  const waPhone = toWhatsAppPhone(customerPhone);
  if (!waPhone) {
    Alert.alert('No phone number', 'This customer has no phone number on file.');
    return;
  }

  try {
    const settings = shopSettings || (await loadShopSettings());
    const text = buildPaymentReminderText({
      amountDue,
      shopNameUrdu: APP_NAME_URDU,
      shopPhone: settings.phone,
    });

    if (Platform.OS === 'android') {
      if (!captureViewRef?.current) {
        Alert.alert('Error', 'Could not prepare reminder image.');
        return;
      }
      const imageUri = await captureViewRef.current.capture();
      await shareWhatsAppAndroid(imageUri, waPhone);
      return;
    }

    // iOS (Expo Go): open WhatsApp directly to this customer with the Urdu reminder text.
    await openWhatsAppChat(waPhone, text);
  } catch (err) {
    Alert.alert('WhatsApp failed', getFriendlyErrorMessage(err, 'Could not open WhatsApp for this customer.'));
  }
};

export const getPaymentReminderShopSettings = loadShopSettings;
