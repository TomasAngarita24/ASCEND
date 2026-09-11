import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type {
  FollowListResponse,
  FollowMutationResponse,
  PublicProfileResponse,
  PublicRoutinesResponse,
  SocialUserSummary,
} from './users.types';

const USER_SUMMARY_SELECT = {
  id: true,
  fullName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const PROFILE_SELECT = {
  ...USER_SUMMARY_SELECT,
  bio: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const FOLLOWER_INCLUDE = {
  follower: { select: USER_SUMMARY_SELECT },
} satisfies Prisma.UserFollowInclude;

const FOLLOWING_INCLUDE = {
  following: { select: USER_SUMMARY_SELECT },
} satisfies Prisma.UserFollowInclude;

async function requireExistingUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User does not exist.');
  }
}

async function resolveFollowingFlag(viewerId: string, targetIds: string[]): Promise<Set<string>> {
  if (targetIds.length === 0) return new Set();

  const rows = await prisma.userFollow.findMany({
    where: {
      followerId: viewerId,
      followingId: { in: targetIds },
    },
    select: { followingId: true },
  });

  return new Set(rows.map((row) => row.followingId));
}

function paginate(input: { page: number; limit: number }): { skip: number; take: number } {
  return { skip: (input.page - 1) * input.limit, take: input.limit };
}

export async function getPublicProfile(viewerId: string, userId: string): Promise<PublicProfileResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });

  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User does not exist.');
  }

  const isSelf = viewerId === userId;

  const [followersCount, followingCount, workoutsCompleted, postsCount, publicRoutinesCount, isFollowing] = await Promise.all([
    prisma.userFollow.count({ where: { followingId: userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.workout.count({ where: { userId, status: 'completed' } }),
    prisma.post.count({ where: { authorId: userId } }),
    prisma.routine.count({ where: { userId, isPublic: true } }),
    isSelf
      ? Promise.resolve(0)
      : prisma.userFollow.count({ where: { followerId: viewerId, followingId: userId } }),
  ]);

  return {
    id: user.id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
    stats: { workoutsCompleted, postsCount, publicRoutinesCount },
    followersCount,
    followingCount,
    isFollowing: isFollowing > 0,
    isSelf,
  };
}

export async function getUserPublicRoutines(userId: string): Promise<PublicRoutinesResponse> {
  await requireExistingUser(userId);

  const routines = await prisma.routine.findMany({
    where: { userId, isPublic: true },
    select: {
      id: true,
      name: true,
      folderId: true,
      createdAt: true,
      _count: { select: { routineExercises: { where: { exercise: { deletedAt: null } } } } },
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  return {
    data: routines.map((routine) => ({
      id: routine.id,
      name: routine.name,
      folderId: routine.folderId,
      exerciseCount: routine._count.routineExercises,
      createdAt: routine.createdAt.toISOString(),
    })),
  };
}

export async function followUser(viewerId: string, targetId: string): Promise<FollowMutationResponse> {
  if (viewerId === targetId) {
    throw new HttpError(400, 'CANNOT_FOLLOW_SELF', 'You cannot follow yourself.');
  }

  await requireExistingUser(targetId);

  await prisma.userFollow.upsert({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
    create: { followerId: viewerId, followingId: targetId },
    update: {},
  });

  const followersCount = await prisma.userFollow.count({ where: { followingId: targetId } });
  return { following: true, followersCount };
}

export async function unfollowUser(viewerId: string, targetId: string): Promise<FollowMutationResponse> {
  if (viewerId === targetId) {
    throw new HttpError(400, 'CANNOT_FOLLOW_SELF', 'You cannot unfollow yourself.');
  }

  await requireExistingUser(targetId);

  await prisma.userFollow.deleteMany({
    where: { followerId: viewerId, followingId: targetId },
  });

  const followersCount = await prisma.userFollow.count({ where: { followingId: targetId } });
  return { following: false, followersCount };
}

export async function listFollowers(
  viewerId: string,
  targetId: string,
  input: { page: number; limit: number },
): Promise<FollowListResponse> {
  await requireExistingUser(targetId);

  const where: Prisma.UserFollowWhereInput = { followingId: targetId };
  const [rows, total] = await Promise.all([
    prisma.userFollow.findMany({
      where,
      include: FOLLOWER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...paginate(input),
    }),
    prisma.userFollow.count({ where }),
  ]);

  const following = await resolveFollowingFlag(
    viewerId,
    rows.map((row) => row.follower.id),
  );

  return {
    data: rows.map((row): SocialUserSummary => ({
      id: row.follower.id,
      fullName: row.follower.fullName,
      avatarUrl: row.follower.avatarUrl,
      isFollowing: following.has(row.follower.id),
    })),
    pagination: { page: input.page, limit: input.limit, total },
  };
}

export async function searchUsers(
  viewerId: string,
  input: { q: string; page: number; limit: number },
): Promise<FollowListResponse> {
  const query = input.q.trim();

  if (!query) {
    return { data: [], pagination: { page: input.page, limit: input.limit, total: 0 } };
  }

  const where: Prisma.UserWhereInput = {
    id: { not: viewerId },
    fullName: { contains: query, mode: 'insensitive' },
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SUMMARY_SELECT,
      orderBy: { fullName: 'asc' },
      ...paginate(input),
    }),
    prisma.user.count({ where }),
  ]);

  const following = await resolveFollowingFlag(
    viewerId,
    rows.map((row) => row.id),
  );

  return {
    data: rows.map((row): SocialUserSummary => ({
      id: row.id,
      fullName: row.fullName,
      avatarUrl: row.avatarUrl,
      isFollowing: following.has(row.id),
    })),
    pagination: { page: input.page, limit: input.limit, total },
  };
}

export async function listFollowing(
  viewerId: string,
  targetId: string,
  input: { page: number; limit: number },
): Promise<FollowListResponse> {
  await requireExistingUser(targetId);

  const where: Prisma.UserFollowWhereInput = { followerId: targetId };
  const [rows, total] = await Promise.all([
    prisma.userFollow.findMany({
      where,
      include: FOLLOWING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...paginate(input),
    }),
    prisma.userFollow.count({ where }),
  ]);

  const following = await resolveFollowingFlag(
    viewerId,
    rows.map((row) => row.following.id),
  );

  return {
    data: rows.map((row): SocialUserSummary => ({
      id: row.following.id,
      fullName: row.following.fullName,
      avatarUrl: row.following.avatarUrl,
      isFollowing: following.has(row.following.id),
    })),
    pagination: { page: input.page, limit: input.limit, total },
  };
}