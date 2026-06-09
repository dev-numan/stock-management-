import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  buildCombinedPartyListHTML,
  buildPartyListHTML,
} from '../components/reports/PartyListPDFTemplate';
import { getInvoiceLogoDataUri } from './invoiceLogo';
import { getSettings } from '../api/settings.api';
import { getT, getLocale } from '../stores/languageStore';

const REPORTS_DIR = `${FileSystem.documentDirectory}reports/`;

const saveListPdf = async (tempUri, kind) => {
  await FileSystem.makeDirectoryAsync(REPORTS_DIR, { intermediates: true });
  const filename = `HZM-${kind}-list-${Date.now()}.pdf`;
  const dest = `${REPORTS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
};

async function loadReportAssets() {
  let settings = null;
  try {
    const { data } = await getSettings();
    settings = data.data;
  } catch {
    // report still exports without address/phone
  }

  let logoDataUri = null;
  try {
    logoDataUri = await getInvoiceLogoDataUri();
  } catch {
    // optional logo
  }

  return { settings, logoDataUri };
}

async function shareSavedPdf(savedUri, dialogTitle, t) {
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

/**
 * Export a Digi-Khata-style customer or supplier list as a shareable PDF.
 * @param {{ kind: 'customer'|'supplier', parties: object[] }} args
 */
export const exportPartyListPdf = async ({ kind, parties }) => {
  const t = getT();
  const locale = getLocale();

  if (!parties || parties.length === 0) {
    Alert.alert(t('partyReport.export'), t('partyReport.empty'));
    return null;
  }

  const { settings, logoDataUri } = await loadReportAssets();
  const html = buildPartyListHTML({ kind, parties, settings, logoDataUri, locale, t });

  const { uri: tempUri } = await Print.printToFileAsync({ html });
  const savedUri = await saveListPdf(tempUri, kind);

  const title =
    kind === 'customer' ? t('partyReport.customerTitle') : t('partyReport.supplierTitle');
  await shareSavedPdf(savedUri, title, t);

  return savedUri;
};

/**
 * Export combined customer + supplier list (Parties screen).
 * @param {{ customers: object[], suppliers: object[] }} args
 */
export const exportCombinedPartyListPdf = async ({ customers = [], suppliers = [] }) => {
  const t = getT();
  const locale = getLocale();

  if (customers.length === 0 && suppliers.length === 0) {
    Alert.alert(t('partyReport.export'), t('partyReport.empty'));
    return null;
  }

  const { settings, logoDataUri } = await loadReportAssets();
  const html = buildCombinedPartyListHTML({
    customers,
    suppliers,
    settings,
    logoDataUri,
    locale,
    t,
  });

  const { uri: tempUri } = await Print.printToFileAsync({ html });
  const savedUri = await saveListPdf(tempUri, 'parties');
  await shareSavedPdf(savedUri, t('partyReport.combinedTitle'), t);

  return savedUri;
};
