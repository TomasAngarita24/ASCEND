import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

import { app } from '../src/app';
import { prisma } from '../src/database/prisma';

interface ApiResponse {
  body: Record<string, unknown>;
  status: number;
}

let baseUrl: string;
let server: Server;
const testEmails = new Set<string>();

async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? {} : await response.json() as Record<string, unknown>;
  return { body, status: response.status };
}

async function registerAndGetAccessToken(): Promise<string> {
  const email = `comments.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated comments test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  return response.body.accessToken as string;
}

async function shareAWorkout(accessToken: string): Promise<string> {
  const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
  const exercise = await request('/exercises', {
    body: JSON.stringify({ name: `Comments exercise ${randomUUID()}`, targetMuscleGroups: ['Chest'] }),
    headers,
    method: 'POST',
  });
  const exerciseId = (exercise.body.exercise as Record<string, string>).id;

  const started = await request('/workouts', { body: '{}', headers, method: 'POST' });
  const workoutId = (started.body.workout as Record<string, string>).id;

  const addedEx = await request(`/workouts/${workoutId}/exercises`, {
    body: JSON.stringify({ exerciseId }), headers, method: 'POST',
  });
  const workoutExerciseId = (addedEx.body.workoutExercise as Record<string, string>).id;

  const set = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`, {
    body: JSON.stringify({ weight: 60, repetitions: 10, isCompleted: true }), headers, method: 'POST',
  });
  assert.equal(set.status, 201);

  const completed = await request(`/workouts/${workoutId}/complete`, { headers, method: 'POST' });
  assert.equal(completed.status, 200);

  const shared = await request(`/workouts/${workoutId}/share`, { body: '{}', headers, method: 'POST' });
  assert.equal(shared.status, 201);
  return (shared.body.post as Record<string, string>).id;
}

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (testEmails.size > 0) {
    await prisma.user.deleteMany({ where: { email: { in: [...testEmails] } } });
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
});

describe('post comments', () => {
  it('adds comments, reflects the count in the feed, and paginates the thread', async () => {
    const author = await registerAndGetAccessToken();
    const commenterA = await registerAndGetAccessToken();
    const commenterB = await registerAndGetAccessToken();
    const postId = await shareAWorkout(commenterA);

    const first = await request(`/social/posts/${postId}/comments`, {
      body: JSON.stringify({ body: '¡Gran sesión de pecho!' }),
      headers: { authorization: `Bearer ${commenterB}`, 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(first.status, 201);
    const firstComment = first.body.comment as Record<string, unknown>;
    assert.equal(firstComment.body, '¡Gran sesión de pecho!');
    assert.equal(firstComment.postId, postId);

    const second = await request(`/social/posts/${postId}/comments`, {
      body: JSON.stringify({ body: 'Gracias por compartir' }),
      headers: { authorization: `Bearer ${author}`, 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(second.status, 201);

    const feed = await request('/social/feed', {
      headers: { authorization: `Bearer ${commenterB}` },
    });
    const feedPost = (feed.body.data as Array<Record<string, unknown>>).find((p) => p.id === postId);
    assert.equal((feedPost as Record<string, unknown>).commentCount, 2);

    const page1 = await request(`/social/posts/${postId}/comments?page=1&limit=1`, {
      headers: { authorization: `Bearer ${commenterB}` },
    });
    assert.equal(page1.status, 200);
    const page1Data = page1.body.data as Array<Record<string, unknown>>;
    assert.equal(page1Data.length, 1);
    assert.equal(page1Data[0].body, '¡Gran sesión de pecho!');
    assert.equal((page1.body.pagination as Record<string, number>).total, 2);

    const page2 = await request(`/social/posts/${postId}/comments?page=2&limit=1`, {
      headers: { authorization: `Bearer ${commenterB}` },
    });
    const page2Data = page2.body.data as Array<Record<string, unknown>>;
    assert.equal(page2Data[0].body, 'Gracias por compartir');
  });

  it('rejects comments on unknown posts and invalid comment bodies', async () => {
    const viewer = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${viewer}`, 'content-type': 'application/json' };
    const unknownId = '00000000-0000-0000-0000-000000000000';

    const unknown = await request(`/social/posts/${unknownId}/comments`, {
      body: JSON.stringify({ body: 'Hola' }), headers, method: 'POST',
    });
    assert.equal(unknown.status, 404);
    assert.equal((unknown.body.error as Record<string, string>).code, 'POST_NOT_FOUND');

    const listUnknown = await request(`/social/posts/${unknownId}/comments`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    assert.equal(listUnknown.status, 404);

    const postId = await shareAWorkout(viewer);
    const empty = await request(`/social/posts/${postId}/comments`, {
      body: JSON.stringify({ body: '   ' }), headers, method: 'POST',
    });
    assert.equal(empty.status, 400);
    assert.equal((empty.body.error as Record<string, string>).code, 'VALIDATION_ERROR');

    const tooLong = await request(`/social/posts/${postId}/comments`, {
      body: JSON.stringify({ body: 'x'.repeat(501) }), headers, method: 'POST',
    });
    assert.equal(tooLong.status, 400);
  });
});