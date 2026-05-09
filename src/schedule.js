import { HOLIDAY_SCHEDULES, SOURCES } from "./holidays.js";
import { assertDateString, dateRange, isWeekend } from "./date-utils.js";

function buildDateIndex(schedule) {
  const holidays = new Map();
  const adjustedWorkdays = new Map();

  for (const holiday of schedule.holidays) {
    for (const date of dateRange(holiday.start, holiday.end)) {
      holidays.set(date, holiday);
    }
  }

  for (const workday of schedule.workdays) {
    adjustedWorkdays.set(workday.date, workday);
  }

  return { holidays, adjustedWorkdays };
}

const scheduleIndexes = new WeakMap();
const fallbackIndexes = new Map();

export function supportedYears() {
  return Object.keys(HOLIDAY_SCHEDULES).map(Number).sort((a, b) => a - b);
}

export function getSchedule(year) {
  return HOLIDAY_SCHEDULES[Number(year)] ?? null;
}

export function getSource(year) {
  return SOURCES[Number(year)] ?? null;
}

export function getIndex(year) {
  const numericYear = Number(year);
  if (!fallbackIndexes.has(numericYear)) {
    const schedule = getSchedule(numericYear);
    if (!schedule) {
      return null;
    }
    fallbackIndexes.set(numericYear, buildDateIndex(schedule));
  }
  return fallbackIndexes.get(numericYear);
}

export function hasScheduleData(schedule) {
  return Boolean(schedule?.holidays?.length || schedule?.workdays?.length);
}

export function getIndexForSchedule(schedule) {
  if (!schedule) {
    return null;
  }

  if (!scheduleIndexes.has(schedule)) {
    scheduleIndexes.set(schedule, buildDateIndex(schedule));
  }
  return scheduleIndexes.get(schedule);
}

function unknownStatus(date, yearData = {}) {
  return {
    date,
    supported: false,
    type: "unknown",
    isHoliday: false,
    isAdjustedWorkday: false,
    isWeekend: isWeekend(date),
    isWorkday: null,
    shouldEnableAlarm: null,
    name: null,
    source: yearData.source ?? null,
    dataSource: yearData.dataSource ?? null,
    sourceError: yearData.error ?? null
  };
}

export function getDayStatusFromYearData(date, yearData) {
  assertDateString(date);

  if (!yearData?.schedule || !hasScheduleData(yearData.schedule)) {
    return unknownStatus(date, yearData);
  }

  const source = yearData.source ?? null;
  const base = {
    dataSource: yearData.dataSource ?? "unknown",
    sourceError: yearData.error ?? null
  };

  const index = getIndexForSchedule(yearData.schedule);
  const holiday = index.holidays.get(date);
  if (holiday) {
    return {
      date,
      supported: true,
      type: "holiday",
      isHoliday: true,
      isAdjustedWorkday: false,
      isWeekend: isWeekend(date),
      isWorkday: false,
      shouldEnableAlarm: false,
      name: holiday.name,
      source,
      ...base
    };
  }

  const adjustedWorkday = index.adjustedWorkdays.get(date);
  if (adjustedWorkday) {
    return {
      date,
      supported: true,
      type: "adjusted_workday",
      isHoliday: false,
      isAdjustedWorkday: true,
      isWeekend: isWeekend(date),
      isWorkday: true,
      shouldEnableAlarm: true,
      name: adjustedWorkday.name,
      source,
      ...base
    };
  }

  const weekend = isWeekend(date);
  return {
    date,
    supported: true,
    type: weekend ? "weekend" : "weekday",
    isHoliday: false,
    isAdjustedWorkday: false,
    isWeekend: weekend,
    isWorkday: !weekend,
    shouldEnableAlarm: !weekend,
    name: weekend ? "周末" : "工作日",
    source,
    ...base
  };
}

export function getDayStatus(date) {
  assertDateString(date);

  const year = Number(date.slice(0, 4));
  const schedule = getSchedule(year);
  const source = getSource(year);

  if (!schedule) {
    return unknownStatus(date);
  }

  return getDayStatusFromYearData(date, {
    year,
    schedule,
    source,
    dataSource: "static"
  });
}
