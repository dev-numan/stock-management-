import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'admin@narangfertilizers.com';
const DEFAULT_PASSWORD = 'HzmAdmin2026!';
const DEFAULT_NAME = 'Admin';

/**
 * Create or update the sole admin user. No products, categories, or other seed data.
 */
export async function createAdminUser({
  email = process.env.ADMIN_EMAIL || DEFAULT_EMAIL,
  password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD,
  name = process.env.ADMIN_NAME || DEFAULT_NAME,
} = {}) {
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  return { email, password, name };
}

async function main() {
  const creds = await createAdminUser();
  console.log('Admin user ready.');
  console.log(`  Email:    ${creds.email}`);
  console.log(`  Password: ${creds.password}`);
}

const isDirectRun = process.argv[1]?.endsWith('create-admin.js');

if (isDirectRun) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
