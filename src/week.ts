import { ShortISO8601Date } from "./shortDate";

const wholeDay = new Date(0).setUTCDate(2);
const wholeWeek = wholeDay * 7;

/** @todo ditch in favour of date-fns or something */
export class Week {
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
