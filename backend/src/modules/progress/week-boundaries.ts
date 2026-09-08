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

/** True when `date` falls on or after the UTC Monday that starts the current week. */
export function isCurrentUtcWeek(date: Date, now: Date): boolean {
  const { weekStart } = getWeekAndDayStartUtc(now);
  return date >= weekStart;
}

/** True when `date` falls on the current UTC calendar day. */
export function isCurrentUtcDay(date: Date, now: Date): boolean {
  const { todayStart } = getWeekAndDayStartUtc(now);
  return date >= todayStart;
}