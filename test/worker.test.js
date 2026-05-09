import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

const payload2026 = {
  year: 2026,
  papers: ["https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm"],
  days: [
    { name: "元旦", date: "2026-01-01", isOffDay: true },
    { name: "元旦", date: "2026-01-02", isOffDay: true },
    { name: "元旦", date: "2026-01-03", isOffDay: true },
    { name: "元旦", date: "2026-01-04", isOffDay: false }
  ]
};

function installFetchMock(t, payload = payload2026) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" }
    });
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
}

test("day endpoint reads dynamic holiday data", async (t) => {
  installFetchMock(t);

  const response = await worker.fetch(new Request("https://example.test/day.json?date=2026-01-04"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.type, "adjusted_workday");
  assert.equal(body.shouldEnableAlarm, true);
  assert.equal(body.dataSource, "holiday-cn");
});

test("ics endpoint is generated from dynamic holiday data", async (t) => {
  installFetchMock(t);

  const response = await worker.fetch(new Request("https://example.test/china-holidays.ics?year=2026"));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
  assert.match(body, /SUMMARY:元旦\(休\)/);
  assert.match(body, /SUMMARY:元旦\(班\)/);
});
