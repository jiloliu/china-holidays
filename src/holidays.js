export const CALENDAR_NAME = "中国节假日与调休";

export const SOURCES = {
  2026: {
    title: "国务院办公厅关于2026年部分节假日安排的通知",
    publisher: "国务院办公厅",
    publishedDate: "2025-11-04",
    documentNo: "国办发明电〔2025〕7号",
    url: "https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm"
  }
};

export const HOLIDAY_SCHEDULES = {
  2026: {
    holidays: [
      { name: "元旦", start: "2026-01-01", end: "2026-01-03" },
      { name: "春节", start: "2026-02-15", end: "2026-02-23" },
      { name: "清明节", start: "2026-04-04", end: "2026-04-06" },
      { name: "劳动节", start: "2026-05-01", end: "2026-05-05" },
      { name: "端午节", start: "2026-06-19", end: "2026-06-21" },
      { name: "中秋节", start: "2026-09-25", end: "2026-09-27" },
      { name: "国庆节", start: "2026-10-01", end: "2026-10-07" }
    ],
    workdays: [
      { name: "元旦调休上班", date: "2026-01-04" },
      { name: "春节调休上班", date: "2026-02-14" },
      { name: "春节调休上班", date: "2026-02-28" },
      { name: "劳动节调休上班", date: "2026-05-09" },
      { name: "国庆节调休上班", date: "2026-09-20" },
      { name: "国庆节调休上班", date: "2026-10-10" }
    ]
  }
};
