import { format } from 'date-fns';
import { APP_NAME_URDU } from '../constants/branding';

export const formatReminderAmount = (amount) => {
  const num = Math.abs(Number(amount ?? 0));
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `Rs ${formatted}`;
};

export const buildPaymentReminderText = ({ amountDue, shopNameUrdu, shopPhone }) => {
  const amount = formatReminderAmount(amountDue);
  const shop = shopNameUrdu || APP_NAME_URDU;
  const phone = shopPhone?.trim() || '';

  return [
    'پیمنٹ ریمائنڈر',
    '',
    shop,
    phone,
    '',
    'جناب،',
    `بیلنس ${amount} آپ کے لیجر میں واجب الادا ہیں۔۔`,
    'آپ کے تعاون کا شکریہ۔',
  ]
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n');
};

export const formatReminderDate = (date = new Date()) => format(date, 'd MMM yyyy');
