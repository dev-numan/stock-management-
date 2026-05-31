import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  cartLineKey,
  getMaxSaleQuantity,
  getStockDeduction,
  getUnitPrice,
  hasAlternateSale,
} from '../utils/productUnits';

const CartContext = createContext(null);

const buildLine = (product, quantity, soldUnit) => {
  const unit = soldUnit || product.unit;
  const qty = Number(quantity);
  const unitPrice = getUnitPrice(product, unit);
  const stockDeduction = getStockDeduction(product, unit, qty);
  const maxQuantity = getMaxSaleQuantity(product, unit);

  return {
    lineKey: cartLineKey(product.id, unit),
    product,
    soldUnit: unit,
    quantity: qty,
    unitPrice,
    total: qty * unitPrice,
    stockDeduction,
    maxQuantity,
  };
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const capQuantity = (product, soldUnit, qty) => {
    const maxQty = getMaxSaleQuantity(product, soldUnit);
    if (maxQty <= 0) return 0;
    return Math.min(Math.max(0.01, qty), maxQty);
  };

  const addItem = (product, quantity = 1, soldUnit = product.unit) => {
    const maxQty = getMaxSaleQuantity(product, soldUnit);
    if (maxQty <= 0) return false;

    const lineKey = cartLineKey(product.id, soldUnit);

    setItems((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      if (existing) {
        const newQty = capQuantity(product, soldUnit, existing.quantity + quantity);
        if (newQty <= 0) return prev;
        return prev.map((i) =>
          i.lineKey === lineKey ? buildLine(product, newQty, soldUnit) : i
        );
      }
      const qty = capQuantity(product, soldUnit, quantity);
      if (qty <= 0) return prev;
      return [...prev, buildLine(product, qty, soldUnit)];
    });
    return true;
  };

  const addProduct = (product) => {
    if (hasAlternateSale(product)) return 'pick_unit';
    return addItem(product, 1, product.unit) ? 'added' : 'out_of_stock';
  };

  const removeItem = (lineKey) => {
    setItems((prev) => prev.filter((i) => i.lineKey !== lineKey));
  };

  const updateQuantity = (lineKey, quantity) => {
    if (quantity <= 0) {
      removeItem(lineKey);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.lineKey !== lineKey) return i;
        const qty = capQuantity(i.product, i.soldUnit, quantity);
        return buildLine(i.product, qty, i.soldUnit);
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setNotes('');
    setPaymentMethod('CASH');
  };

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.total, 0),
    [items]
  );

  const total = useMemo(() => subtotal - discount, [subtotal, discount]);

  return (
    <CartContext.Provider
      value={{
        items,
        selectedCustomer,
        discount,
        paymentMethod,
        notes,
        subtotal,
        total,
        addItem,
        addProduct,
        removeItem,
        updateQuantity,
        setSelectedCustomer,
        updateSelectedCustomerAddress: (address) => {
          setSelectedCustomer((prev) => (prev ? { ...prev, address } : null));
        },
        clearSelectedCustomer: () => setSelectedCustomer(null),
        setDiscount,
        setPaymentMethod,
        setNotes,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
