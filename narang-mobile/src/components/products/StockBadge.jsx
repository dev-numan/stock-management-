import React from 'react';
import { Chip } from 'react-native-paper';

export default function StockBadge({ currentStock, minStockAlert }) {
  const stock = Number(currentStock);
  const min = Number(minStockAlert ?? 10);

  if (stock === 0) {
    return <Chip compact mode="flat" textStyle={{ fontSize: 11 }} style={{ backgroundColor: '#FEE2E2' }}>Out of Stock</Chip>;
  }
  if (stock <= min) {
    return <Chip compact mode="flat" textStyle={{ fontSize: 11 }} style={{ backgroundColor: '#FEF3C7' }}>Low Stock</Chip>;
  }
  return <Chip compact mode="flat" textStyle={{ fontSize: 11 }} style={{ backgroundColor: '#DCFCE7' }}>In Stock</Chip>;
}
