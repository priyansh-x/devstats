import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { getLeaderboard, type LbPeriod, type LbMetric, type LbRow } from "./leaderboard";

const MAX_SQUADS_PER_USER = 10;
const MAX_MEMBERS = 50;

export interface SquadSummary {
  slug: string;
  name: string;
  memberCount: number;
  inviteCode: string;
  isCreator: boolean;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

/** Codes are short + unambiguous (no 0/O/1/I) so they survive being read aloud. */
function newInviteCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(8);
  return [...buf].map((b) => alphabet[b % alphabet.length]).join("");
}

export async function createSquad(userId: string, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 40) {
    throw new Error("name must be 3–40 characters");
  }
  const count = await prisma.squadMember.count({ where: { userId } });
  if (count >= MAX_SQUADS_PER_USER) throw new Error(`max ${MAX_SQUADS_PER_USER} squads per user`);

  let slug = slugify(trimmed) || `squad-${randomBytes(2).toString("hex")}`;
  if (await prisma.squad.findUnique({ where: { slug } })) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }

  const squad = await prisma.squad.create({
    data: {
      name: trimmed,
      slug,
      inviteCode: newInviteCode(),
      createdById: userId,
      members: { create: { userId } },
    },
  });
  return squad;
}

export async function joinSquad(userId: string, inviteCode: string) {
  const squad = await prisma.squad.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    include: { _count: { select: { members: true } } },
  });
  if (!squad) throw new Error("invalid invite code");
  if (squad._count.members >= MAX_MEMBERS) throw new Error("squad is full");

  await prisma.squadMember.upsert({
    where: { squadId_userId: { squadId: squad.id, userId } },
    update: {},
    create: { squadId: squad.id, userId },
  });
  return squad;
}

export async function leaveSquad(userId: string, slug: string) {
  const squad = await prisma.squad.findUnique({ where: { slug } });
  if (!squad) throw new Error("squad not found");
  await prisma.squadMember.deleteMany({ where: { squadId: squad.id, userId } });
  // Last one out deletes the squad.
  const remaining = await prisma.squadMember.count({ where: { squadId: squad.id } });
  if (remaining === 0) await prisma.squad.delete({ where: { id: squad.id } });
  return { left: true, squadDeleted: remaining === 0 };
}

export async function mySquads(userId: string): Promise<SquadSummary[]> {
  const memberships = await prisma.squadMember.findMany({
    where: { userId },
    include: { squad: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({
    slug: m.squad.slug,
    name: m.squad.name,
    memberCount: m.squad._count.members,
    inviteCode: m.squad.inviteCode,
    isCreator: m.squad.createdById === userId,
  }));
}

/** Member-only: squad standings. Throws if the viewer isn't in the squad. */
export async function squadStandings(
  viewerId: string,
  slug: string,
  period: LbPeriod,
  metric: LbMetric,
): Promise<{ squad: { name: string; slug: string; inviteCode: string; memberCount: number }; rows: LbRow[] }> {
  const squad = await prisma.squad.findUnique({
    where: { slug },
    include: { members: { select: { userId: true } } },
  });
  if (!squad) throw new Error("squad not found");
  const memberIds = squad.members.map((m) => m.userId);
  if (!memberIds.includes(viewerId)) throw new Error("not a member");

  const rows = await getLeaderboard(period, metric, {
    userIds: memberIds,
    requirePublic: false, // squad membership is its own consent
  });
  return {
    squad: { name: squad.name, slug: squad.slug, inviteCode: squad.inviteCode, memberCount: memberIds.length },
    rows,
  };
}
