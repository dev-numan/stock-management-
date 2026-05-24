import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@narangfertilizers.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@narangfertilizers.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      shopName: 'Hafeez Zarai Markaz',
      invoicePrefix: 'HZM',
    },
    create: {
      id: 1,
      shopName: 'Hafeez Zarai Markaz',
      address: 'Main Bazar, Punjab, Pakistan',
      phone: '+92-XXX-XXXXXXX',
      taxPercent: 0,
      invoicePrefix: 'HZM',
    },
  });

  const categoryNames = ['Fertilizers', 'Pesticides', 'Seeds', 'Other'];
  const categories = {};

  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = cat;
  }

  const products = [
    { name: 'DAP 50kg', category: 'Fertilizers', unit: 'BAG', cost: 8000, sale: 8500, stock: 100 },
    { name: 'Urea 50kg', category: 'Fertilizers', unit: 'BAG', cost: 3800, sale: 4200, stock: 150 },
    { name: 'Potash 50kg', category: 'Fertilizers', unit: 'BAG', cost: 5500, sale: 6000, stock: 80 },
    { name: 'Weedicide 1L', category: 'Pesticides', unit: 'LITRE', cost: 900, sale: 1100, stock: 50 },
    { name: 'Wheat Seeds 40kg', category: 'Seeds', unit: 'BAG', cost: 3000, sale: 3500, stock: 60 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          categoryId: categories[p.category].id,
          unit: p.unit,
          costPrice: p.cost,
          salePrice: p.sale,
          currentStock: p.stock,
          minStockAlert: 10,
        },
      });
    }
  }

  console.log('Seed completed: admin@narangfertilizers.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
