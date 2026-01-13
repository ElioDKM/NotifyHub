import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '.env') });

import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, admin_role } from '@prisma/client';

async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!url) throw new Error('Missing DATABASE_URL in .env');
  if (!email) throw new Error('Missing ADMIN_EMAIL in .env');
  if (!password) throw new Error('Missing ADMIN_PASSWORD in .env');

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const hashed = await bcrypt.hash(password, 12);

    await prisma.admin_user.upsert({
      where: { email }, // email unique
      create: {
        email,
        password_hash: hashed,
        role: admin_role.PLATFORM_ADMIN, // optionnel car default côté Prisma, mais safe
      },
      update: {
        password_hash: hashed, // si l'admin existe déjà, on met à jour le mdp
      },
    });

    console.log('✅ Admin seeded/updated:', email);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
