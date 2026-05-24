import { Prisma } from '@prisma/client';
import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const getAllProducts = async ({ search, categoryId, lowStock }) => {
  const where = {};

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const products = await db.product.findMany({
    where,
    include: { category: true, supplier: true },
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
    include: { category: true, supplier: true },
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
  if (minAlert > stock) {
    throw new ApiError(400, `Low stock alert cannot exceed current stock (${stock})`);
  }
};

export const createProduct = async (data) => {
  const category = await db.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new ApiError(400, 'Category not found');

  validateProductNumbers(data);

  return db.product.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      unit: data.unit ?? 'BAG',
      costPrice: new Prisma.Decimal(data.costPrice),
      salePrice: new Prisma.Decimal(data.salePrice),
      currentStock: new Prisma.Decimal(data.currentStock ?? 0),
      minStockAlert: new Prisma.Decimal(data.minStockAlert ?? 10),
      supplierId: data.supplierId || null,
    },
    include: { category: true, supplier: true },
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
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.costPrice !== undefined) updateData.costPrice = new Prisma.Decimal(data.costPrice);
  if (data.salePrice !== undefined) updateData.salePrice = new Prisma.Decimal(data.salePrice);
  if (data.currentStock !== undefined) updateData.currentStock = new Prisma.Decimal(data.currentStock);
  if (data.minStockAlert !== undefined) updateData.minStockAlert = new Prisma.Decimal(data.minStockAlert);
  if (data.supplierId !== undefined) updateData.supplierId = data.supplierId || null;

  return db.product.update({
    where: { id },
    data: updateData,
    include: { category: true, supplier: true },
  });
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
