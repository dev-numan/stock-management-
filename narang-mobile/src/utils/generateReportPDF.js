import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { buildReportHTML } from '../components/reports/ReportPDFTemplate';
import { getInvoiceLogoDataUri } from './invoiceLogo';
import { getSettings } from '../api/settings.api';

const REPORTS_DIR = `${FileSystem.documentDirectory}reports/`;

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'report';

export const saveReportPdf = async (tempUri, periodLabel) => {
  await FileSystem.makeDirectoryAsync(REPORTS_DIR, { intermediates: true });
  const filename = `HZM-report-${slugify(periodLabel)}-${Date.now()}.pdf`;
  const dest = `${REPORTS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
};

export const exportReportPdf = async ({ summary, profitLoss, stock, periodLabel }) => {
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

  const html = buildReportHTML({
    periodLabel,
    summary,
    profitLoss,
    stock,
    settings,
    logoDataUri,
  });

  const { uri: tempUri } = await Print.printToFileAsync({ html });
  const savedUri = await saveReportPdf(tempUri, periodLabel);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(savedUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Report — ${periodLabel}`,
      UTI: 'com.adobe.pdf',
    });
  }

  const folderHint =
    Platform.OS === 'ios'
      ? 'Saved in the app Documents/reports folder.'
      : 'Saved in app storage under reports/.';

  Alert.alert('Report saved', `${folderHint}\n\nYou can also share or save to Files from the share sheet.`);

  return savedUri;
};
