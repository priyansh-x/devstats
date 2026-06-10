/**
 * One-shot account-rebinding script.
 *
 * Use case: you have an existing User row (with all your historical sessions,
 * streaks, leaderboard entries, follows, API key) whose email is X. You're
 * about to switch to a different auth provider (e.g. GitHub) that will send
 * Supabase a different email Y. Without this script, your first GitHub sign-in
 * would create a *new* User row keyed to Y and leave X orphaned.
 *
 * Usage:
 *   pnpm exec tsx scripts/merge-email.ts <oldEmail> <newEmail>
 *
 * Example:
 *   pnpm exec tsx scripts/merge-email.ts priyansh.joshi07@gmail.com priyansh@gh.example
 *
 * What it does, in a transaction:
 *   1. Find User where email = oldEmail
 *   2. If a User exists at newEmail, refuse and tell you to delete it first
 *      (otherwise we'd hit the @unique constraint on email mid-update).
 *   3. Update User.email = newEmail
 *
 * After running, sign in via your new provider — `prisma.user.upsert()` in
 * auth.ts will find this row by the new email and reattach. All your
 * sessions, streaks, follow graph, and API key stay intact.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [oldEmail, newEmail] = process.argv.slice(2);
  if (!oldEmail || !newEmail) {
    console.error("Usage: pnpm tsx scripts/merge-email.ts <oldEmail> <newEmail>");
    process.exit(1);
  }
  if (oldEmail === newEmail) {
    console.error("Same email on both sides — nothing to do.");
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: oldEmail },
      select: { id: true, username: true, isPublic: true },
    });
    if (!existing) {
      throw new Error(`No user found with email "${oldEmail}".`);
    }

    const collision = await tx.user.findUnique({
      where: { email: newEmail },
      select: { id: true, username: true },
    });
    if (collision) {
      throw new Error(
        `A user already exists with email "${newEmail}" (handle: ${collision.username}). ` +
          `Delete that user first in the Supabase dashboard (Auth → Users) or rebind manually.`,
      );
    }

    const [sessionCount, followCount] = await Promise.all([
      tx.session.count({ where: { userId: existing.id } }),
      tx.friendship.count({ where: { followerId: existing.id } }),
    ]);

    await tx.user.update({
      where: { id: existing.id },
      data: { email: newEmail },
    });

    console.log("─".repeat(60));
    console.log(`Rebound user "${existing.username}" (${existing.id})`);
    console.log(`  email     ${oldEmail}  →  ${newEmail}`);
    console.log(`  sessions  ${sessionCount}  (preserved)`);
    console.log(`  follows   ${followCount}  (preserved)`);
    console.log(`  visibility  ${existing.isPublic ? "public" : "private"}`);
    console.log("─".repeat(60));
    console.log();
    console.log("Now sign in via GitHub at /login. You'll land on your existing");
    console.log("dashboard, no re-sync needed.");
  });

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Merge failed:", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
