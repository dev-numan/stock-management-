import React from 'react';
import { View, Text } from 'react-native';
import { APP_NAME_URDU } from '../../constants/branding';
import {
  formatReminderAmount,
  formatReminderDate,
  getReminderBalanceType,
  getReminderDisplayAmount,
} from '../../utils/paymentReminder';
import { formatPhoneDisplay } from '../../utils/phone';

const CARD_COPY = {
  owes: {
    title: 'پیمنٹ ریمائنڈر',
    amountColor: '#DC2626',
    body: (amount) =>
      `جناب،\nبیلنس ${amount} آپ کے لیجر میں واجب الادا ہے۔\nبراہِ کرم جلد از جلد ادائیگی کر دیں۔\nآپ کے تعاون کا شکریہ۔`,
  },
  prepaid: {
    title: 'اکاؤنٹ بیلنس',
    amountColor: '#2E7D32',
    body: (amount) =>
      `جناب،\nبیلنس ${amount} آپ کے لیجر میں جمع (ایڈوانس) ہے۔\nیہ رقم آپ کی اگلی خریداری پر استعمال ہو سکتی ہے۔\nآپ کے اعتماد کا شکریہ۔`,
  },
  zero: {
    title: 'اکاؤنٹ سٹیٹمنٹ',
    amountColor: '#6B7280',
    body: () =>
      `جناب،\nآپ کا لیجر بیلنس فی الحال صفر ہے۔\nآپ کے تعاون کا شکریہ۔`,
  },
};

export default function PaymentReminderCard({ advanceBalance, shopNameUrdu, shopPhone, date }) {
  const type = getReminderBalanceType(advanceBalance);
  const copy = CARD_COPY[type];
  const amount = formatReminderAmount(getReminderDisplayAmount(advanceBalance));
  const shop = shopNameUrdu || APP_NAME_URDU;
  const phone = shopPhone ? formatPhoneDisplay(shopPhone) : '';
  const displayDate = formatReminderDate(date);

  return (
    <View
      style={{
        width: 340,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 36,
        paddingHorizontal: 28,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: '#111827',
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
      >
        {copy.title}
      </Text>

      {type !== 'zero' ? (
        <Text
          style={{
            fontSize: 34,
            fontWeight: '800',
            color: copy.amountColor,
            marginTop: 20,
            textAlign: 'center',
          }}
        >
          {amount}
        </Text>
      ) : null}

      <Text style={{ fontSize: 15, color: '#6B7280', marginTop: type === 'zero' ? 20 : 8, textAlign: 'center' }}>
        {displayDate}
      </Text>

      <View style={{ marginTop: 28, width: '100%', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {shop}
        </Text>
        {phone ? (
          <Text style={{ fontSize: 15, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
            {phone}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: 28, width: '100%' }}>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 28,
            color: '#374151',
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {copy.body(amount)}
        </Text>
      </View>
    </View>
  );
}
