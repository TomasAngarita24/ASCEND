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
});
