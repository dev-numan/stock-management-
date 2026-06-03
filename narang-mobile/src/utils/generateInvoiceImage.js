import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { getT } from '../stores/languageStore';
import { captureInvoiceUri } from './printInvoice';
import { shareImageToWhatsAppContact } from './openMessaging';
import { toWhatsAppPhone } from './phone';

/**
 * Capture the invoice/receipt and share it.
 *
 * When a customer phone is available on Android we try to open that contact's
 * WhatsApp chat directly with the image attached (Digi Khata style). If that
 * fails (no WhatsApp, blocked intent, unsupported version) we fall back to the
 * system share sheet so the user can still pick any app/contact.
 */
export const captureAndShareInvoiceImage = async (captureRef, invoiceNumber, options = {}) => {
  const t = getT();
  const { phone, text = '' } = options;
  const uri = await captureInvoiceUri(captureRef);

  if (Platform.OS === 'android' && toWhatsAppPhone(phone)) {
    try {
      await shareImageToWhatsAppContact(uri, phone, text, 'image/jpeg');
      return;
    } catch {
      // Fall through to the generic share sheet below.
    }
  }

  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing not available', t('invoice.shareUnavailable'));
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'image/jpeg',
    dialogTitle: `${t('invoice.invoiceLabel')} ${invoiceNumber}`,
    UTI: 'public.jpeg',
  });
};
