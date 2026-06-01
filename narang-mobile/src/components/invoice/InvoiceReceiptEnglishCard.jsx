import React from 'react';
import { View, Text } from 'react-native';
import AppLogo from '../common/AppLogo';
import { SHOP_NAME } from '../../constants/branding';
import { translate } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { formatPhoneDisplay } from '../../utils/phone';
import {
  THERMAL_RECEIPT_WIDTH,
  RECEIPT_GREEN,
  RECEIPT_MUTED,
  RECEIPT_BORDER,
  formatReceiptNum,
  getLineDiscount,
  tableRow,
} from './thermalReceiptShared';

const te = (key, params) => translate('en', key, params);

/** LTR columns: Product | Price | Qty | Disc | Amount */
const COLS = [
  { key: 'product', flex: 1.35, header: 'invoice.col.product', align: 'left' },
  { key: 'price', flex: 0.72, header: 'invoice.col.price', align: 'center' },
  { key: 'qty', flex: 0.42, header: 'invoice.col.qty', align: 'center' },
  { key: 'discount', flex: 0.58, header: 'invoice.col.discountShort', align: 'center' },
  { key: 'amount', flex: 0.82, header: 'invoice.col.amount', align: 'right' },
];

function TableHeader() {
  return (
    <View
      style={{
        ...tableRow,
        backgroundColor: RECEIPT_GREEN,
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
      }}
    >
      {COLS.map((col) => (
        <Text
          key={col.key}
          style={{
            flex: col.flex,
            fontSize: 9,
            fontWeight: '700',
            color: '#fff',
            textAlign: col.align,
          }}
          numberOfLines={1}
        >
          {te(col.header)}
        </Text>
      ))}
    </View>
  );
}

function TableRow({ item }) {
  const lineDisc = getLineDiscount(item);
  const cells = [
    { flex: COLS[0].flex, text: item.product?.name || '—', align: 'left', bold: true },
    { flex: COLS[1].flex, text: formatReceiptNum(item.unitPrice), align: 'center' },
    { flex: COLS[2].flex, text: String(Number(item.quantity)), align: 'center' },
    { flex: COLS[3].flex, text: formatReceiptNum(lineDisc), align: 'center' },
    { flex: COLS[4].flex, text: formatReceiptNum(item.total), align: 'right', bold: true },
  ];

  return (
    <View
      style={{
        ...tableRow,
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: RECEIPT_BORDER,
        minHeight: 32,
      }}
    >
      {cells.map((cell, i) => (
        <Text
          key={COLS[i].key}
          style={{
            flex: cell.flex,
            fontSize: cell.bold ? 10 : 9,
            fontWeight: cell.bold ? '600' : '400',
            color: cell.bold ? '#111827' : RECEIPT_MUTED,
            textAlign: cell.align,
          }}
          numberOfLines={2}
        >
          {cell.text}
        </Text>
      ))}
    </View>
  );
}

function LabelValue({ label, value, labelStyle, valueStyle, gap = 6 }) {
  return (
    <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center' }}>
      <Text style={[{ fontSize: 13, color: '#374151', fontWeight: '700' }, labelStyle]}>{label}</Text>
      <Text style={[{ fontSize: 13, color: '#374151', marginLeft: gap }, valueStyle]}>{value}</Text>
    </View>
  );
}

export default function InvoiceReceiptEnglishCard({ sale, settings }) {
  const address = settings?.address?.trim() || '';
  const shopPhone = settings?.phone ? formatPhoneDisplay(settings.phone) : '';
  const paymentLabel =
    sale.paymentMethod === 'CREDIT'
      ? te('payment.credit')
      : sale.paymentMethod === 'CASH'
        ? te('payment.cash')
        : sale.paymentMethod || '—';

  return (
    <View
      style={{
        width: THERMAL_RECEIPT_WIDTH,
        backgroundColor: '#ffffff',
        padding: 16,
      }}
      collapsable={false}
    >
      <View
        style={{
          alignItems: 'center',
          borderBottomWidth: 3,
          borderBottomColor: RECEIPT_GREEN,
          paddingBottom: 14,
        }}
      >
        <AppLogo size={64} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: RECEIPT_GREEN,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {SHOP_NAME}
        </Text>
        {address ? (
          <Text style={{ fontSize: 12, color: RECEIPT_MUTED, marginTop: 4, textAlign: 'center' }}>{address}</Text>
        ) : null}
        {shopPhone ? (
          <Text style={{ fontSize: 12, color: RECEIPT_MUTED, marginTop: 2, textAlign: 'center' }}>{shopPhone}</Text>
        ) : null}
      </View>

      <View style={{ marginTop: 14, marginBottom: 10 }}>
        <LabelValue label={te('invoice.invoiceLabel')} value={sale.invoiceNumber} />
        <View style={{ marginTop: 4 }}>
          <LabelValue
            label={te('invoice.dateTimeLabel')}
            value={formatDateTime(sale.createdAt)}
            labelStyle={{ color: RECEIPT_MUTED }}
            valueStyle={{ color: RECEIPT_MUTED, fontWeight: '400' }}
          />
        </View>
        {sale.customer ? (
          <View style={{ marginTop: 8 }}>
            <LabelValue
              label={te('invoice.customerNameLabel')}
              value={sale.customer.name}
              labelStyle={{ color: '#111827' }}
              valueStyle={{ color: '#111827', fontWeight: '400' }}
            />
            {sale.customer.phone ? (
              <Text style={{ fontSize: 12, color: RECEIPT_MUTED, marginTop: 4 }}>
                {formatPhoneDisplay(sale.customer.phone)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <TableHeader />
      {(sale.items || []).map((item, index) => (
        <TableRow key={item.id || `line-${index}`} item={item} />
      ))}

      <View style={{ marginTop: 14 }}>
        <LabelValue label={`${te('invoice.subtotal')}:`} value={formatCurrency(sale.subtotal)} />
        <View style={{ marginTop: 4 }}>
          <LabelValue label={`${te('invoice.discount')}:`} value={formatCurrency(sale.discount)} />
        </View>
        <View style={{ marginTop: 8 }}>
          <LabelValue
            label={`${te('invoice.total')}:`}
            value={formatCurrency(sale.totalAmount)}
            labelStyle={{ fontSize: 18, fontWeight: '800', color: RECEIPT_GREEN }}
            valueStyle={{ fontSize: 18, fontWeight: '800', color: RECEIPT_GREEN }}
            gap={8}
          />
        </View>
        <Text style={{ fontSize: 12, color: RECEIPT_MUTED, marginTop: 6 }}>
          {te('invoice.payment', { method: paymentLabel })}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: '#FFA000',
          textAlign: 'center',
          marginTop: 20,
        }}
      >
        {te('invoice.thankYou', { appName: SHOP_NAME })}
      </Text>
    </View>
  );
}
