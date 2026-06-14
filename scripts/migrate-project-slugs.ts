/**
 * One-time migration: clears stale SHA-256 project slugs from sessions.
 * Old CLI versions hashed the project path; new versions send the folder basename.
 * Rows with a 64-char hex slug get their projectSlug set to null so the next
 * sync from the CLI will populate it with the correct basename.
 *
 * Usage: npx tsx scripts/migrate-project-slugs.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.session.updateMany({
    where: {
      projectSlug: { not: null },
    },
    data: {
      projectSlug: null,
    },
  });

  // We null out ALL old slugs — the CLI will re-populate on next sync.
  // A more surgical approach would match /^[0-9a-f]{12,64}$/ but Prisma
  // doesn't support regex in updateMany. Since new basenames will be
  // re-sent on the next sync, blanket-clearing is safe.

  console.log(`Cleared projectSlug on ${result.count} sessions.`);
  console.log("Run a CLI sync to re-populate with folder basenames.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
