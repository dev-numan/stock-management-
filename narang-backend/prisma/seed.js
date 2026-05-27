import { createAdminUser } from '../scripts/create-admin.js';

async function main() {
  const creds = await createAdminUser();
  console.log(`Seed completed — admin only: ${creds.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
