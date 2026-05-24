import React from 'react';
import { View, Text } from 'react-native';
import { APP_NAME_URDU } from '../../constants/branding';
import { formatReminderAmount, formatReminderDate } from '../../utils/paymentReminder';
import { formatPhoneDisplay } from '../../utils/phone';

export default function PaymentReminderCard({ amountDue, shopNameUrdu, shopPhone, date }) {
  const amount = formatReminderAmount(amountDue);
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
        پیمنٹ ریمائنڈر
      </Text>

      <Text
        style={{
          fontSize: 34,
          fontWeight: '800',
          color: '#DC2626',
          marginTop: 20,
          textAlign: 'center',
        }}
      >
        {amount}
      </Text>

      <Text style={{ fontSize: 15, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
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
          جناب،{'\n'}
          بیلنس {amount} آپ کے لیجر میں واجب الادا ہیں۔۔{'\n'}
          آپ کے تعاون کا شکریہ۔
        </Text>
      </View>
    </View>
  );
}
