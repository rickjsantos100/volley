const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function parts(date: Date) {
  return Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
}

export function lisbonDateValue(date: Date) {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function lisbonTimeValue(date: Date) {
  const p = parts(date);
  return `${p.hour}:${p.minute}`;
}

function calendarMilliseconds(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value ? date.getTime() : null;
}

/** Resolve a wall time only when it maps to exactly one instant (no DST gap/fold). */
export function parseLisbonDateTime(value: unknown): Date | null {
  const wall = calendarMilliseconds(value);
  if (wall === null) return null;
  // Discover date-specific offsets on either side of any nearby DST transition.
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const instant = new Date(wall + delta);
    const local = `${lisbonDateValue(instant)}T${lisbonTimeValue(instant)}`;
    const localMilliseconds = calendarMilliseconds(local);
    if (localMilliseconds !== null) offsets.add(localMilliseconds - instant.getTime());
  }
  const matches = [...offsets].map(offset => new Date(wall - offset)).filter(date =>
    `${lisbonDateValue(date)}T${lisbonTimeValue(date)}` === value);
  return matches.length === 1 ? matches[0] : null;
}

export function parseGameSchedule(start: unknown, end: unknown) {
  const startWall = calendarMilliseconds(start);
  let endWall = calendarMilliseconds(end);
  if (startWall === null || endWall === null) return null;
  // The UI has a single date: an earlier end time means the following day.
  if (endWall < startWall && String(start).slice(0, 10) === String(end).slice(0, 10)) endWall += 86400000;
  const startsAt = parseLisbonDateTime(start);
  const endsAt = parseLisbonDateTime(new Date(endWall).toISOString().slice(0, 16));
  if (!startsAt || !endsAt) return null;
  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60000;
  return Number.isInteger(durationMinutes) && durationMinutes > 0 ? { startsAt, endsAt, durationMinutes } : null;
}

export function defaultGameSchedule(now = new Date()) {
  const start = new Date(Math.floor(now.getTime() / 1800000) * 1800000 + 1800000);
  const end = new Date(start.getTime() + 7200000);
  if (lisbonDateValue(start) !== lisbonDateValue(end)) {
    return { date: lisbonDateValue(end), startTime: "19:00", endTime: "21:00" };
  }
  return { date: lisbonDateValue(start), startTime: lisbonTimeValue(start), endTime: lisbonTimeValue(end) };
}
