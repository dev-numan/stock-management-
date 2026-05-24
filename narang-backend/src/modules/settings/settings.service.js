import { db } from '../../config/db.js';
import { SHOP_NAME, INVOICE_PREFIX } from '../../constants/branding.js';

const withBranding = (settings) => ({
  ...settings,
  shopName: SHOP_NAME,
  invoicePrefix: INVOICE_PREFIX,
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

  const settings = await db.settings.upsert({
    where: { id: 1 },
    update: updateData,
    create: { id: 1, ...updateData },
  });
  return withBranding(settings);
};
