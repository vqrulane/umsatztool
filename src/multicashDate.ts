import { ShortISO8601Date } from "./shortDate";

class MulticashDateParsingError extends Error {
  constructor(str: string) {
    super(`Couldn't parse date from "${str || ""}"`);
  }
}

const dateStringFormat = /(?<day>[0-9]{2})\.(?<month>[0-9]{2})\.(?<yearString>[0-9]{2})/;

const parseDateString = (str: string) => {
  const match = dateStringFormat.exec(str);

  if (match === null || !match.groups) {
    throw new MulticashDateParsingError(str);
  }

  return match.groups;
};

/** @todo infer millenium from AUSZUG.TXT */
export class MulticashDate extends ShortISO8601Date {
  constructor(dateString: string) {
    const { day, month, yearString } = parseDateString(dateString);
    const year = parseInt(yearString, 10) + 2000; // see @todo

    if (Number.isNaN(year)) {
      throw new MulticashDateParsingError(dateString);
    }

    super(year, Number(month) - 1, Number(day));
  }
}
