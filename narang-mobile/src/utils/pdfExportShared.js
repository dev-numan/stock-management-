import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getInvoiceLogoDataUri } from './invoiceLogo';
import { getCachedSettings, useSettingsStore } from '../stores/settingsStore';
import { getT } from '../stores/languageStore';

const REPORTS_DIR = `${FileSystem.documentDirectory}reports/`;

export async function loadReportAssets() {
  let settings = getCachedSettings();
  if (useSettingsStore.getState().lastFetched) {
    settings = useSettingsStore.getState().settings;
  } else {
    try {
      settings = await useSettingsStore.getState().fetchSettings(true);
    } catch {
      // report still exports without address/phone
    }
  }

  let logoDataUri = null;
  try {
    logoDataUri = await getInvoiceLogoDataUri();
  } catch {
    // optional logo
  }

  return { settings, logoDataUri };
}

export async function saveReportPdf(tempUri, kind) {
  await FileSystem.makeDirectoryAsync(REPORTS_DIR, { intermediates: true });
  const filename = `HZM-${kind}-${Date.now()}.pdf`;
  const dest = `${REPORTS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export async function shareSavedPdf(savedUri, dialogTitle, t) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(savedUri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
  }

  const folderHint =
    Platform.OS === 'ios' ? t('reports.savedIos') : t('reports.savedAndroid');
  Alert.alert(t('reports.savedTitle'), `${folderHint}\n\n${t('reports.savedMessage')}`);
}

export async function exportHtmlToPdf({ html, kind, dialogTitle }) {
  const t = getT();
  const { uri: tempUri } = await Print.printToFileAsync({ html });
  const savedUri = await saveReportPdf(tempUri, kind);
  await shareSavedPdf(savedUri, dialogTitle, t);
  return savedUri;
}
