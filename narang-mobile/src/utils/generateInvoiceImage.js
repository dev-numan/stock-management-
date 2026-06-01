import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { getT } from '../stores/languageStore';
import { captureInvoiceUri } from './printInvoice';

export const captureAndShareInvoiceImage = async (captureRef, invoiceNumber) => {
  const t = getT();
  const uri = await captureInvoiceUri(captureRef);

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
