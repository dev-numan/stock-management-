import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { SHOP_NAME, INVOICE_PREFIX } from '../../constants/branding.js';
import { clampExpiryAlertMonths } from '../../utils/parseExpiryDate.js';

const withBranding = (settings) => ({
  ...settings,
  shopName: SHOP_NAME,
  invoicePrefix: INVOICE_PREFIX,
  expiryAlertMonths: clampExpiryAlertMonths(settings.expiryAlertMonths),
});

export const getSettings = async () => {
  let settings = await db.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await db.settings.create({ data: { id: 1 } });
  }
  return withBranding(settings);
};

export const updateSettings = async (data) => {
  const updateData = {};
  if (data.address !== undefined) updateData.address = data.address;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.showLowStockAlert !== undefined) {
    updateData.showLowStockAlert = Boolean(data.showLowStockAlert);
  }
  if (data.showExpiryAlert !== undefined) {
    updateData.showExpiryAlert = Boolean(data.showExpiryAlert);
  }
  if (data.expiryAlertMonths !== undefined) {
    const raw = Number(data.expiryAlertMonths);
    if (Number.isNaN(raw) || raw < 1 || raw > 12) {
      throw new ApiError(400, 'Expiry alert months must be between 1 and 12');
    }
    updateData.expiryAlertMonths = clampExpiryAlertMonths(raw);
  }

  const settings = await db.settings.upsert({
    where: { id: 1 },
    update: updateData,
    create: { id: 1, ...updateData },
  });
  return withBranding(settings);
};
