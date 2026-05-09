import assert from "node:assert/strict";
import test from "node:test";
import { createCalendar } from "../src/ics.js";
import { getDayStatus, supportedYears } from "../src/schedule.js";

test("supports the official 2026 holiday schedule", () => {
  assert.deepEqual(supportedYears(), [2026]);
});

test("marks 2026 official holidays as non-workdays", () => {
  assert.equal(getDayStatus("2026-01-01").type, "holiday");
  assert.equal(getDayStatus("2026-01-01").shouldEnableAlarm, false);
  assert.equal(getDayStatus("2026-02-23").type, "holiday");
  assert.equal(getDayStatus("2026-02-23").shouldEnableAlarm, false);
  assert.equal(getDayStatus("2026-10-01").type, "holiday");
  assert.equal(getDayStatus("2026-10-01").shouldEnableAlarm, false);
});

test("marks adjusted rest-day workdays as workdays", () => {
  for (const date of ["2026-01-04", "2026-02-14", "2026-02-28", "2026-05-09", "2026-09-20", "2026-10-10"]) {
    const status = getDayStatus(date);
    assert.equal(status.type, "adjusted_workday", date);
    assert.equal(status.shouldEnableAlarm, true, date);
  }
});

test("falls back to normal weekdays and weekends inside supported years", () => {
  assert.equal(getDayStatus("2026-05-06").type, "weekday");
  assert.equal(getDayStatus("2026-05-06").shouldEnableAlarm, true);
  assert.equal(getDayStatus("2026-05-10").type, "weekend");
  assert.equal(getDayStatus("2026-05-10").shouldEnableAlarm, false);
});

test("does not guess workday status for unsupported years", () => {
  const status = getDayStatus("2027-01-01");
  assert.equal(status.supported, false);
  assert.equal(status.shouldEnableAlarm, null);
});

test("rejects impossible calendar dates", () => {
  assert.throws(() => getDayStatus("2026-02-30"), /Invalid date/);
});

test("generates a valid iCalendar feed", () => {
  const calendar = createCalendar({ year: 2026 });
  assert.match(calendar, /^BEGIN:VCALENDAR\r\n/);
  assert.match(calendar, /SUMMARY:元旦\(休\)/);
  assert.match(calendar, /SUMMARY:元旦\(班\)/);
  assert.match(calendar, /DTSTART;VALUE=DATE:20260101/);
  assert.match(calendar, /DTEND;VALUE=DATE:20260102/);
  assert.match(calendar, /DTSTART;VALUE=DATE:20260102/);
  assert.match(calendar, /DTEND;VALUE=DATE:20260103/);
  assert.match(calendar, /END:VCALENDAR\r\n$/);
});
