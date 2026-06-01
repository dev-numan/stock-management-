import React from 'react';
import { Chip } from 'react-native-paper';
import { useTranslation } from '../../i18n/useTranslation';

export default function StockBadge({ currentStock, minStockAlert }) {
  const { t } = useTranslation();
  const stock = Number(currentStock);
  const min = Number(minStockAlert ?? 10);

  if (stock === 0) {
    return <Chip compact mode="flat" textStyle={{ fontSize: 11 }} style={{ backgroundColor: '#FEE2E2' }}>{t('stock.out')}</Chip>;
  }
  if (stock <= min) {
    return <Chip compact mode="flat" textStyle={{ fontSize: 11 }} style={{ backgroundColor: '#FEF3C7' }}>{t('stock.low')}</Chip>;
  }
  return <Chip compact mode="flat" textStyle={{ fontSize: 11 }} style={{ backgroundColor: '#DCFCE7' }}>{t('stock.in')}</Chip>;
}
