import { describe, it, expect, beforeEach } from 'vitest';
import { offlineQueue } from '../utils/offlineQueue';

describe('offlineQueue manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty queue', () => {
    expect(offlineQueue.getQueue()).toEqual([]);
  });

it('enqueues an action and assigns an ID and timestamp', () => {
    offlineQueue.enqueue({
      url: 'http://localhost:3000/workouts/w1/exercises/e1/sets/s1',
      method: 'PATCH',
      body: { isCompleted: true, weight: 80, repetitions: 10 },
      description: 'Record set 1',
    });

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].description).toBe('Record set 1');
    expect(queue[0].id).toBeDefined();
    expect(typeof queue[0].timestamp).toBe('number');
  });

  it('saves and restores multiple queued actions', () => {
offlineQueue.enqueue({
      url: 'http://localhost:3000/workouts/w1/sets/1',
      method: 'PATCH',
      description: 'Action 1',
    });
    offlineQueue.enqueue({
      url: 'http://localhost:3000/workouts/w1/sets/2',
      method: 'PATCH',
      description: 'Action 2',
    });

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(2);
    expect(queue[0].description).toBe('Action 1');
    expect(queue[1].description).toBe('Action 2');
  });

  it('replaces consecutive PATCHes to the same URL instead of stacking them', () => {
    const url = 'http://localhost:3000/workouts/w1/exercises/e1/sets/s1';
    offlineQueue.enqueue({ url, method: 'PATCH', body: { weight: 50 }, description: 'Set 50' });
    offlineQueue.enqueue({ url, method: 'PATCH', body: { weight: 55 }, description: 'Set 55' });
    offlineQueue.enqueue({ url, method: 'PATCH', body: { weight: 60 }, description: 'Set 60' });

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].body).toEqual({ weight: 60 });
    expect(queue[0].description).toBe('Set 60');
  });

  it('keeps different operations for the same URL to preserve last-write-wins only for PATCH/PUT', () => {
    const url = 'http://localhost:3000/workouts/w1/exercises/e1/sets/s1';
    offlineQueue.enqueue({ url, method: 'PATCH', body: { weight: 60 }, description: 'Set 60' });
    offlineQueue.enqueue({ url, method: 'DELETE', description: 'Delete set' });

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(2);
  });

  it('clears the entire queue', () => {
    offlineQueue.enqueue({ url: 'http://localhost:3000/x', method: 'PATCH', body: {}, description: 'Op' });
    offlineQueue.clear();
    expect(offlineQueue.getQueue()).toEqual([]);
  });
});
