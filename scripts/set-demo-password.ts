import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@career-os.ai";
  const password = "password123";
  const passwordHash = bcrypt.hashSync(password, 10);

  console.log(`Hashing password '${password}' for '${email}'...`);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
    },
    create: {
      email,
      name: "Alex Chen",
      passwordHash,
    },
  });

  console.log(`Success! User '${user.email}' updated with passwordHash.`);
}

main()
  .catch((e) => {
    console.error("Error setting password:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
