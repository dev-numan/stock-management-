import { z } from 'zod';

export const PRODUCT_UNITS = ['BAG', 'KG', 'LITRE', 'PIECE', 'BOTTLE'];

export const PRODUCT_CATEGORIES = ['Fertilizers', 'Pesticides', 'Seeds', 'Other'];

const amountRegex = /^\d+(\.\d{1,2})?$/;
const integerRegex = /^\d+$/;

/** Parse numeric text field from forms */
export const amountField = (label, { min = 0, max, integer = false } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => (integer ? integerRegex : amountRegex).test(v), {
      message: integer ? `${label} must be a whole number` : `Enter a valid ${label.toLowerCase()}`,
    })
    .transform((v) => Number(v))
    .refine((n) => !Number.isNaN(n), `${label} is invalid`)
    .refine((n) => n >= min, {
      message: min > 0 ? `${label} must be greater than 0` : `${label} cannot be negative`,
    })
    .refine((n) => max === undefined || n <= max, {
      message: `${label} cannot exceed ${max}`,
    });

export const requiredText = (label) => z.string().trim().min(1, `${label} is required`);

export const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[\d\s+\-()]{7,20}$/.test(v), 'Enter a valid phone number');

export const dateField = z
  .string()
  .trim()
  .min(1, 'Date is required')
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use format YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

/** Optional YYYY-MM-DD; empty string becomes null */
export const optionalDateField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? null : v))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use format YYYY-MM-DD')
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), 'Invalid date');

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const productFormSchema = z
  .object({
    name: requiredText('Product name'),
    category: z.enum(PRODUCT_CATEGORIES, { message: 'Please select a category' }),
    unit: z.enum(PRODUCT_UNITS, { message: 'Please select a unit' }),
    costPrice: amountField('Cost price', { min: 0.01 }),
    salePrice: amountField('Sale price', { min: 0.01 }),
    currentStock: amountField('Current stock', { min: 0 }),
    minStockAlert: amountField('Low stock alert', { min: 0 }),
    expiryDate: optionalDateField,
  })
  .superRefine((data, ctx) => {
    if (data.minStockAlert > data.currentStock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cannot exceed current stock (${data.currentStock})`,
        path: ['minStockAlert'],
      });
    }
    if (data.salePrice < data.costPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sale price cannot be less than cost price',
        path: ['salePrice'],
      });
    }
  });

export const customerSchema = z.object({
  name: requiredText('Name'),
  phone: optionalPhone,
  address: z.string().trim().optional(),
});

export const supplierSchema = customerSchema;

export const expenseSchema = z.object({
  title: requiredText('Title'),
  amount: amountField('Amount', { min: 0.01 }),
  category: requiredText('Category'),
  date: dateField,
  notes: z.string().trim().optional(),
});

export const settingsSchema = z.object({
  address: requiredText('Address'),
  phone: z.string().trim().min(1, 'Phone is required').refine(
    (v) => /^[\d\s+\-()]{7,20}$/.test(v),
    'Enter a valid phone number'
  ),
  showLowStockAlert: z.boolean(),
  showExpiryAlert: z.boolean(),
  expiryAlertMonths: z.number().int().min(1, 'Minimum 1 month').max(12, 'Maximum 12 months'),
});

export const validateSaleCheckout = ({
  items,
  discount,
  subtotal,
  selectedCustomer,
  paymentMethod,
}) => {
  const errors = [];

  if (!items?.length) {
    errors.push('Add at least one product');
  }

  const name = selectedCustomer?.name?.trim() || '';
  const phone = selectedCustomer?.phone?.trim() || '';

  items.forEach((item) => {
    const stock = Number(item.product.currentStock);
    if (item.quantity > stock) {
      errors.push(`${item.product.name}: only ${stock} in stock`);
    }
    if (item.quantity <= 0) {
      errors.push(`${item.product.name}: quantity must be at least 1`);
    }
  });

  const discountNum = Number(discount) || 0;
  if (discountNum < 0) {
    errors.push('Discount cannot be negative');
  }
  if (discountNum > subtotal) {
    errors.push('Discount cannot exceed subtotal');
  }

  if (paymentMethod === 'CREDIT') {
    if (!selectedCustomer || !name) {
      errors.push('Select a customer from contacts for credit sales');
    }
    if (selectedCustomer && !phone) {
      errors.push('Selected customer must have a phone number');
    }
  }

  return errors;
};

export const validatePurchaseItems = (items) => {
  const errors = [];
  const fieldErrors = {};

  if (!items?.length) {
    return { errors: ['Add at least one product'], fieldErrors };
  }

  items.forEach((item) => {
    const qty = Number(item.quantity);
    const cost = Number(item.costPrice);

    const qtyStr = String(item.quantity).trim();
    if (!qtyStr || Number.isNaN(qty) || qty <= 0 || !amountRegex.test(qtyStr)) {
      fieldErrors[`${item.productId}-quantity`] = 'Enter a valid quantity greater than 0';
    }

    if (!item.costPrice?.toString().trim() || Number.isNaN(cost) || cost <= 0) {
      fieldErrors[`${item.productId}-costPrice`] = 'Enter a valid cost price';
    }
  });

  if (Object.keys(fieldErrors).length) {
    errors.push('Fix errors in purchase items');
  }

  return { errors, fieldErrors };
};

/** Strip non-numeric characters for amount inputs */
export const sanitizeAmountInput = (text, { integer = false } = {}) => {
  if (integer) {
    return text.replace(/[^\d]/g, '');
  }
  const cleaned = text.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts[1].slice(0, 2)}`;
};
