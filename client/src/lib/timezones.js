// Time-zone helpers for distributed teams. All math is done in "viewer local minutes" (0–1440).

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const ALL_TIME_ZONES = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : ['UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];

const toMinutes = (clock = '09:00') => {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
};

/** Minutes east of UTC for a zone at a given instant (handles DST). */
export function tzOffsetMinutes(timeZone, date = new Date()) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(date)
        .map((p) => [p.type, p.value]),
    );
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return Math.round((asUtc - date.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

export const tzCity = (tz = 'UTC') => tz.split('/').pop().replace(/_/g, ' ');

export function tzShortOffset(tz, date = new Date()) {
  const mins = tzOffsetMinutes(tz, date);
  const sign = mins >= 0 ? '+' : '−';
  const abs = Math.abs(mins);
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}`;
}

export const localTimeIn = (tz, date = new Date()) =>
  date.toLocaleTimeString(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit' });

/** Member's work window expressed in the viewer's local minutes (may fall outside 0–1440). */
export function workWindowLocal(member, date = new Date()) {
  const shift = -date.getTimezoneOffset() - tzOffsetMinutes(member.timezone || 'UTC', date);
  const start = toMinutes(member.workStart) + shift;
  let end = toMinutes(member.workEnd) + shift;
  if (end <= start) end += 1440;
  return [start, end];
}

/** Splits a window into segments that fit inside one 0–1440 day for drawing. */
export function daySegments([start, end]) {
  const norm = ((start % 1440) + 1440) % 1440;
  const length = end - start;
  return norm + length <= 1440 ? [[norm, norm + length]] : [[norm, 1440], [0, norm + length - 1440]];
}

export function isWorkingNow(member, date = new Date()) {
  const local = (date.getUTCHours() * 60 + date.getUTCMinutes() + tzOffsetMinutes(member.timezone || 'UTC', date) + 1440) % 1440;
  const start = toMinutes(member.workStart);
  const end = toMinutes(member.workEnd);
  return start <= end ? local >= start && local < end : local >= start || local < end;
}

/** Availability per 15-minute slot across the viewer's day, plus the best shared window. */
export function overlapSlots(members, date = new Date()) {
  const slots = new Array(96).fill(0);
  members.forEach((m) => {
    daySegments(workWindowLocal(m, date)).forEach(([s, e]) => {
      for (let i = Math.floor(s / 15); i < Math.ceil(e / 15); i++) slots[i]++;
    });
  });

  const max = Math.max(0, ...slots);
  let best = null;
  let runStart = null;
  slots.forEach((count, i) => {
    const hit = max > 0 && count === max;
    if (hit && runStart === null) runStart = i;
    if ((!hit || i === slots.length - 1) && runStart !== null) {
      const end = hit ? i + 1 : i;
      if (!best || end - runStart > best.end - best.start) best = { start: runStart, end };
      runStart = null;
    }
  });

  return { slots, max, best: best && { start: best.start * 15, end: best.end * 15, count: max } };
}

export const clockLabel = (mins) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};
