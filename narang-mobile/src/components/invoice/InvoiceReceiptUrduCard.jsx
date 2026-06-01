import React from 'react';
import { View, Text } from 'react-native';
import AppLogo from '../common/AppLogo';
import { APP_NAME_URDU } from '../../constants/branding';
import { translate } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { formatPhoneDisplay } from '../../utils/phone';
import {
  THERMAL_RECEIPT_WIDTH,
  RECEIPT_GREEN as GREEN,
  RECEIPT_MUTED as MUTED,
  RECEIPT_BORDER as BORDER,
  formatReceiptNum,
  getLineDiscount,
  tableRow,
} from './thermalReceiptShared';

export { THERMAL_RECEIPT_WIDTH };

const tu = (key, params) => translate('ur', key, params);

const rtlText = {
  writingDirection: 'rtl',
  textAlign: 'right',
};

const rtlCenterText = {
  writingDirection: 'rtl',
  textAlign: 'center',
  width: '100%',
};

const rtlBlock = {
  width: '100%',
  alignItems: 'flex-end',
};

/** Columns left→right on paper: رقم | رعایت | تعداد | قیمت | مصنوعات (RTL read). */
const COLS = [
  { key: 'amount', flex: 0.82, header: 'invoice.col.amount', align: 'left' },
  { key: 'discount', flex: 0.58, header: 'invoice.col.discountShort', align: 'center' },
  { key: 'qty', flex: 0.42, header: 'invoice.col.qty', align: 'center' },
  { key: 'price', flex: 0.72, header: 'invoice.col.price', align: 'center' },
  { key: 'product', flex: 1.35, header: 'invoice.col.product', align: 'right' },
];

function TableHeader() {
  return (
    <View
      style={{
        ...tableRow,
        backgroundColor: GREEN,
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
            ...(col.align === 'right' ? rtlText : {}),
          }}
          numberOfLines={1}
        >
          {tu(col.header)}
        </Text>
      ))}
    </View>
  );
}

function TableRow({ item }) {
  const lineDisc = getLineDiscount(item);
  const cells = [
    { flex: COLS[0].flex, text: formatReceiptNum(item.total), align: 'left', bold: true },
    { flex: COLS[1].flex, text: formatReceiptNum(lineDisc), align: 'center' },
    { flex: COLS[2].flex, text: String(Number(item.quantity)), align: 'center' },
    { flex: COLS[3].flex, text: formatReceiptNum(item.unitPrice), align: 'center' },
    {
      flex: COLS[4].flex,
      text: item.product?.name || '—',
      align: 'right',
      rtl: true,
      bold: true,
    },
  ];

  return (
    <View
      style={{
        ...tableRow,
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
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
            color: cell.bold ? '#111827' : MUTED,
            textAlign: cell.align,
            ...(cell.rtl ? rtlText : {}),
          }}
          numberOfLines={2}
        >
          {cell.text}
        </Text>
      ))}
    </View>
  );
}

function RtlLabelValue({ label, value, labelStyle, valueStyle, gap = 6 }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
      <Text style={[{ fontSize: 13, color: '#374151' }, rtlText, valueStyle]}>{value}</Text>
      <Text style={[{ fontSize: 13, color: '#374151', marginLeft: gap, fontWeight: '700' }, rtlText, labelStyle]}>
        {label}
      </Text>
    </View>
  );
}

export default function InvoiceReceiptUrduCard({ sale, settings }) {
  const address = settings?.address?.trim() || '';
  const shopPhone = settings?.phone ? formatPhoneDisplay(settings.phone) : '';
  const paymentLabel =
    sale.paymentMethod === 'CREDIT'
      ? tu('payment.credit')
      : sale.paymentMethod === 'CASH'
        ? tu('payment.cash')
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
      <View style={{ alignItems: 'center', borderBottomWidth: 3, borderBottomColor: GREEN, paddingBottom: 14 }}>
        <AppLogo size={64} />
        <Text style={{ fontSize: 22, fontWeight: '700', color: GREEN, marginTop: 8, ...rtlCenterText }}>
          {APP_NAME_URDU}
        </Text>
        {address ? (
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 4, ...rtlCenterText }}>{address}</Text>
        ) : null}
        {shopPhone ? (
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 2, ...rtlCenterText }}>{shopPhone}</Text>
        ) : null}
      </View>

      <View style={{ ...rtlBlock, marginTop: 14, marginBottom: 10 }}>
        <RtlLabelValue
          label={tu('invoice.invoiceLabel')}
          value={sale.invoiceNumber}
          labelStyle={{ color: '#111827' }}
          valueStyle={{ color: '#111827', fontWeight: '400' }}
        />
        <View style={{ marginTop: 4 }}>
          <RtlLabelValue
            label={tu('invoice.dateTimeLabel')}
            value={formatDateTime(sale.createdAt)}
            labelStyle={{ color: MUTED }}
            valueStyle={{ color: MUTED, fontWeight: '400' }}
          />
        </View>
        {sale.customer ? (
          <View style={{ marginTop: 8, width: '100%' }}>
            <RtlLabelValue
              label={tu('invoice.customerNameLabel')}
              value={sale.customer.name}
              labelStyle={{ color: '#111827' }}
              valueStyle={{ color: '#111827', fontWeight: '400' }}
            />
            {sale.customer.phone ? (
              <RtlLabelValue
                label={tu('invoice.customerPhoneLabel')}
                value={formatPhoneDisplay(sale.customer.phone)}
                labelStyle={{ color: '#111827', marginTop: 4 }}
                valueStyle={{ color: '#111827', fontWeight: '400' }}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <TableHeader />
      {(sale.items || []).map((item, index) => (
        <TableRow key={item.id || `line-${index}`} item={item} />
      ))}

      <View style={{ ...rtlBlock, marginTop: 14 }}>
        <RtlLabelValue label={`${tu('invoice.subtotal')}:`} value={formatCurrency(sale.subtotal)} />
        <View style={{ marginTop: 4 }}>
          <RtlLabelValue label={`${tu('invoice.discount')}:`} value={formatCurrency(sale.discount)} />
        </View>
        <View style={{ marginTop: 8 }}>
          <RtlLabelValue
            label={`${tu('invoice.total')}:`}
            value={formatCurrency(sale.totalAmount)}
            labelStyle={{ fontSize: 18, fontWeight: '800', color: GREEN }}
            valueStyle={{ fontSize: 18, fontWeight: '800', color: GREEN }}
            gap={8}
          />
        </View>
        <Text style={{ fontSize: 12, color: MUTED, marginTop: 6, ...rtlText }}>
          {tu('invoice.payment', { method: paymentLabel })}
        </Text>
      </View>

      <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFA000', marginTop: 20, ...rtlCenterText }}>
        {tu('invoice.thankYou', { appName: APP_NAME_URDU })}
      </Text>
    </View>
  );
}
