import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import {
  addComment, copySharedRoutine, deletePost, getFeed, likePost, listComments, shareRoutine, shareWorkout,
  unlikePost,
} from './social.service';
import {
  validateCreateComment, validateCommentQuery, validateFeedQuery, validatePostId, validateShareWorkout,
} from './social.validation';

export const socialRouter = Router();

socialRouter.use(authenticate);

socialRouter.get('/feed', asyncHandler(async (request, response) => {
  response.status(200).json(await getFeed(request.auth!.userId, validateFeedQuery(request.query)));
}));

socialRouter.post('/posts/:postId/likes', asyncHandler(async (request, response) => {
  await likePost(request.auth!.userId, validatePostId(request.params.postId));
  response.status(204).send();
}));

socialRouter.delete('/posts/:postId/likes', asyncHandler(async (request, response) => {
  await unlikePost(request.auth!.userId, validatePostId(request.params.postId));
  response.status(204).send();
}));

socialRouter.delete('/posts/:postId', asyncHandler(async (request, response) => {
  await deletePost(request.auth!.userId, validatePostId(request.params.postId));
  response.status(204).send();
}));

socialRouter.get('/posts/:postId/comments', asyncHandler(async (request, response) => {
  const postId = validatePostId(request.params.postId);
  response.status(200).json(await listComments(postId, validateCommentQuery(request.query)));
}));

socialRouter.post('/posts/:postId/comments', asyncHandler(async (request, response) => {
  const postId = validatePostId(request.params.postId);
  const input = validateCreateComment(request.body);
  const comment = await addComment(request.auth!.userId, postId, input.body);
  response.status(201).json({ comment });
}));

socialRouter.post('/posts/:postId/copy-routine', asyncHandler(async (request, response) => {
  const postId = validatePostId(request.params.postId);
  response.status(201).json(await copySharedRoutine(request.auth!.userId, postId));
}));

// Contract endpoint living under the workouts resource: POST /workouts/:workoutId/share
export const workoutShareRouter = Router();

workoutShareRouter.use(authenticate);

workoutShareRouter.post('/:workoutId/share', asyncHandler(async (request, response) => {
  const input = validateShareWorkout(request.body);
  const post = await shareWorkout(request.auth!.userId, validatePostId(request.params.workoutId), input.caption, input.imageUrl);
  response.status(201).json({ post });
}));

// Contract endpoint living under the routines resource: POST /routines/:routineId/share
export const routineShareRouter = Router();

routineShareRouter.use(authenticate);

routineShareRouter.post('/:routineId/share', asyncHandler(async (request, response) => {
  const input = validateShareWorkout(request.body);
  const post = await shareRoutine(request.auth!.userId, validatePostId(request.params.routineId), input.caption);
  response.status(201).json({ post });
}));