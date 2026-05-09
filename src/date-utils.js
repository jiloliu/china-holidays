const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateString(date) {
  if (!DATE_RE.test(date)) {
    throw new Error(`Invalid date: ${date}`);
  }

  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  const normalized = [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0")
  ].join("-");

  if (normalized !== date) {
    throw new Error(`Invalid date: ${date}`);
  }
}

export function compactDate(date) {
  assertDateString(date);
  return date.replaceAll("-", "");
}

export function addDays(date, days) {
  assertDateString(date);
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function dateRange(start, end) {
  assertDateString(start);
  assertDateString(end);

  const dates = [];
  let current = start;
  while (current <= end) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function dayOfWeek(date) {
  assertDateString(date);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isWeekend(date) {
  const day = dayOfWeek(date);
  return day === 0 || day === 6;
}

export function shanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
