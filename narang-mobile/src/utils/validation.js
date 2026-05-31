import { z } from 'zod';
import { canHaveAlternateUnit } from './productUnits';

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

/** Empty string uses defaultString before amount validation (for placeholders). */
export const amountFieldWithDefault = (label, defaultString, options = {}) =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? String(defaultString) : v))
    .pipe(amountField(label, options));

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
    sellByAlternate: z.boolean().default(false),
    alternateSaleUnit: z.string().optional(),
    unitsPerStockUnit: z.string().optional(),
    costPrice: amountField('Cost price', { min: 0.01 }),
    salePrice: amountField('Sale price', { min: 0.01 }),
    currentStock: amountFieldWithDefault('Current stock', '0', { min: 0 }),
    minStockAlert: amountFieldWithDefault('Low stock alert', '10', { min: 0 }),
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
    if (data.sellByAlternate) {
      if (!data.alternateSaleUnit || !canHaveAlternateUnit(data.unit, data.alternateSaleUnit)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a valid alternate sale unit',
          path: ['alternateSaleUnit'],
        });
      }
      const perStock = Number(data.unitsPerStockUnit);
      if (!data.unitsPerStockUnit?.trim() || Number.isNaN(perStock) || perStock <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter units per stock unit (e.g. 50 kg per bag)',
          path: ['unitsPerStockUnit'],
        });
      }
    }
  });

export const productFormToPayload = (data) => ({
  name: data.name,
  category: data.category,
  unit: data.unit,
  alternateSaleUnit: data.sellByAlternate ? data.alternateSaleUnit : null,
  unitsPerStockUnit: data.sellByAlternate ? Number(data.unitsPerStockUnit) : null,
  costPrice: data.costPrice,
  salePrice: data.salePrice,
  currentStock: data.currentStock,
  minStockAlert: data.minStockAlert,
  expiryDate: data.expiryDate,
});

export const customerSchema = z.object({
  name: requiredText('Name'),
  phone: optionalPhone,
  address: z.string().trim().optional(),
});

export const supplierSchema = customerSchema;

const expenseDateField = z
  .string()
  .trim()
  .transform((v) => (v === '' ? new Date().toISOString().split('T')[0] : v))
  .pipe(dateField);

export const expenseSchema = z.object({
  title: requiredText('Title'),
  amount: amountField('Amount', { min: 0.01 }),
  category: z
    .string()
    .trim()
    .transform((v) => (v === '' ? 'General' : v))
    .pipe(requiredText('Category')),
  date: expenseDateField,
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

  const deductionByProduct = new Map();

  items.forEach((item) => {
    const soldUnit = item.soldUnit || item.product.unit;
    const stockDeduction = item.stockDeduction ?? item.quantity;
    const maxQty = item.maxQuantity ?? Number(item.product.currentStock);

    if (item.quantity <= 0) {
      errors.push(`${item.product.name}: quantity must be greater than 0`);
    }
    if (item.quantity > maxQty + 0.0001) {
      errors.push(`${item.product.name}: only ${Math.round(maxQty * 100) / 100} ${soldUnit} available`);
    }

    const prev = deductionByProduct.get(item.product.id) ?? 0;
    deductionByProduct.set(item.product.id, prev + stockDeduction);
  });

  deductionByProduct.forEach((deduction, productId) => {
    const product = items.find((i) => i.product.id === productId)?.product;
    if (!product) return;
    if (deduction > Number(product.currentStock) + 0.0001) {
      errors.push(`${product.name}: not enough stock for this sale`);
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
    const qtyStr = String(item.quantity).trim();
    const effectiveQty = qtyStr === '' ? '1' : qtyStr;
    const qty = Number(effectiveQty);

    const costStr = String(item.costPrice ?? '').trim();
    const effectiveCost =
      costStr === '' && item.suggestedCost != null ? String(item.suggestedCost).trim() : costStr;
    const cost = Number(effectiveCost);

    if (Number.isNaN(qty) || qty <= 0 || !amountRegex.test(effectiveQty)) {
      fieldErrors[`${item.productId}-quantity`] = 'Enter a valid quantity greater than 0';
    }

    if (!effectiveCost || Number.isNaN(cost) || cost <= 0 || !amountRegex.test(effectiveCost)) {
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
