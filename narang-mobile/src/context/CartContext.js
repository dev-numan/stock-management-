import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  cartLineKey,
  getRemainingSaleQuantity,
  getStockDeduction,
  getUnitPrice,
  hasAlternateSale,
  roundSaleQty,
} from '../utils/productUnits';
import { roundMoney } from '../utils/money';

const CartContext = createContext(null);

const buildLine = (product, quantity, soldUnit, cartItems, lineKey) => {
  const unit = soldUnit || product.unit;
  const qty = roundSaleQty(quantity);
  const unitPrice = getUnitPrice(product, unit);
  const stockDeduction = getStockDeduction(product, unit, qty);
  const maxQuantity = getRemainingSaleQuantity(product, unit, cartItems, lineKey);

  return {
    lineKey: lineKey ?? cartLineKey(product.id, unit),
    product,
    soldUnit: unit,
    quantity: qty,
    unitPrice,
    total: roundMoney(qty * unitPrice),
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

  const capQuantity = (product, soldUnit, qty, cartItems, lineKey) => {
    const maxQty = getRemainingSaleQuantity(product, soldUnit, cartItems, lineKey);
    if (maxQty <= 0) return 0;
    return roundSaleQty(Math.min(Math.max(0.01, qty), maxQty));
  };

  const addItem = (product, quantity = 1, soldUnit = product.unit) => {
    const lineKey = cartLineKey(product.id, soldUnit);
    let added = false;

    setItems((prev) => {
      const maxQty = getRemainingSaleQuantity(product, soldUnit, prev, lineKey);
      if (maxQty <= 0) return prev;

      const existing = prev.find((i) => i.lineKey === lineKey);
      if (existing) {
        const newQty = capQuantity(
          product,
          soldUnit,
          existing.quantity + quantity,
          prev,
          lineKey
        );
        if (newQty <= 0) return prev;
        added = true;
        return prev.map((i) =>
          i.lineKey === lineKey ? buildLine(product, newQty, soldUnit, prev, lineKey) : i
        );
      }
      const qty = capQuantity(product, soldUnit, quantity, prev, lineKey);
      if (qty <= 0) return prev;
      added = true;
      return [...prev, buildLine(product, qty, soldUnit, prev, lineKey)];
    });
    return added;
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
      return { ok: true, capped: false, maxQty: 0 };
    }
    let result = { ok: true, capped: false, maxQty: 0 };
    setItems((prev) =>
      prev.map((i) => {
        if (i.lineKey !== lineKey) return i;
        const maxQty = getRemainingSaleQuantity(i.product, i.soldUnit, prev, lineKey);
        const requested = Number(quantity);
        const qty = capQuantity(i.product, i.soldUnit, requested, prev, lineKey);
        result = { ok: true, capped: requested > maxQty + 0.0001, maxQty };
        return buildLine(i.product, qty, i.soldUnit, prev, lineKey);
      })
    );
    return result;
  };

  const clearCart = () => {
    setItems([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setNotes('');
    setPaymentMethod('CASH');
  };

  const subtotal = useMemo(
    () => roundMoney(items.reduce((sum, i) => sum + i.total, 0)),
    [items]
  );

  const total = useMemo(() => roundMoney(subtotal - discount), [subtotal, discount]);

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
