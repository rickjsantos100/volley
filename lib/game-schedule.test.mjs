import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultGameSchedule, lisbonDateValue, lisbonTimeValue, parseLisbonDateTime, parseGameSchedule } from './game-schedule.ts';

test('date-specific Lisbon conversion regardless of device timezone', (t) => {
  const originalZone = process.env.TZ;
  t.after(() => {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  });
  for (const zone of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
    process.env.TZ = zone;
    for (const day of ['26', '30']) {
      assert.equal(parseLisbonDateTime(`2026-10-${day}T19:00`)?.toISOString(), `2026-10-${day}T19:00:00.000Z`);
    }
    assert.equal(parseLisbonDateTime('2026-07-01T19:00')?.toISOString(), '2026-07-01T18:00:00.000Z');
    assert.equal(parseLisbonDateTime('2026-01-01T19:00')?.toISOString(), '2026-01-01T19:00:00.000Z');
    assert.equal(lisbonDateValue(new Date('2026-07-01T23:30Z')), '2026-07-02');
    assert.equal(lisbonTimeValue(new Date('2026-07-01T18:00Z')), '19:00');
    assert.deepEqual(defaultGameSchedule(new Date('2026-07-01T17:05Z')), { date: '2026-07-01', startTime: '18:30', endTime: '20:30' });
    assert.deepEqual(defaultGameSchedule(new Date('2026-07-01T22:05Z')), { date: '2026-07-02', startTime: '19:00', endTime: '21:00' });
  }
});

test('rejects invalid calendars, malformed input and DST gap/fold', () => {
  for (const value of ['2026-02-29T19:00', '2026-04-31T19:00', '2026-13-01T19:00', '2026-01-01T24:00', '2026-01-01T19:60', '2026-3-01T19:00', '2026-03-29T01:30', '2026-10-25T01:30', null]) {
    assert.equal(parseLisbonDateTime(value), null, String(value));
  }
  assert.ok(parseLisbonDateTime('2028-02-29T19:00'));
});

test('overnight uses next Lisbon day and actual elapsed duration', () => {
  assert.equal(parseGameSchedule('2026-10-26T23:00', '2026-10-26T01:00')?.durationMinutes, 120);
  assert.equal(parseGameSchedule('2026-03-28T23:00', '2026-03-28T03:00')?.durationMinutes, 180);
  assert.equal(parseGameSchedule('2026-10-24T23:00', '2026-10-24T03:00')?.durationMinutes, 300);
  assert.equal(parseGameSchedule('2026-10-26T19:00', '2026-10-26T19:00'), null);
  assert.equal(parseGameSchedule('2026-03-28T23:00', '2026-03-28T01:30'), null);
  assert.equal(parseGameSchedule('2026-10-24T23:00', '2026-10-24T01:30'), null);
});
