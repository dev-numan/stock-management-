import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { resolveSupplierId, mapPurchaseWithSupplier } from '../../utils/supplierResolve.js';
import { isValidProductCategory } from '../../constants/productCategories.js';
import { parseExpiryDate } from '../../utils/parseExpiryDate.js';
import { validateAlternateUnitFields, canHaveAlternateUnit } from '../../utils/productUnits.js';
import { runIdempotent } from '../../utils/idempotency.js';

function mapProductWithSupplier(product) {
  if (!product) return product;
  const { party, partyId, ...rest } = product;
  return {
    ...rest,
    supplierId: partyId,
    partyId,
    supplier: party,
    party,
  };
}

export const getAllProducts = async ({ search, category, lowStock }) => {
  const where = {};

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (category) {
    where.category = category;
  }

  const products = await db.product.findMany({
    where,
    include: { party: true },
    orderBy: { name: 'asc' },
  });

  if (lowStock === 'true') {
    return products
      .filter((p) => Number(p.currentStock) <= Number(p.minStockAlert))
      .map(mapProductWithSupplier);
  }

  return products.map(mapProductWithSupplier);
};

export const getProductById = async (id) => {
  const product = await db.product.findUnique({
    where: { id },
    include: { party: true },
  });
  if (!product) throw new ApiError(404, 'Product not found');
  return mapProductWithSupplier(product);
};

const validateProductNumbers = (data) => {
  const cost = Number(data.costPrice);
  const sale = Number(data.salePrice);
  const stock = Number(data.currentStock ?? 0);
  const minAlert = Number(data.minStockAlert ?? 10);

  if (sale < cost) {
    throw new ApiError(400, 'Sale price cannot be less than cost price');
  }
  if (stock > 0 && minAlert > stock) {
    throw new ApiError(400, `Low stock alert cannot exceed current stock (${stock})`);
  }
};

const decimal = (v) => new Prisma.Decimal(v);

const validateCategory = (category) => {
  if (!isValidProductCategory(category)) {
    throw new ApiError(400, 'Invalid product category');
  }
};

const resolveAlternateFields = (data, existingUnit) => {
  const unit = data.unit ?? existingUnit ?? 'BAG';
  if (data.alternateSaleUnit === null || data.alternateSaleUnit === '') {
    return { alternateSaleUnit: null, unitsPerStockUnit: null };
  }
  if (data.alternateSaleUnit === undefined && data.unitsPerStockUnit === undefined) {
    return undefined;
  }
  try {
    return validateAlternateUnitFields({
      unit,
      alternateSaleUnit: data.alternateSaleUnit ?? null,
      unitsPerStockUnit: data.unitsPerStockUnit,
    });
  } catch (err) {
    throw new ApiError(400, err.message);
  }
};

export const createProduct = async (data) => {
  const clientRequestId = data.clientRequestId?.trim() || null;

  if (clientRequestId) {
    const existing = await db.product.findUnique({
      where: { clientRequestId },
      include: { party: true },
    });
    if (existing) return mapProductWithSupplier(existing);
  }

  validateCategory(data.category);
  validateProductNumbers(data);

  const alternate = resolveAlternateFields(data, data.unit ?? 'BAG');

  try {
    return mapProductWithSupplier(
      await db.product.create({
        data: {
          name: data.name,
          category: data.category.trim(),
          unit: data.unit ?? 'BAG',
          ...(alternate ?? {}),
          costPrice: new Prisma.Decimal(data.costPrice),
          salePrice: new Prisma.Decimal(data.salePrice),
          currentStock: new Prisma.Decimal(0),
          minStockAlert: new Prisma.Decimal(data.minStockAlert ?? 10),
          expiryDate: parseExpiryDate(data.expiryDate),
          partyId: data.partyId || data.supplierId || null,
          clientRequestId,
        },
        include: { party: true },
      })
    );
  } catch (err) {
    if (err?.code === 'P2002' && clientRequestId) {
      const existing = await db.product.findUnique({
        where: { clientRequestId },
        include: { party: true },
      });
      if (existing) return mapProductWithSupplier(existing);
    }
    throw err;
  }
};

export const updateProduct = async (id, data) => {
  const existing = await getProductById(id);

  const merged = {
    costPrice: data.costPrice ?? existing.costPrice,
    salePrice: data.salePrice ?? existing.salePrice,
    currentStock: data.currentStock ?? existing.currentStock,
    minStockAlert: data.minStockAlert ?? existing.minStockAlert,
  };
  validateProductNumbers(merged);

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) {
    validateCategory(data.category);
    updateData.category = data.category.trim();
  }
  if (data.unit !== undefined) {
    updateData.unit = data.unit;
    if (
      data.alternateSaleUnit === undefined &&
      data.unitsPerStockUnit === undefined &&
      existing.alternateSaleUnit &&
      !canHaveAlternateUnit(data.unit, existing.alternateSaleUnit)
    ) {
      updateData.alternateSaleUnit = null;
      updateData.unitsPerStockUnit = null;
    }
  }

  const alternate = resolveAlternateFields(
    {
      unit: data.unit ?? existing.unit,
      alternateSaleUnit: data.alternateSaleUnit,
      unitsPerStockUnit: data.unitsPerStockUnit,
    },
    existing.unit
  );
  if (alternate !== undefined) {
    updateData.alternateSaleUnit = alternate.alternateSaleUnit;
    updateData.unitsPerStockUnit =
      alternate.unitsPerStockUnit != null
        ? new Prisma.Decimal(alternate.unitsPerStockUnit)
        : null;
  }

  if (data.costPrice !== undefined) updateData.costPrice = new Prisma.Decimal(data.costPrice);
  if (data.salePrice !== undefined) updateData.salePrice = new Prisma.Decimal(data.salePrice);
  // Stock changes only via addProductStock (creates supplier purchase).
  if (data.minStockAlert !== undefined) updateData.minStockAlert = new Prisma.Decimal(data.minStockAlert);
  if (data.expiryDate !== undefined) updateData.expiryDate = parseExpiryDate(data.expiryDate);
  if (data.partyId !== undefined || data.supplierId !== undefined) {
    updateData.partyId = data.partyId || data.supplierId || null;
  }

  return mapProductWithSupplier(
    await db.product.update({
      where: { id },
      data: updateData,
      include: { party: true },
    })
  );
};

export const addProductStock = async (
  productId,
  { quantity, partyId, supplierId, supplierName, notes, costPrice: costPriceInput, salePrice: salePriceInput, clientRequestId }
) => {
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw new ApiError(400, 'Quantity must be greater than zero');
  }

  const resolvedInputId = partyId || supplierId;
  const hasSupplier = Boolean(resolvedInputId || supplierName?.trim());

  return runIdempotent(db, clientRequestId, async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new ApiError(404, 'Product not found');

    const lineCost =
      costPriceInput != null && costPriceInput !== ''
        ? decimal(costPriceInput)
        : product.costPrice;
    const newSalePrice =
      salePriceInput != null && salePriceInput !== ''
        ? decimal(salePriceInput)
        : null;

    if (newSalePrice && newSalePrice.lt(lineCost)) {
      throw new ApiError(400, 'Sale price cannot be less than cost price');
    }

    const qtyDec = decimal(qty);

    const productUpdate = {
      currentStock: { increment: qtyDec },
      costPrice: lineCost,
    };
    if (newSalePrice) {
      productUpdate.salePrice = newSalePrice;
    }

    if (!hasSupplier) {
      const updated = await tx.product.update({
        where: { id: productId },
        data: productUpdate,
        include: { party: true },
      });
      return { product: mapProductWithSupplier(updated), purchase: null };
    }

    const resolvedPartyId = await resolveSupplierId(tx, {
      supplierId: resolvedInputId,
      supplierName,
    });
    if (!resolvedPartyId) {
      throw new ApiError(400, 'Supplier could not be resolved');
    }

    const totalAmount = lineCost.mul(qtyDec);

    const purchase = await tx.purchase.create({
      data: {
        partyId: resolvedPartyId,
        totalAmount,
        notes: notes?.trim() || null,
        items: {
          create: [
            {
              productId,
              quantity: qtyDec,
              costPrice: lineCost,
            },
          ],
        },
      },
      include: {
        party: true,
        items: { include: { product: true } },
      },
    });

    productUpdate.partyId = resolvedPartyId;

    const updated = await tx.product.update({
      where: { id: productId },
      data: productUpdate,
      include: { party: true },
    });

    return {
      product: mapProductWithSupplier(updated),
      purchase: mapPurchaseWithSupplier(purchase),
    };
  }, async (database) => {
    const current = await database.product.findUnique({
      where: { id: productId },
      include: { party: true },
    });
    return { product: mapProductWithSupplier(current), purchase: null, duplicate: true };
  }, TRANSACTION_OPTS);
};

export const deleteProduct = async (id) => {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) return { id, alreadyDeleted: true };

  const blockers = await getProductDeletionBlockers(id);
  if (!blockers.canDelete) {
    throw new ApiError(409, 'Product is linked to existing sales or purchases', {
      code: 'PRODUCT_IN_USE',
      sales: blockers.sales,
      purchases: blockers.purchases,
    });
  }
  await db.product.delete({ where: { id } });
  return { id };
};

export const getProductDeletionBlockers = async (id) => {
  await getProductById(id);

  const [saleItems, purchaseItems] = await Promise.all([
    db.saleItem.findMany({
      where: { productId: id },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
            totalAmount: true,
          },
        },
      },
    }),
    db.purchaseItem.findMany({
      where: { productId: id },
      include: {
        purchase: {
          select: {
            id: true,
            createdAt: true,
            totalAmount: true,
            party: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const salesById = new Map();
  for (const row of saleItems) {
    if (row.sale) salesById.set(row.sale.id, row.sale);
  }

  const purchasesById = new Map();
  for (const row of purchaseItems) {
    if (row.purchase) purchasesById.set(row.purchase.id, row.purchase);
  }

  const sortNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  const sales = [...salesById.values()].sort(sortNewest);
  const purchases = [...purchasesById.values()]
    .sort(sortNewest)
    .map((p) => {
      const { party, partyId, ...rest } = p;
      return { ...rest, supplierId: partyId, partyId, supplier: party, party };
    });

  return {
    canDelete: sales.length === 0 && purchases.length === 0,
    sales,
    purchases,
  };
};
