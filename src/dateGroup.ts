import { MulticashDate } from "./multicashDate";
import { ShortISO8601Date } from "./shortDate";

const wholeDay = new Date(0).setUTCDate(2);
const wholeWeek = wholeDay * 7;

/** @todo ditch in favour of date-fns or something */
class Week {
  weekStart: ShortISO8601Date;
  weekEnd: ShortISO8601Date;

  constructor(date: Date) {
    const offset = date.getDay() % 7;
    const delta = wholeDay * offset;
    const weekStart = Number(date) - delta;
    const weekEnd = weekStart + wholeWeek;

    this.weekStart = new ShortISO8601Date(weekStart);
    this.weekEnd = new ShortISO8601Date(weekEnd);
  }

  toString() {
    return [this.weekStart, this.weekEnd].join(":");
  }
}

class Month {
  month: number;
  year: number;

  constructor(date: MulticashDate) {
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
  }

  toString() {
    const formattedMonth = this.month > 10 ? this.month : `0${this.month}`;

    return `${formattedMonth}.${this.year}`;
  }
}

const dateGroupMap = {
  day: (date: MulticashDate) => String(date),
  week: (date: MulticashDate) => String(new Week(date)),
  month: (date: MulticashDate) => String(new Month(date)),
} as const;

export type DateGroup = keyof typeof dateGroupMap;
export const dateGroups = Object.keys(dateGroupMap) as DateGroup[];
export const getDateGrouping = (date: MulticashDate, group: DateGroup) => dateGroupMap[group](date);
