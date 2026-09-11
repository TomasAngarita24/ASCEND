import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import { estimateOneRepMax } from '../progress/one-rep-max';
import { nextRoutinePosition } from '../routine/routine.service';
import type {
  CommentsResponse, CopyRoutineResponse, FeedPost, FeedResponse, PostCommentResponse,
} from './social.types';

type PostWithDetails = Prisma.PostGetPayload<{
  include: {
    _count: { select: { likes: true; comments: true } };
    author: { select: { id: true; fullName: true; avatarUrl: true } };
    workout: {
      include: {
        routine: { select: { name: true } };
        workoutExercises: {
          include: {
            exercise: { select: { id: true; name: true; mediaUrl: true } };
            sets: true;
          };
          orderBy: { position: 'asc' };
        };
      };
    };
    routine: {
      include: {
        routineExercises: {
          include: {
            exercise: { select: { id: true; name: true; targetMuscleGroups: true; mediaUrl: true } };
          };
          orderBy: { position: 'asc' };
        };
      };
    };
  };
}>;

const FEED_INCLUDE = {
  _count: { select: { likes: true, comments: true } },
  author: { select: { id: true, fullName: true, avatarUrl: true } },
  workout: {
    include: {
      routine: { select: { name: true } },
      workoutExercises: {
        include: {
          exercise: { select: { id: true, name: true, mediaUrl: true } },
          sets: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  },
  routine: {
    include: {
      routineExercises: {
        include: {
          exercise: { select: { id: true, name: true, targetMuscleGroups: true, mediaUrl: true } },
        },
        orderBy: { position: 'asc' },
      },
    },
  },
} satisfies Prisma.PostInclude;

const COMMENT_INCLUDE = {
  author: { select: { id: true, fullName: true, avatarUrl: true } },
} satisfies Prisma.PostCommentInclude;

type CommentWithAuthor = Prisma.PostCommentGetPayload<{ include: typeof COMMENT_INCLUDE }>;

function toComment(comment: CommentWithAuthor): PostCommentResponse {
  return {
    id: comment.id,
    postId: comment.postId,
    body: comment.body,
    author: {
      id: comment.author.id,
      fullName: comment.author.fullName,
      avatarUrl: comment.author.avatarUrl,
    },
    createdAt: comment.createdAt.toISOString(),
  };
}

function toFeedPost(post: PostWithDetails, likedPostIds: Set<string>): FeedPost {
  const workout = post.workout;
  let totalVolume = 0;
  let durationSeconds = 0;

  if (workout) {
    for (const we of workout.workoutExercises) {
      for (const set of we.sets) {
        if (set.isCompleted) {
          totalVolume += Number(set.weight ?? 0) * (set.repetitions ?? 0);
        }
      }
    }
    if (workout.completedAt) {
      durationSeconds = Math.max(0, Math.round((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000));
    }
  }

  const routine = post.routine;
  let muscleGroups: string[] = [];
  if (routine) {
    for (const re of routine.routineExercises) {
      for (const group of re.exercise.targetMuscleGroups) {
        if (!muscleGroups.includes(group)) {
          muscleGroups.push(group);
        }
      }
    }
  }

  return {
    id: post.id,
    postType: post.postType,
    caption: post.caption,
    imageUrl: post.imageUrl,
    prAchieved: post.prAchieved,
    author: {
      id: post.author.id,
      fullName: post.author.fullName,
      avatarUrl: post.author.avatarUrl,
    },
    workout: workout
      ? {
        id: workout.id,
        routineName: workout.routine?.name ?? null,
        completedAt: workout.completedAt?.toISOString() ?? null,
        durationSeconds,
        totalVolume,
        exercises: workout.workoutExercises.map((we) => ({
          id: we.exercise.id,
          name: we.exercise.name,
          mediaUrl: we.exercise.mediaUrl,
          setsCompleted: we.sets.filter((set) => set.isCompleted).length,
        })),
      }
      : null,
    routine: routine
      ? {
        id: routine.id,
        name: routine.name,
        exerciseCount: routine.routineExercises.length,
        muscleGroups,
      }
      : null,
    likeCount: post._count.likes,
    likedByMe: likedPostIds.has(post.id),
    commentCount: post._count.comments,
    createdAt: post.createdAt.toISOString(),
  };
}

async function fetchPostWithDetails(postId: string): Promise<PostWithDetails> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: FEED_INCLUDE,
  });

  if (!post) {
    throw new HttpError(404, 'POST_NOT_FOUND', 'Post does not exist.');
  }

  return post;
}

interface ExerciseBaselines {
  maxWeight: number;
  maxOneRepMax: number;
}

async function workoutAchievedPR(userId: string, workoutId: string): Promise<boolean> {
  const workouts = await prisma.workout.findMany({
    where: { userId, status: 'completed', id: { not: workoutId } },
    select: {
      workoutExercises: {
        select: {
          exerciseId: true,
          sets: {
            where: { isCompleted: true, weight: { not: null }, repetitions: { not: null } },
            select: { weight: true, repetitions: true },
          },
        },
      },
    },
  });

  const baselines = new Map<string, ExerciseBaselines>();
  for (const workout of workouts) {
    for (const workoutExercise of workout.workoutExercises) {
      const current = baselines.get(workoutExercise.exerciseId) ?? { maxWeight: 0, maxOneRepMax: 0 };
      for (const set of workoutExercise.sets) {
        const weight = Number(set.weight);
        const oneRepMax = estimateOneRepMax(weight, set.repetitions!);
        if (weight > current.maxWeight) current.maxWeight = weight;
        if (oneRepMax > current.maxOneRepMax) current.maxOneRepMax = oneRepMax;
      }
      baselines.set(workoutExercise.exerciseId, current);
    }
  }

  const currentWorkout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      workoutExercises: {
        select: {
          exerciseId: true,
          sets: {
            where: { isCompleted: true, weight: { not: null }, repetitions: { not: null } },
            select: { weight: true, repetitions: true },
          },
        },
      },
    },
  });

  if (!currentWorkout) {
    throw new HttpError(404, 'WORKOUT_NOT_FOUND', 'A completed workout belonging to you is required to share it.');
  }

  for (const workoutExercise of currentWorkout.workoutExercises) {
    const baseline = baselines.get(workoutExercise.exerciseId);
    if (!baseline || (baseline.maxWeight === 0 && baseline.maxOneRepMax === 0)) {
      continue;
    }
    for (const set of workoutExercise.sets) {
      const weight = Number(set.weight);
      const oneRepMax = estimateOneRepMax(weight, set.repetitions!);
      if (weight > baseline.maxWeight || oneRepMax > baseline.maxOneRepMax) {
        return true;
      }
    }
  }

  return false;
}

export async function shareWorkout(userId: string, workoutId: string, caption?: string, imageUrl?: string): Promise<FeedPost> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId, status: 'completed' },
    select: { id: true },
  });

  if (!workout) {
    throw new HttpError(404, 'WORKOUT_NOT_FOUND', 'A completed workout belonging to you is required to share it.');
  }

  const prAchieved = await workoutAchievedPR(userId, workoutId);

  const created = await prisma.post.create({
    data: {
      authorId: userId,
      postType: 'workout',
      workoutId,
      prAchieved,
      ...(caption ? { caption } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    },
    select: { id: true },
  });

  return toFeedPost(await fetchPostWithDetails(created.id), new Set());
}

export async function shareRoutine(userId: string, routineId: string, caption?: string): Promise<FeedPost> {
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, userId },
    select: { id: true },
  });

  if (!routine) {
    throw new HttpError(404, 'ROUTINE_NOT_FOUND', 'A routine belonging to you is required to share it.');
  }

  const created = await prisma.post.create({
    data: {
      authorId: userId,
      postType: 'routine',
      routineId,
      ...(caption ? { caption } : {}),
    },
    select: { id: true },
  });

  return toFeedPost(await fetchPostWithDetails(created.id), new Set());
}

export async function copySharedRoutine(userId: string, postId: string): Promise<CopyRoutineResponse> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { postType: true, routine: { select: { id: true, name: true } } },
  });

  if (!post) {
    throw new HttpError(404, 'POST_NOT_FOUND', 'Post does not exist.');
  }

  if (post.postType !== 'routine' || !post.routine) {
    throw new HttpError(422, 'NOT_A_ROUTINE_POST', 'Only shared routines can be copied.');
  }

  const source = await prisma.routine.findUnique({
    where: { id: post.routine.id },
    include: {
      routineExercises: {
        select: {
          exerciseId: true,
          position: true,
          targetSets: true,
          targetRepetitionsMin: true,
          targetRepetitionsMax: true,
          targetWeight: true,
          restSeconds: true,
          notes: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!source) {
    throw new HttpError(404, 'ROUTINE_NOT_FOUND', 'The shared routine no longer exists.');
  }

  const copy = await prisma.routine.create({
    data: {
      name: `${source.name} (Copy)`,
      userId,
      position: await nextRoutinePosition(userId, null),
      routineExercises: {
        create: source.routineExercises.map((item) => ({
          exerciseId: item.exerciseId,
          position: item.position,
          targetSets: item.targetSets,
          targetRepetitionsMin: item.targetRepetitionsMin,
          targetRepetitionsMax: item.targetRepetitionsMax,
          targetWeight: item.targetWeight,
          restSeconds: item.restSeconds,
          notes: item.notes,
        })),
      },
    },
    select: { id: true, name: true },
  });

  return { routine: copy };
}

export async function getFeed(userId: string, input: { page: number; limit: number }): Promise<FeedResponse> {
  const where: Prisma.PostWhereInput = {
    OR: [
      { postType: 'workout', workout: { is: { status: 'completed' } } },
      { postType: 'routine', routine: { isNot: null } },
    ],
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: FEED_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.post.count({ where }),
  ]);

  const likedRows = await prisma.postLike.findMany({
    where: { userId, postId: { in: posts.map((post) => post.id) } },
    select: { postId: true },
  });
  const likedPostIds = new Set(likedRows.map((row) => row.postId));

  return {
    data: posts.map((post) => toFeedPost(post, likedPostIds)),
    pagination: { page: input.page, limit: input.limit, total },
  };
}

export async function getUserPosts(userId: string, authorId: string, input: { page: number; limit: number }): Promise<FeedResponse> {
  const where: Prisma.PostWhereInput = {
    authorId,
    OR: [
      { postType: 'workout', workout: { is: { status: 'completed' } } },
      { postType: 'routine', routine: { isNot: null } },
    ],
  };

  await requireUserExists(authorId);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: FEED_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.post.count({ where }),
  ]);

  const likedRows = await prisma.postLike.findMany({
    where: { userId, postId: { in: posts.map((post) => post.id) } },
    select: { postId: true },
  });
  const likedPostIds = new Set(likedRows.map((row) => row.postId));

  return {
    data: posts.map((post) => toFeedPost(post, likedPostIds)),
    pagination: { page: input.page, limit: input.limit, total },
  };
}

async function requireUserExists(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User does not exist.');
  }
}

export async function likePost(userId: string, postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });

  if (!post) {
    throw new HttpError(404, 'POST_NOT_FOUND', 'Post does not exist.');
  }

  await prisma.postLike.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId },
    update: {},
  });
}

export async function unlikePost(userId: string, postId: string): Promise<void> {
  await prisma.postLike.deleteMany({ where: { postId, userId } });
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  const post = await prisma.post.findFirst({ where: { id: postId, authorId: userId }, select: { id: true } });

  if (!post) {
    throw new HttpError(404, 'POST_NOT_FOUND', 'Post does not exist or is not yours.');
  }

  await prisma.post.delete({ where: { id: post.id } });
}

async function requirePostExists(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });

  if (!post) {
    throw new HttpError(404, 'POST_NOT_FOUND', 'Post does not exist.');
  }
}

export async function listComments(
  postId: string,
  input: { page: number; limit: number },
): Promise<CommentsResponse> {
  await requirePostExists(postId);

  const where: Prisma.PostCommentWhereInput = { postId };
  const [rows, total] = await Promise.all([
    prisma.postComment.findMany({
      where,
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.postComment.count({ where }),
  ]);

  return {
    data: rows.map(toComment),
    pagination: { page: input.page, limit: input.limit, total },
  };
}

export async function addComment(userId: string, postId: string, body: string): Promise<PostCommentResponse> {
  await requirePostExists(postId);

  const created = await prisma.postComment.create({
    data: { postId, authorId: userId, body },
    select: { id: true },
  });

  const comment = await prisma.postComment.findUniqueOrThrow({
    where: { id: created.id },
    include: COMMENT_INCLUDE,
  });

  return toComment(comment);
}