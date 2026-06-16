import { Alert } from 'react-native';
import { buildProductListHTML } from '../components/reports/ProductListPDFTemplate';
import {
  buildCustomerLedgerHTML,
  buildSupplierLedgerHTML,
} from '../components/reports/PartyLedgerPDFTemplate';
import { loadReportAssets, exportHtmlToPdf } from './pdfExportShared';
import { getT, getLocale } from '../stores/languageStore';

export const exportProductListPdf = async (products) => {
  const t = getT();
  const locale = getLocale();

  if (!products?.length) {
    Alert.alert(t('partyReport.export'), t('productReport.empty'));
    return null;
  }

  const { settings, logoDataUri } = await loadReportAssets();
  const html = buildProductListHTML({ products, settings, logoDataUri, locale, t });
  return exportHtmlToPdf({
    html,
    kind: 'stock',
    dialogTitle: t('productReport.title'),
  });
};

export const exportCustomerLedgerPdf = async ({
  customer,
  sales = [],
  accountHistory = [],
  periodLabel = '',
}) => {
  const t = getT();
  const locale = getLocale();

  if (!customer) {
    Alert.alert(t('partyReport.export'), t('ledgerReport.empty'));
    return null;
  }

  const { settings, logoDataUri } = await loadReportAssets();
  const html = buildCustomerLedgerHTML({
    customer,
    sales,
    accountHistory,
    periodLabel,
    settings,
    logoDataUri,
    locale,
    t,
  });

  return exportHtmlToPdf({
    html,
    kind: 'customer-ledger',
    dialogTitle: t('ledgerReport.customerTitle'),
  });
};

export const exportSupplierLedgerPdf = async ({ supplier, ledger = [] }) => {
  const t = getT();
  const locale = getLocale();

  if (!supplier) {
    Alert.alert(t('partyReport.export'), t('ledgerReport.empty'));
    return null;
  }

  const { settings, logoDataUri } = await loadReportAssets();
  const html = buildSupplierLedgerHTML({
    supplier,
    ledger,
    settings,
    logoDataUri,
    locale,
    t,
  });

  return exportHtmlToPdf({
    html,
    kind: 'supplier-ledger',
    dialogTitle: t('ledgerReport.supplierTitle'),
  });
};
