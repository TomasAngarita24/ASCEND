import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getWeekAndDayStartUtc,
  isCurrentUtcDay,
  isCurrentUtcWeek,
} from '../src/modules/progress/week-boundaries';

describe('progress week boundaries (UTC, Monday start)', () => {
  it('anchors a mid-week instant to its UTC Monday 00:00 and UTC day 00:00', () => {
    // Wednesday 2026-09-09 15:30 UTC
    const boundaries = getWeekAndDayStartUtc(new Date('2026-09-09T15:30:00.000Z'));

    assert.equal(boundaries.weekStart.toISOString(), '2026-09-07T00:00:00.000Z');
    assert.equal(boundaries.todayStart.toISOString(), '2026-09-09T00:00:00.000Z');
  });

  it('keeps a Sunday-night workout inside the week that started on the previous Monday', () => {
    // Sunday 2026-09-06 23:59:59 UTC — still before the UTC Monday of 09-07.
    const boundaries = getWeekAndDayStartUtc(new Date('2026-09-06T23:59:59.000Z'));

    // The week that contains Sunday 09-06 begins on Monday 08-31.
    assert.equal(boundaries.weekStart.toISOString(), '2026-08-31T00:00:00.000Z');
    assert.equal(boundaries.todayStart.toISOString(), '2026-09-06T00:00:00.000Z');
  });

  it('treats the exact UTC Monday instant as the start of the new week', () => {
    const boundaries = getWeekAndDayStartUtc(new Date('2026-09-07T00:00:00.000Z'));

    assert.equal(boundaries.weekStart.toISOString(), '2026-09-07T00:00:00.000Z');
    assert.equal(boundaries.todayStart.toISOString(), '2026-09-07T00:00:00.000Z');
  });

  it('always returns UTC midnight on a Monday for the week start', () => {
    const samples = [
      '2026-01-03T22:10:00.000Z',
      '2026-02-09T08:00:00.000Z',
      '2026-06-15T00:00:01.000Z',
      '2026-09-13T23:59:59.000Z',
      '2026-12-31T06:30:00.000Z',
    ];

    for (const sample of samples) {
      const { weekStart, todayStart } = getWeekAndDayStartUtc(new Date(sample));
      assert.equal(weekStart.getUTCDay(), 1, `${sample}: week starts on a Monday`);
      assert.equal(weekStart.getUTCHours() + weekStart.getUTCMinutes() + weekStart.getUTCSeconds(), 0, `${sample}: week starts at UTC midnight`);
      assert.equal(todayStart.getUTCHours() + todayStart.getUTCMinutes() + todayStart.getUTCSeconds(), 0, `${sample}: day starts at UTC midnight`);
    }
  });

  it('classifies workouts relative to the UTC week/day boundaries', () => {
    const now = new Date('2026-09-09T18:00:00.000Z'); // Wednesday
    const mondayLate = new Date('2026-09-07T23:00:00.000Z');
    const sundayBeforeWeek = new Date('2026-09-06T23:59:59.000Z');
    const earlyToday = new Date('2026-09-09T00:00:00.000Z');
    const yesterday = new Date('2026-09-08T23:59:59.999Z');

    assert.equal(isCurrentUtcWeek(mondayLate, now), true);
    assert.equal(isCurrentUtcWeek(sundayBeforeWeek, now), false);
    assert.equal(isCurrentUtcDay(earlyToday, now), true);
    assert.equal(isCurrentUtcDay(yesterday, now), false);
  });

  it('rejects future dates outside the current week and day', () => {
    const now = new Date('2026-09-09T18:00:00.000Z'); // Wednesday
    const nextMonday = new Date('2026-09-14T00:00:01.000Z');
    const nextTuesday = new Date('2026-09-15T12:00:00.000Z');
    const tomorrow = new Date('2026-09-10T00:00:00.000Z');
    const nextWeekWednesday = new Date('2026-09-16T09:00:00.000Z');

    assert.equal(isCurrentUtcWeek(nextMonday, now), false);
    assert.equal(isCurrentUtcWeek(nextWeekWednesday, now), false);
    assert.equal(isCurrentUtcDay(tomorrow, now), false);
    assert.equal(isCurrentUtcDay(nextTuesday, now), false);
  });
});