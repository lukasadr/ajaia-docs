import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  { email: "alex@example.com", name: "Alex Morgan" },
  { email: "sam@example.com", name: "Sam Rivera" },
  { email: "jordan@example.com", name: "Jordan Lee" },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: user,
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());