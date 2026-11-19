const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@liquor-saas.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const fullName = process.env.ADMIN_NAME || 'Platform Admin';

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      fullName,
      isSuperAdmin: true,
      isActive: true,
      tenantId: null,
    },
    create: {
      email,
      passwordHash,
      fullName,
      isSuperAdmin: true,
      isActive: true,
      tenantId: null,
    },
  });

  console.log('Platform admin is ready.');
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);
  console.log('Login at the base app URL, not a tenant subdomain.');
}

main()
  .catch((error) => {
    console.error('Failed to seed admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
