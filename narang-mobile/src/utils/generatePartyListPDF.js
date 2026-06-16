import { Alert } from 'react-native';
import {
  buildCombinedPartyListHTML,
  buildPartyListHTML,
} from '../components/reports/PartyListPDFTemplate';
import { loadReportAssets, exportHtmlToPdf } from './pdfExportShared';
import { getT, getLocale } from '../stores/languageStore';

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

  const title =
    kind === 'customer' ? t('partyReport.customerTitle') : t('partyReport.supplierTitle');

  return exportHtmlToPdf({ html, kind, dialogTitle: title });
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

  return exportHtmlToPdf({
    html,
    kind: 'parties',
    dialogTitle: t('partyReport.combinedTitle'),
  });
};
