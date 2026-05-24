import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const getAllCategories = async () => {
  return db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
};

export const createCategory = async ({ name }) => {
  return db.category.create({ data: { name } });
};

export const deleteCategory = async (id) => {
  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  if (category._count.products > 0) {
    throw new ApiError(400, 'Cannot delete category with existing products');
  }

  await db.category.delete({ where: { id } });
  return { id };
};
