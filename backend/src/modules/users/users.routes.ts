import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import { getUserPosts } from '../social/social.service';
import {
  followUser, getPublicProfile, getUserPublicRoutines, listFollowers, listFollowing, searchUsers, unfollowUser,
} from './users.service';
import { validateListQuery, validateSearchQuery, validateUserId } from './users.validation';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/search', asyncHandler(async (request, response) => {
  response.status(200).json(await searchUsers(request.auth!.userId, validateSearchQuery(request.query)));
}));

usersRouter.get('/:userId/posts', asyncHandler(async (request, response) => {
  const userId = validateUserId(request.params.userId);
  response.status(200).json(await getUserPosts(request.auth!.userId, userId, validateListQuery(request.query)));
}));

usersRouter.get('/:userId/public-routines', asyncHandler(async (request, response) => {
  const userId = validateUserId(request.params.userId);
  response.status(200).json(await getUserPublicRoutines(userId));
}));

usersRouter.get('/:userId/profile', asyncHandler(async (request, response) => {
  const userId = validateUserId(request.params.userId);
  response.status(200).json(await getPublicProfile(request.auth!.userId, userId));
}));

usersRouter.get('/:userId/followers', asyncHandler(async (request, response) => {
  const userId = validateUserId(request.params.userId);
  response.status(200).json(await listFollowers(request.auth!.userId, userId, validateListQuery(request.query)));
}));

usersRouter.get('/:userId/following', asyncHandler(async (request, response) => {
  const userId = validateUserId(request.params.userId);
  response.status(200).json(await listFollowing(request.auth!.userId, userId, validateListQuery(request.query)));
}));

usersRouter.post('/:userId/follow', asyncHandler(async (request, response) => {
  const userId = validateUserId(request.params.userId);
  response.status(200).json(await followUser(request.auth!.userId, userId));
}));

usersRouter.delete('/:userId/follow', asyncHandler(async (request, response) => {
  const userId = validateUserId(request.params.userId);
  response.status(200).json(await unfollowUser(request.auth!.userId, userId));
}));