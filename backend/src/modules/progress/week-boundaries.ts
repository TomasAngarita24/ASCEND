/**
 * Progress aggregation boundaries.
 *
 * All progress endpoints aggregate by UTC calendar weeks that begin on
 * Monday (see also `getWeekStart`). These helpers return the instant that
 * starts the current week and the current day so that boundary checks are
 * identical regardless of the server's local timezone.
 */

export interface WeekAndDayStart {
  weekStart: Date;
  todayStart: Date;
}

export function getWeekAndDayStartUtc(now: Date): WeekAndDayStart {
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return { weekStart, todayStart };
}

/** True when `date` falls within the current UTC week (Monday to Sunday, inclusive of the start). */
export function isCurrentUtcWeek(date: Date, now: Date): boolean {
  const { weekStart } = getWeekAndDayStartUtc(now);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);
  return date >= weekStart && date < nextWeekStart;
}

/** True when `date` falls on the current UTC calendar day. */
export function isCurrentUtcDay(date: Date, now: Date): boolean {
  const { todayStart } = getWeekAndDayStartUtc(now);
  const nextDayStart = new Date(todayStart);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
  return date >= todayStart && date < nextDayStart;
}