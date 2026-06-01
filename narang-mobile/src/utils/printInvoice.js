import { Alert, Platform, InteractionManager } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getT } from '../stores/languageStore';

function getSunmiModule() {
  if (Platform.OS !== 'android') return null;
  try {
    return require('sunmi-printer-expo');
  } catch {
    return null;
  }
}

/** Wait for off-screen receipt ViewShot to finish layout before capture. */
function waitForReceiptLayout() {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  });
}

export async function captureInvoiceUri(captureRef) {
  if (!captureRef?.current?.capture) {
    throw new Error(getT()('invoice.imageFailed'));
  }
  await waitForReceiptLayout();
  return captureRef.current.capture();
}

async function printViaSunmiImage(imageUri) {
  const sunmi = getSunmiModule();
  if (!sunmi || !imageUri) return false;

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await sunmi.printImageBase64(base64);
  await sunmi.lineWrap(2);
  if (sunmi.cutPaper) {
    await sunmi.cutPaper();
  }
  return true;
}

async function ensureSunmiPrinter() {
  const t = getT();
  if (Platform.OS !== 'android') {
    Alert.alert(t('invoice.printFailedTitle'), t('invoice.printerNotAvailable'));
    throw new Error('printer-not-available');
  }
  const sunmi = getSunmiModule();
  if (!sunmi) {
    Alert.alert(t('invoice.printFailedTitle'), t('invoice.printerNotAvailable'));
    throw new Error('printer-not-available');
  }
  let ready = false;
  try {
    ready = await sunmi.initPrinter();
  } catch {
    ready = false;
  }
  if (!ready) {
    Alert.alert(t('invoice.printFailedTitle'), t('invoice.printerNotAvailable'));
    throw new Error('printer-not-available');
  }
  return sunmi;
}

/** Print English receipt bitmap on Sunmi built-in thermal printer. */
export async function printInvoice({ englishCaptureRef }) {
  const t = getT();
  await ensureSunmiPrinter();

  let imageUri;
  try {
    imageUri = await captureInvoiceUri(englishCaptureRef);
  } catch {
    Alert.alert(t('invoice.printFailedTitle'), t('invoice.printFailedMessage'));
    throw new Error('capture-failed');
  }

  try {
    const ok = await printViaSunmiImage(imageUri);
    if (ok) return { method: 'sunmi-english' };
  } catch (err) {
    console.warn('Sunmi English print failed:', err?.message);
  }

  Alert.alert(t('invoice.printFailedTitle'), t('invoice.printFailedMessage'));
  throw new Error('sunmi-english-print-failed');
}

/** Print Urdu receipt bitmap on Sunmi built-in thermal printer. */
export async function printInvoiceUrdu({ urduCaptureRef }) {
  const t = getT();
  await ensureSunmiPrinter();

  let imageUri;
  try {
    imageUri = await captureInvoiceUri(urduCaptureRef);
  } catch {
    Alert.alert(t('invoice.printFailedTitle'), t('invoice.printUrduFailedMessage'));
    throw new Error('capture-failed');
  }

  try {
    const ok = await printViaSunmiImage(imageUri);
    if (ok) return { method: 'sunmi-urdu' };
  } catch (err) {
    console.warn('Sunmi Urdu print failed:', err?.message);
  }

  Alert.alert(t('invoice.printFailedTitle'), t('invoice.printUrduFailedMessage'));
  throw new Error('sunmi-urdu-print-failed');
}

export async function isSunmiPrinterAvailable() {
  if (Platform.OS !== 'android' || !getSunmiModule()) return false;
  try {
    return await getSunmiModule().initPrinter();
  } catch {
    return false;
  }
}
