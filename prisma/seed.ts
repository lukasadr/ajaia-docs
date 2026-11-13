import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  { email: "alex@example.com", name: "Alex Morgan" },
  { email: "sam@example.com", name: "Sam Rivera" },
  { email: "jordan@example.com", name: "Jordan Lee" },
];

async function main() {
  const seededUsers = new Map<string, { id: string }>();
  for (const user of users) {
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: user,
      select: { id: true },
    });
    seededUsers.set(user.email, savedUser);
  }

  const owner = seededUsers.get("alex@example.com")!;
  const editor = seededUsers.get("sam@example.com")!;
  const viewer = seededUsers.get("jordan@example.com")!;
  const title = "Review-ready project brief";
  const document = await prisma.document.findFirst({ where: { ownerId: owner.id, title }, select: { id: true } });
  const sampleDocument = document ?? await prisma.document.create({
    data: {
      ownerId: owner.id,
      title,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Project brief" }] },
          { type: "paragraph", content: [{ type: "text", text: "This sample is shared with Sam as an editor and Jordan as a viewer." }] },
        ],
      },
    },
    select: { id: true },
  });

  for (const [user, role] of [[editor, "editor"], [viewer, "viewer"]] as const) {
    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: sampleDocument.id, userId: user.id } },
      update: { role },
      create: { documentId: sampleDocument.id, userId: user.id, role },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());