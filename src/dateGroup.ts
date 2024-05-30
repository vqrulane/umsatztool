import { getWeek } from "date-fns/getWeek";

const week = (date: Date) =>
  [getWeek(Number(date)), date.toLocaleDateString(navigator.language, { year: "2-digit" })].join(
    "."
  );

const month = (date: Date) =>
  date.toLocaleDateString(navigator.language, {
    month: "short",
    year: "2-digit",
  });

const dateGroupMap = {
  day: (date: Date) => date.toLocaleDateString(),
  week,
  month,
} as const;

export type DateGroup = keyof typeof dateGroupMap;
export const dateGroups = Object.keys(dateGroupMap) as DateGroup[];
export const getDateGrouping = (date: Date, group: DateGroup) => dateGroupMap[group](date);
