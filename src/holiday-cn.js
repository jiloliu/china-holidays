import { addDays, assertDateString } from "./date-utils.js";
import { getSchedule, getSource } from "./schedule.js";

const CACHE_TTL_SECONDS = 6 * 60 * 60;

export const HOLIDAY_CN_URLS = [
  (year) => `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
  (year) => `https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
  (year) => `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`
];

function assertYear(year) {
  const numericYear = Number(year);
  if (!Number.isInteger(numericYear) || numericYear < 1900 || numericYear > 2100) {
    throw new Error(`Invalid year: ${year}`);
  }
  return numericYear;
}

function normalizeDay(day) {
  if (!day || typeof day !== "object") {
    throw new Error("Invalid holiday-cn day item");
  }
  if (typeof day.name !== "string" || !day.name) {
    throw new Error("Invalid holiday-cn day name");
  }
  if (typeof day.isOffDay !== "boolean") {
    throw new Error("Invalid holiday-cn isOffDay value");
  }
  assertDateString(day.date);

  return {
    name: day.name,
    date: day.date,
    isOffDay: day.isOffDay
  };
}

export function holidayCnToSchedule(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid holiday-cn payload");
  }
  assertYear(payload.year);

  if (!Array.isArray(payload.days)) {
    throw new Error("Invalid holiday-cn days payload");
  }

  const days = payload.days.map(normalizeDay).sort((a, b) => a.date.localeCompare(b.date));
  const holidays = [];
  const workdays = [];

  for (const day of days) {
    if (!day.isOffDay) {
      workdays.push({
        name: `${day.name}调休上班`,
        date: day.date
      });
      continue;
    }

    const current = holidays.at(-1);
    if (current?.name === day.name && addDays(current.end, 1) === day.date) {
      current.end = day.date;
      continue;
    }

    holidays.push({
      name: day.name,
      start: day.date,
      end: day.date
    });
  }

  return { holidays, workdays };
}

export function normalizeHolidayCnYear(payload, url) {
  const year = assertYear(payload?.year);
  const schedule = holidayCnToSchedule(payload);
  const papers = Array.isArray(payload.papers) ? payload.papers.filter((paper) => typeof paper === "string") : [];

  return {
    year,
    schedule,
    source: {
      title: `${year}年中国法定节假日数据`,
      publisher: "NateScarlet/holiday-cn",
      publishedDate: null,
      documentNo: null,
      url,
      papers
    },
    dataSource: "holiday-cn",
    fetchedAt: new Date().toISOString(),
    available: schedule.holidays.length > 0 || schedule.workdays.length > 0
  };
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { accept: "application/json" },
    cf: {
      cacheEverything: true,
      cacheTtl: CACHE_TTL_SECONDS
    }
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchHolidayCnYear(year, { fetchImpl = fetch } = {}) {
  const numericYear = assertYear(year);
  const errors = [];

  for (const makeUrl of HOLIDAY_CN_URLS) {
    const url = makeUrl(numericYear);
    try {
      const payload = await fetchJson(url, fetchImpl);
      return normalizeHolidayCnYear(payload, url);
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(`Unable to fetch holiday-cn ${numericYear}: ${errors.join("; ")}`);
}

function fallbackYearData(year, error = null) {
  const schedule = getSchedule(year);
  if (!schedule) {
    return {
      year,
      schedule: null,
      source: null,
      dataSource: "unavailable",
      error,
      available: false
    };
  }

  return {
    year,
    schedule,
    source: getSource(year),
    dataSource: "static-fallback",
    error,
    available: true
  };
}

export async function loadYearData(year, { fetchImpl = fetch, allowFallback = true } = {}) {
  const numericYear = assertYear(year);

  try {
    const yearData = await fetchHolidayCnYear(numericYear, { fetchImpl });
    if (yearData.available) {
      return yearData;
    }

    if (allowFallback) {
      return fallbackYearData(numericYear);
    }

    return yearData;
  } catch (error) {
    if (allowFallback) {
      return fallbackYearData(numericYear, error.message);
    }

    return {
      year: numericYear,
      schedule: null,
      source: null,
      dataSource: "unavailable",
      error: error.message,
      available: false
    };
  }
}
