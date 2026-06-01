import { format } from 'date-fns';
import { APP_NAME, APP_NAME_URDU } from '../constants/branding';
import { getLocale } from '../stores/languageStore';

export const formatReminderAmount = (amount) => {
  const num = Math.abs(Number(amount ?? 0));
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `Rs ${formatted}`;
};

/** @returns {'owes' | 'prepaid' | 'zero'} */
export const getReminderBalanceType = (advanceBalance) => {
  const bal = Number(advanceBalance ?? 0);
  if (bal < 0) return 'owes';
  if (bal > 0) return 'prepaid';
  return 'zero';
};

export const getReminderDisplayAmount = (advanceBalance) => {
  const bal = Number(advanceBalance ?? 0);
  return Math.abs(bal);
};

const buildUrduReminder = (type, amount) => {
  if (type === 'owes') {
    return {
      title: 'پیمنٹ ریمائنڈر',
      bodyLines: [
        'جناب،',
        `بیلنس ${amount} آپ کے لیجر میں واجب الادا ہے۔`,
        'براہِ کرم جلد از جلد ادائیگی کر دیں۔',
        'آپ کے تعاون کا شکریہ۔',
      ],
    };
  }
  if (type === 'prepaid') {
    return {
      title: 'اکاؤنٹ بیلنس',
      bodyLines: [
        'جناب،',
        `بیلنس ${amount} آپ کے لیجر میں جمع (ایڈوانس) ہے۔`,
        'یہ رقم آپ کی اگلی خریداری پر استعمال ہو سکتی ہے۔',
        'آپ کے اعتماد کا شکریہ۔',
      ],
    };
  }
  return {
    title: 'اکاؤنٹ سٹیٹمنٹ',
    bodyLines: [
      'جناب،',
      'آپ کا لیجر بیلنس فی الحال صفر ہے۔',
      'آپ کے تعاون کا شکریہ۔',
    ],
  };
};

const buildEnglishReminder = (type, amount) => {
  if (type === 'owes') {
    return {
      title: 'Payment reminder',
      bodyLines: [
        'Dear customer,',
        `Your ledger balance of ${amount} is due.`,
        'Please pay at your earliest convenience.',
        'Thank you for your cooperation.',
      ],
    };
  }
  if (type === 'prepaid') {
    return {
      title: 'Account balance',
      bodyLines: [
        'Dear customer,',
        `Your ledger shows a prepaid balance of ${amount}.`,
        'This amount can be used on your next purchase.',
        'Thank you for your trust.',
      ],
    };
  }
  return {
    title: 'Account statement',
    bodyLines: [
      'Dear customer,',
      'Your ledger balance is currently zero.',
      'Thank you for your cooperation.',
    ],
  };
};

export const buildPaymentReminderText = ({ advanceBalance, shopNameUrdu, shopPhone }) => {
  const type = getReminderBalanceType(advanceBalance);
  const amount = formatReminderAmount(getReminderDisplayAmount(advanceBalance));
  const locale = getLocale();
  const shop =
    locale === 'ur'
      ? shopNameUrdu || APP_NAME_URDU
      : APP_NAME;
  const phone = shopPhone?.trim() || '';

  const { title, bodyLines } =
    locale === 'ur' ? buildUrduReminder(type, amount) : buildEnglishReminder(type, amount);

  return [title, '', shop, phone, '', ...bodyLines]
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n');
};

export const formatReminderDate = (date = new Date()) => format(date, 'd MMM yyyy');
