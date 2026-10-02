import { HttpError } from './middleware/errors.js';
import { PRIORITIES, STATUSES } from './models/Task.js';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Whitelists task fields so clients can't mass-assign server-owned fields (user, completedAt, ...).
export function parseTaskInput(body, { partial = false } = {}) {
  const input = isObject(body) ? body : {};
  const out = {};

  if (!partial || 'title' in input) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title || title.length > 140) throw new HttpError(400, 'Title is required (max 140 characters)');
    out.title = title;
  }

  if ('description' in input) {
    if (typeof input.description !== 'string' || input.description.length > 2000) {
      throw new HttpError(400, 'Description must be text (max 2000 characters)');
    }
    out.description = input.description;
  }

  if ('status' in input) {
    if (!STATUSES.includes(input.status)) throw new HttpError(400, 'Invalid status');
    out.status = input.status;
  }

  if ('priority' in input) {
    if (!PRIORITIES.includes(input.priority)) throw new HttpError(400, 'Invalid priority');
    out.priority = input.priority;
  }

  if ('tags' in input) {
    if (!Array.isArray(input.tags)) throw new HttpError(400, 'Tags must be a list');
    out.tags = [
      ...new Set(
        input.tags
          .filter((tag) => typeof tag === 'string')
          .map((tag) => tag.trim().toLowerCase().slice(0, 24))
          .filter(Boolean),
      ),
    ].slice(0, 8);
  }

  for (const key of ['dueAt', 'remindAt']) {
    if (!(key in input)) continue;
    if (input[key] === null || input[key] === '') {
      out[key] = null;
    } else {
      const date = new Date(input[key]);
      if (Number.isNaN(date.getTime())) throw new HttpError(400, `Invalid date for ${key}`);
      out[key] = date;
    }
  }

  if ('estimateMins' in input) {
    const mins = Number(input.estimateMins);
    if (!Number.isFinite(mins) || mins < 5 || mins > 600) throw new HttpError(400, 'Estimate must be 5–600 minutes');
    out.estimateMins = Math.round(mins);
  }

  if ('reminded' in input) out.reminded = Boolean(input.reminded);

  return out;
}

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseClock(value, fallback) {
  return typeof value === 'string' && CLOCK_RE.test(value) ? value : fallback;
}

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Partial profile update: name, IANA timezone and working hours. */
export function parseProfileInput(body) {
  const input = isObject(body) ? body : {};
  const out = {};
  if ('name' in input) {
    const name = String(input.name ?? '').trim();
    if (!name || name.length > 60) throw new HttpError(400, 'Please enter your name (max 60 characters)');
    out.name = name;
  }
  if ('timezone' in input) {
    if (!isValidTimeZone(input.timezone)) throw new HttpError(400, 'Unknown time zone');
    out.timezone = input.timezone;
  }
  for (const key of ['workStart', 'workEnd']) {
    if (key in input) {
      if (typeof input[key] !== 'string' || !CLOCK_RE.test(input[key])) throw new HttpError(400, 'Working hours must be HH:MM');
      out[key] = input[key];
    }
  }
  if (!Object.keys(out).length) throw new HttpError(400, 'Nothing to update');
  return out;
}
