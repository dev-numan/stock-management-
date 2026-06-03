import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import WhatsappShare from '../../modules/whatsapp-share/src/WhatsappShareModule';
import {
  formatPhoneDisplay,
  toInternationalPhoneDigits,
  toWhatsAppPhone,
} from './phone';

const WHATSAPP_PACKAGES = ['com.whatsapp', 'com.whatsapp.w4b'];

export function buildWhatsAppDeepLink(phone, text = '') {
  const wa = toWhatsAppPhone(phone);
  if (!wa) return null;
  const q = text ? `&text=${encodeURIComponent(text)}` : '';
  return `whatsapp://send?phone=${wa}${q}`;
}

export function buildWhatsAppWebLink(phone, text = '') {
  const wa = toWhatsAppPhone(phone);
  if (!wa) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${wa}${q}`;
}

/** Open SMS app with body; targets customer number on Android. */
export async function openSmsApp(phone, body) {
  const intl = toInternationalPhoneDigits(phone);
  if (!intl) throw new Error('NO_PHONE');

  const encodedBody = encodeURIComponent(body || '');
  const urls =
    Platform.OS === 'android'
      ? [
          `smsto:+${intl}?body=${encodedBody}`,
          `smsto:${intl}?body=${encodedBody}`,
          `sms:+${intl}?body=${encodedBody}`,
        ]
      : [`sms:${formatPhoneDisplay(phone)}&body=${encodedBody}`];

  let lastError;
  for (const url of urls) {
    try {
      if (Platform.OS === 'ios') {
        const can = await Linking.canOpenURL(url);
        if (!can) continue;
      }
      await Linking.openURL(url);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('SMS_UNAVAILABLE');
}

/** Open WhatsApp chat for a specific phone number (text pre-filled). */
export async function openWhatsAppChat(phone, text = '') {
  const urls = [buildWhatsAppDeepLink(phone, text), buildWhatsAppWebLink(phone, text)].filter(
    Boolean
  );

  let lastError;
  for (const url of urls) {
    try {
      if (Platform.OS === 'ios') {
        const can = await Linking.canOpenURL(url);
        if (!can) continue;
      }
      await Linking.openURL(url);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('WHATSAPP_UNAVAILABLE');
}

/**
 * Open a specific WhatsApp contact's chat with an image attached (Android only).
 *
 * Uses the native WhatsappShare module, which builds an ACTION_SEND intent with
 * EXTRA_STREAM as a real Uri Parcelable + the contact's jid + setPackage. This is
 * the part expo-intent-launcher cannot do (it passes EXTRA_STREAM as a plain
 * String, which WhatsApp ignores, so the image never attaches).
 */
export async function shareImageToWhatsAppContact(imageUri, phone, text = '', mimeType = 'image/png') {
  const waPhone = toWhatsAppPhone(phone);
  if (!waPhone) throw new Error('NO_PHONE');
  if (Platform.OS !== 'android' || !WhatsappShare) {
    throw new Error('WHATSAPP_IMAGE_UNAVAILABLE');
  }

  const contentUri = await FileSystem.getContentUriAsync(imageUri);
  const jid = `${waPhone}@s.whatsapp.net`;
  let lastError;

  for (const packageName of WHATSAPP_PACKAGES) {
    try {
      await WhatsappShare.shareImageToContact(contentUri, jid, text, packageName, mimeType);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('WHATSAPP_IMAGE_UNAVAILABLE');
}
