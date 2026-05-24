import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildInvoiceHTML } from '../components/invoice/InvoiceTemplate';
import { getInvoiceLogoDataUri } from './invoiceLogo';

export const generateAndShareInvoice = async (sale, settings) => {
  let logoDataUri = null;
  try {
    logoDataUri = await getInvoiceLogoDataUri();
  } catch {
    // PDF still works without the logo
  }
  const html = buildInvoiceHTML(sale, settings, logoDataUri);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Invoice ${sale.invoiceNumber}`,
  });
};
