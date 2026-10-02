const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const PRIORITY_TOKENS = {
  '!urgent': 'urgent', '!u': 'urgent', '!!!': 'urgent',
  '!high': 'high', '!h': 'high', '!!': 'high',
  '!medium': 'medium', '!med': 'medium', '!m': 'medium',
  '!low': 'low', '!l': 'low',
};

/**
 * Natural-language quick add, e.g. "Finish report tomorrow 5pm #work !high ~45m".
 * Returns the cleaned title plus any parsed tags, priority, due date and estimate.
 */
export function parseQuickAdd(input, now = new Date()) {
  let text = ` ${input} `;
  const out = { tags: [], priority: null, dueAt: null, estimateMins: null };

  text = text.replace(/\s#([\p{L}\d_-]{1,24})(?=\s)/gu, (_, tag) => {
    if (!out.tags.includes(tag.toLowerCase())) out.tags.push(tag.toLowerCase());
    return ' ';
  });

  text = text.replace(/\s(!urgent|!high|!medium|!med|!low|!!!|!!|!u|!h|!m|!l)(?=\s)/gi, (_, token) => {
    out.priority = PRIORITY_TOKENS[token.toLowerCase()];
    return ' ';
  });

  text = text.replace(/\s~(\d+(?:\.\d+)?)\s?(m|min|mins|h|hr|hrs)(?=\s)/gi, (_, n, unit) => {
    const value = parseFloat(n);
    out.estimateMins = Math.round(unit.toLowerCase().startsWith('h') ? value * 60 : value);
    return ' ';
  });

  let day = null;
  let defaultHour = 18;

  text = text.replace(/\s(today|tonight|tomorrow|tmrw|tmr)(?=\s)/i, (_, word) => {
    day = new Date(now);
    const w = word.toLowerCase();
    if (w.startsWith('tm') || w === 'tomorrow') day.setDate(day.getDate() + 1);
    if (w === 'tonight') defaultHour = 21;
    return ' ';
  });

  if (!day) {
    text = text.replace(/\s(?:on\s|next\s)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)(?=\s)/i, (_, word) => {
      const target = WEEKDAYS.findIndex((d) => d.startsWith(word.toLowerCase().slice(0, 3)));
      day = new Date(now);
      day.setDate(day.getDate() + ((target - now.getDay() + 7) % 7 || 7));
      return ' ';
    });
  }

  if (!day) {
    text = text.replace(/\sin\s(\d{1,2})\s?(days?|d)(?=\s)/i, (_, n) => {
      day = new Date(now);
      day.setDate(day.getDate() + Number(n));
      return ' ';
    });
  }

  let hour = null;
  let minute = 0;
  text = text.replace(/\s(?:at\s)?(\d{1,2})(?::([0-5]\d))?\s?(am|pm)(?=\s)/i, (_, h, m, meridiem) => {
    hour = (Number(h) % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
    minute = Number(m || 0);
    return ' ';
  });
  if (hour === null) {
    text = text.replace(/\s(?:at\s)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (_, h, m) => {
      hour = Number(h);
      minute = Number(m);
      return ' ';
    });
  }

  if (day || hour !== null) {
    const due = new Date(day ?? now);
    due.setHours(hour ?? defaultHour, hour !== null ? minute : 0, 0, 0);
    if (!day && due < now) due.setDate(due.getDate() + 1);
    out.dueAt = due.toISOString();
  }

  return { title: text.replace(/\s+/g, ' ').trim(), ...out };
}
