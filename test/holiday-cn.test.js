import assert from "node:assert/strict";
import test from "node:test";
import { fetchHolidayCnYear, holidayCnToSchedule, loadYearData } from "../src/holiday-cn.js";
import { createCalendarFromYearData } from "../src/ics.js";

const payload2026 = {
  year: 2026,
  papers: ["https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm"],
  days: [
    { name: "元旦", date: "2026-01-01", isOffDay: true },
    { name: "元旦", date: "2026-01-02", isOffDay: true },
    { name: "元旦", date: "2026-01-03", isOffDay: true },
    { name: "元旦", date: "2026-01-04", isOffDay: false },
    { name: "劳动节", date: "2026-05-01", isOffDay: true },
    { name: "劳动节", date: "2026-05-02", isOffDay: true },
    { name: "劳动节", date: "2026-05-09", isOffDay: false }
  ]
};

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init
  });
}

test("converts holiday-cn days into grouped holidays and adjusted workdays", () => {
  const schedule = holidayCnToSchedule(payload2026);

  assert.deepEqual(schedule.holidays, [
    { name: "元旦", start: "2026-01-01", end: "2026-01-03" },
    { name: "劳动节", start: "2026-05-01", end: "2026-05-02" }
  ]);
  assert.deepEqual(schedule.workdays, [
    { name: "元旦调休上班", date: "2026-01-04" },
    { name: "劳动节调休上班", date: "2026-05-09" }
  ]);
});

test("fetches holiday-cn JSON with source metadata", async () => {
  const yearData = await fetchHolidayCnYear(2026, {
    fetchImpl: async () => jsonResponse(payload2026)
  });

  assert.equal(yearData.year, 2026);
  assert.equal(yearData.dataSource, "holiday-cn");
  assert.equal(yearData.available, true);
  assert.equal(yearData.source.publisher, "NateScarlet/holiday-cn");
  assert.equal(yearData.source.papers[0], "https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm");
});

test("falls back to local data when the dynamic source is unavailable", async () => {
  const yearData = await loadYearData(2026, {
    fetchImpl: async () => new Response("nope", { status: 503 })
  });

  assert.equal(yearData.dataSource, "static-fallback");
  assert.equal(yearData.available, true);
  assert.equal(yearData.schedule.holidays[0].name, "元旦");
  assert.match(yearData.error, /HTTP 503/);
});

test("creates ICS from dynamic year data", async () => {
  const yearData = await fetchHolidayCnYear(2026, {
    fetchImpl: async () => jsonResponse(payload2026)
  });
  const calendar = createCalendarFromYearData([yearData]);

  assert.match(calendar, /SUMMARY:元旦\(休\)/);
  assert.match(calendar, /SUMMARY:元旦\(班\)/);
  assert.match(calendar, /DTSTART;VALUE=DATE:20260102/);
  assert.match(calendar, /DTEND;VALUE=DATE:20260103/);
  assert.match(calendar, /NateScarlet\/holiday-cn/);
});
