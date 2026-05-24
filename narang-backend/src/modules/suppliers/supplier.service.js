import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const getAllSuppliers = async ({ search }) => {
  return db.supplier.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { name: 'asc' },
  });
};

export const getSupplierById = async (id) => {
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  return supplier;
};

export const createSupplier = async (data) => {
  return db.supplier.create({ data });
};

export const updateSupplier = async (id, data) => {
  await getSupplierById(id);
  return db.supplier.update({ where: { id }, data });
};

export const deleteSupplier = async (id) => {
  await getSupplierById(id);
  await db.supplier.delete({ where: { id } });
  return { id };
};
