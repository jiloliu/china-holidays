import { CALENDAR_NAME } from "./holidays.js";
import { addDays, compactDate, dateRange } from "./date-utils.js";
import { getSchedule, getSource, supportedYears } from "./schedule.js";

const encoder = new TextEncoder();

function escapeText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function foldLine(line) {
  const chunks = [];
  let current = "";

  for (const char of line) {
    if (encoder.encode(current + char).length > 72) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }

  chunks.push(current);
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join("\r\n");
}

function makeUid(parts) {
  return `${parts.join("-")}@china-holidays.worker`;
}

function formatSourceDescription(source) {
  if (!source) {
    return "数据来源未知";
  }

  return [
    source.title,
    source.publisher,
    source.documentNo,
    source.url,
    ...(source.papers ?? [])
  ]
    .filter(Boolean)
    .join("；");
}

function holidaySummary(name) {
  return `${name}(休)`;
}

function workdaySummary(name) {
  return `${name.replace(/调休上班$/, "")}(班)`;
}

function eventLines({ uid, summary, description, start, end, status = "CONFIRMED" }) {
  return [
    "BEGIN:VEVENT",
    `UID:${escapeText(uid)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `DTSTART;VALUE=DATE:${compactDate(start)}`,
    `DTEND;VALUE=DATE:${compactDate(end)}`,
    `STATUS:${status}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT"
  ];
}

function calendarEventsForYearData(yearData) {
  const { year, schedule, source } = yearData;
  if (!schedule) {
    return [];
  }

  const sourceDescription = formatSourceDescription(source);
  const holidayEvents = schedule.holidays.flatMap((holiday) =>
    dateRange(holiday.start, holiday.end).flatMap((date) =>
      eventLines({
        uid: makeUid([year, "holiday", date]),
        summary: holidaySummary(holiday.name),
        description: `中国法定节假日放假安排。${sourceDescription}`,
        start: date,
        end: addDays(date, 1)
      })
    )
  );

  const workdayEvents = schedule.workdays.flatMap((workday) =>
    eventLines({
      uid: makeUid([year, "workday", workday.date]),
      summary: workdaySummary(workday.name),
      description: `中国法定节假日调休上班日。${sourceDescription}`,
      start: workday.date,
      end: addDays(workday.date, 1)
    })
  );

  return [...holidayEvents, ...workdayEvents];
}

function staticYearData(year) {
  return {
    year,
    schedule: getSchedule(year),
    source: getSource(year),
    dataSource: "static"
  };
}

export function createCalendarFromYearData(yearDataList) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//met1s//China Holidays//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(CALENDAR_NAME)}`,
    "X-WR-TIMEZONE:Asia/Shanghai",
    `X-WR-CALDESC:${escapeText("中国法定节假日与调休安排，事件标题使用“节日名称(休)”和“节日名称(班)”。")}`
  ];

  for (const yearData of yearDataList) {
    lines.push(...calendarEventsForYearData(yearData));
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function createCalendar({ year } = {}) {
  const years = year ? [Number(year)] : supportedYears();
  const unsupportedYears = years.filter((item) => !getSchedule(item));
  if (unsupportedYears.length > 0) {
    throw new Error(`Unsupported year: ${unsupportedYears.join(", ")}`);
  }

  return createCalendarFromYearData(years.map(staticYearData));
}
