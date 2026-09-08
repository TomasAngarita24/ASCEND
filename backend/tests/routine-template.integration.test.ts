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
  const email = `routine-template.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated routine template test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  return response.body.accessToken as string;
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

describe('routine templates', () => {
  it('lists templates, applies filters and returns a detail with exercises', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const exercise = await request('/exercises', {
      body: JSON.stringify({ name: `Template exercise ${randomUUID()}`, targetMuscleGroups: ['Pecho'] }),
      headers,
      method: 'POST',
    });
    assert.equal(exercise.status, 201);
    const customExercise = exercise.body.exercise as Record<string, string>;
    const exerciseId = customExercise.id;

    const template = await prisma.routineTemplate.create({
      data: {
        slug: `template-${randomUUID()}`,
        name: 'Empuje de prueba',
        description: 'Template de integración',
        level: 'beginner',
        goal: 'hypertrophy',
        equipment: 'Barra',
        exercises: {
          create: [
            { exerciseId, exerciseName: 'Press de banca', position: 1, targetSets: 3, targetRepetitionsMin: 8, targetRepetitionsMax: 12, restSeconds: 90 },
            { exerciseId, exerciseName: 'Press militar con barra', position: 2, targetSets: 3, targetRepetitionsMin: 8, targetRepetitionsMax: 10, restSeconds: 90 },
          ],
        },
      },
      select: { id: true, slug: true },
    });

    const listed = await request('/routine-templates', { headers });
    assert.equal(listed.status, 200);
    const allTemplates = (listed.body.data as Array<Record<string, unknown>>);
    assert.ok(allTemplates.some((item) => item.slug === template.slug));
    assert.ok(allTemplates.every((item) => (item.exerciseCount as number) > 0));

    const filtered = await request('/routine-templates?level=beginner&equipment=Barra', { headers });
    assert.equal(filtered.status, 200);
    const filteredTemplates = filtered.body.data as Array<Record<string, unknown>>;
    assert.ok(filteredTemplates.some((item) => item.slug === template.slug));
    for (const item of filteredTemplates) {
      assert.equal(item.level, 'beginner');
      assert.equal(item.equipment, 'Barra');
    }

    const detail = await request(`/routine-templates/${template.id}`, { headers });
    assert.equal(detail.status, 200);
    const detailTemplate = detail.body.template as Record<string, unknown>;
    assert.equal(detailTemplate.id, template.id);
    const exercises = detailTemplate.exercises as Array<Record<string, unknown>>;
    assert.equal(exercises.length, 2);
    assert.equal((exercises[0].exercise as Record<string, string>).name, customExercise.name);
    assert.equal((exercises[0] as Record<string, number>).targetSets, 3);
  });

  it('rejects invalid filters', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}` };

    const response = await request('/routine-templates?level=expert', { headers });
    assert.equal(response.status, 400);
    assert.equal((response.body.error as Record<string, string>).code, 'VALIDATION_ERROR');
  });

  it('creates a routine from a template', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const exercise = await request('/exercises', {
      body: JSON.stringify({ name: `Template add exercise ${randomUUID()}`, targetMuscleGroups: ['Dorsal'] }),
      headers,
      method: 'POST',
    });
    assert.equal(exercise.status, 201);
    const customExercise = exercise.body.exercise as Record<string, string>;
    const exerciseId = customExercise.id;

    const template = await prisma.routineTemplate.create({
      data: {
        slug: `template-add-${randomUUID()}`,
        name: 'Espalda de prueba',
        description: 'Para añadir',
        level: 'beginner',
        goal: 'general',
        equipment: 'Barra',
        exercises: {
          create: [
            { exerciseId, exerciseName: 'Remo con barra', position: 1, targetSets: 4, targetRepetitionsMin: 8, targetRepetitionsMax: 12, restSeconds: 120 },
          ],
        },
      },
      select: { id: true },
    });

    const added = await request(`/routine-templates/${template.id}/add`, { headers, method: 'POST' });
    assert.equal(added.status, 201);
    const routine = added.body.routine as Record<string, unknown>;
    assert.equal(routine.name, 'Espalda de prueba');
    const routineExercises = routine.exercises as Array<Record<string, unknown>>;
    assert.equal(routineExercises.length, 1);
    assert.equal((routineExercises[0].exercise as Record<string, string>).name, customExercise.name);
    assert.equal(routineExercises[0].targetSets, 4);

    const fetched = await request(`/routines/${routine.id}`, { headers });
    assert.equal(fetched.status, 200);
    const fetchedRoutine = fetched.body.routine as Record<string, unknown>;
    assert.equal((fetchedRoutine.exercises as Array<unknown>).length, 1);
  });

  it('returns 404 for an unknown template', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}` };

    const response = await request('/routine-templates/00000000-0000-4000-8000-000000000000/add', { headers, method: 'POST' });
    assert.equal(response.status, 404);
    assert.equal((response.body.error as Record<string, string>).code, 'ROUTINE_TEMPLATE_NOT_FOUND');
  });
});