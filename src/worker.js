import { createCalendarFromYearData } from "./ics.js";
import { shanghaiDate } from "./date-utils.js";
import { loadYearData } from "./holiday-cn.js";
import { getDayStatusFromYearData, hasScheduleData, supportedYears } from "./schedule.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300"
};

const ICS_HEADERS = {
  "content-type": "text/calendar; charset=utf-8",
  "content-disposition": 'inline; filename="china-holidays.ics"',
  "cache-control": "public, max-age=3600"
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers ?? {})
    }
  });
}

function text(body, init = {}) {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
      ...(init.headers ?? {})
    }
  });
}

function parseYear(searchParams) {
  const year = searchParams.get("year");
  if (!year) {
    return null;
  }
  if (!/^\d{4}$/.test(year)) {
    throw new Error("year must be a four digit year, for example 2026");
  }
  return Number(year);
}

function parseDate(searchParams) {
  const date = searchParams.get("date") ?? shanghaiDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date must use YYYY-MM-DD, for example 2026-10-01");
  }
  return date;
}

function defaultCalendarYears() {
  const year = Number(shanghaiDate().slice(0, 4));
  return [year - 1, year, year + 1];
}

async function loadCalendarYears(year) {
  const years = year ? [year] : defaultCalendarYears();
  const yearData = await Promise.all(years.map((item) => loadYearData(item)));
  return {
    requestedYears: years,
    available: yearData.filter((item) => hasScheduleData(item.schedule)),
    unavailable: yearData.filter((item) => !hasScheduleData(item.schedule))
  };
}

function home(url) {
  const origin = url.origin;
  return text(
    [
      "China Holidays Worker",
      "",
      "Data source: dynamic holiday-cn JSON with local fallback",
      `ICS: ${origin}/china-holidays.ics`,
      `ICS by year: ${origin}/china-holidays.ics?year=2026`,
      `Today JSON: ${origin}/today.json`,
      `Date JSON: ${origin}/day.json?date=2026-10-01`,
      `Year JSON: ${origin}/year.json?year=2026`,
      "",
      `Static fallback years: ${supportedYears().join(", ")}`
    ].join("\n")
  );
}

async function handleRequest(request) {
  const url = new URL(request.url);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return text("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  if (url.pathname === "/" || url.pathname === "/index.txt") {
    return home(url);
  }

  if (url.pathname === "/healthz") {
    return text("ok");
  }

  if (url.pathname === "/china-holidays.ics" || url.pathname === "/holidays.ics") {
    try {
      const year = parseYear(url.searchParams);
      const calendarYears = await loadCalendarYears(year);
      if (calendarYears.available.length === 0) {
        return json(
          {
            error: "No holiday data available",
            requestedYears: calendarYears.requestedYears,
            unavailable: calendarYears.unavailable.map((item) => ({
              year: item.year,
              dataSource: item.dataSource,
              error: item.error ?? null
            }))
          },
          { status: year ? 404 : 503 }
        );
      }

      return new Response(createCalendarFromYearData(calendarYears.available), { headers: ICS_HEADERS });
    } catch (error) {
      return json({ error: error.message, supportedYears: supportedYears() }, { status: 400 });
    }
  }

  if (url.pathname === "/today.json" || url.pathname === "/day.json") {
    try {
      const date = parseDate(url.searchParams);
      const yearData = await loadYearData(Number(date.slice(0, 4)));
      return json(getDayStatusFromYearData(date, yearData));
    } catch (error) {
      return json({ error: error.message }, { status: 400 });
    }
  }

  if (url.pathname === "/year.json") {
    try {
      const year = parseYear(url.searchParams) ?? Number(shanghaiDate().slice(0, 4));
      const yearData = await loadYearData(year);
      if (!hasScheduleData(yearData.schedule)) {
        return json(
          {
            error: `No holiday data available for ${year}`,
            year,
            dataSource: yearData.dataSource,
            sourceError: yearData.error ?? null,
            staticFallbackYears: supportedYears()
          },
          { status: 404 }
        );
      }
      return json({
        year,
        ...yearData.schedule,
        source: yearData.source,
        dataSource: yearData.dataSource,
        sourceError: yearData.error ?? null,
        fetchedAt: yearData.fetchedAt ?? null
      });
    } catch (error) {
      return json({ error: error.message }, { status: 400 });
    }
  }

  return json(
    {
      error: "Not found",
      routes: ["/china-holidays.ics", "/today.json", "/day.json?date=YYYY-MM-DD", "/year.json?year=YYYY"]
    },
    { status: 404 }
  );
}

export default {
  fetch: handleRequest
};
