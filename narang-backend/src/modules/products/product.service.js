import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { resolveSupplierId } from '../../utils/supplierResolve.js';
import { isValidProductCategory } from '../../constants/productCategories.js';
import { parseExpiryDate } from '../../utils/parseExpiryDate.js';
import { validateAlternateUnitFields, canHaveAlternateUnit } from '../../utils/productUnits.js';

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
    include: { supplier: true },
    orderBy: { name: 'asc' },
  });

  if (lowStock === 'true') {
    return products.filter(
      (p) => Number(p.currentStock) <= Number(p.minStockAlert)
    );
  }

  return products;
};

export const getProductById = async (id) => {
  const product = await db.product.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
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
  validateCategory(data.category);
  validateProductNumbers(data);

  const alternate = resolveAlternateFields(data, data.unit ?? 'BAG');

  return db.product.create({
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
      supplierId: data.supplierId || null,
    },
    include: { supplier: true },
  });
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
  if (data.supplierId !== undefined) updateData.supplierId = data.supplierId || null;

  return db.product.update({
    where: { id },
    data: updateData,
    include: { supplier: true },
  });
};

export const addProductStock = async (
  productId,
  { quantity, supplierId, supplierName, notes, costPrice: costPriceInput, salePrice: salePriceInput }
) => {
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw new ApiError(400, 'Quantity must be greater than zero');
  }

  const hasSupplier = Boolean(supplierId || supplierName?.trim());

  return db.$transaction(async (tx) => {
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
        include: { supplier: true },
      });
      return { product: updated, purchase: null };
    }

    const resolvedSupplierId = await resolveSupplierId(tx, { supplierId, supplierName });
    if (!resolvedSupplierId) {
      throw new ApiError(400, 'Supplier could not be resolved');
    }

    const totalAmount = lineCost.mul(qtyDec);

    const purchase = await tx.purchase.create({
      data: {
        supplierId: resolvedSupplierId,
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
        supplier: true,
        items: { include: { product: true } },
      },
    });

    productUpdate.supplierId = resolvedSupplierId;

    const updated = await tx.product.update({
      where: { id: productId },
      data: productUpdate,
      include: { supplier: true },
    });

    return { product: updated, purchase };
  }, TRANSACTION_OPTS);
};

export const deleteProduct = async (id) => {
  await getProductById(id);
  try {
    await db.product.delete({ where: { id } });
  } catch (err) {
    if (err.code === 'P2003') {
      throw new ApiError(
        400,
        'Cannot delete this product because it is used in sales or purchases'
      );
    }
    throw err;
  }
  return { id };
};
