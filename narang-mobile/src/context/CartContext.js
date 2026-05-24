import React, { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  /** @type {null | { id?: string, name: string, phone: string, address?: string, isExisting?: boolean }} */
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const capQuantity = (product, qty) => {
    const stock = Number(product.currentStock);
    if (Number.isNaN(stock) || stock <= 0) return 0;
    return Math.min(Math.max(1, qty), stock);
  };

  const addItem = (product, quantity = 1) => {
    const stock = Number(product.currentStock);
    if (stock <= 0) return false;

    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const newQty = capQuantity(product, existing.quantity + quantity);
        return prev.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: newQty,
                total: newQty * Number(i.unitPrice),
              }
            : i
        );
      }
      const qty = capQuantity(product, quantity);
      const unitPrice = Number(product.salePrice);
      return [
        ...prev,
        {
          product,
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        },
      ];
    });
    return true;
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        const qty = capQuantity(i.product, quantity);
        return { ...i, quantity: qty, total: qty * Number(i.unitPrice) };
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
