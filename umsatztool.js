const fs = require("node:fs/promises");

class MulticashDateParsingError extends Error {
  /**
   * 
   * @param {string} str the invalid string
   * @returns a multicash date parsing error containing the appropriate message
   */
  constructor(str) {
    return `Couldn't parse date from "${str || ""}"`;
  }
}

class ShortISO8601Date extends Date {
  /**
   * @returns {string} a short ISO-8601 date string
   * @example
   * MulticashDate.parse("02.02.20").toString() === "2020-02-02"; // => true
   */
  toString() {
    return this.toISOString().slice(0, 10);
  }
}

class MulticashDate extends ShortISO8601Date {
  /** @private @constant */
  static dateString = /(?<day>[0-9]{2})\.(?<month>[0-9]{2})\.(?<yearString>[0-9]{2})/;

  /**
   * @param {string} str a (preferably) valid multicash date string
   * @returns {{ day: string; month: string; year: string; }} date string segments (day, month, and year)
   * @throws MulticashDateParsingError
   * @example
   * MulticashDate.match("02.02.12"); // => { day: "02", month: "02", year: "12" }
   * MulticashDate.match("F.000.BAR"); // MulticashDateParsingError thrown 
   */
  static match(str) {
    const match = MulticashDate.dateString.exec(str);

    if (match === null || !match.groups) {
      throw new MulticashDateParsingError(str);
    }

    return match.groups;
  }

  /**
   * 
   * @param {string} str a (preferably) valid multicash date string
   * @throws MulticashDateParsingError
   * @returns MulticashDate
   * @example
   * MulticashDate.parse("02.02.12"); // => MulticashDate
   * MulticashDate.parse("F.000.BAR"); // MulticashDateParsingError thrown 
   */
  static parse(str) {
    const { day, month, yearString } = MulticashDate.match(str);
    const year = parseInt(yearString, 10) + 2000; // TODO: idk what would I even do with that

    if (Number.isNaN(year)) {
      throw new MulticashDateParsingError(str);
    }

    return new MulticashDate(year, month -1, day);
  }
}

class Account {
  /**
   * @param {string} str a (preferably) valid integer string
   * @returns Account
   */
  static parse(str) {
    const number = parseInt(str, 10);

    if (Number.isNaN(number)) {
      throw new Error(`"${str} is not a valid account number"`);
    }

    return new Account(number);
  }

  /**
   * @param {number} number an integer representing the account number
   */
  constructor(number) {
    this.number = number;
  }

  /**
   * @returns {string} a Ledger-friendly account name
   * @example
   * new Account(200).toString(); // => "BANK ACCOUNT #200"
   */
  toString() {
    return `BANK ACCOUNT #${this.number}`;
  }
}

/**
 * @todo Extend the decimal type instead
 */
class Amount {
  /**
   * @param {string} str a (preferably) valid float32 string
   * @returns {Amount}
   * @example
   * Amount.parse("40.50");
   */
  static parse(str) {
    const amount = parseFloat(str);

    if (Number.isNaN(amount)) {
      throw new Error(`"${str}" is not a valid amount`);
    }

    return new Amount(amount);
  }

  /**
   * @param {number} amount a float32
   */
  constructor(amount) {
    this.amount = amount;
  }

  valueOf() {
    return this.amount;
  }

  /**
   * @returns {string} a Ledger-friendly amount with dollar/peso sign prepended
   * @example
   * new Amount(40.50).toString() === "$40.50"; // => true
   */
  toString() {
    return `$${Math.abs(this.amount)}`;
  }
}

class Transaction {
  /** @type {string | null} */
  text = null;
  /** @type {string | null} */
  serial = null;

  /**
   * @todo add bank variable
   * @param {Account} account bank account
   * @param {MulticashDate} date a multicash date instance
   * @param {Amount} amount 
   * @param {number} code 
   */
  constructor(account, date, amount, code) {
    this.date = date;
    this.amount = amount;
    this.code = code;
    this.account = account;
  }

  valueOf() {
    return this.amount.valueOf();
  }

  /** Prints in the Ledger format */
  toString() {
    const debit = this.amount < 0;

    return `${this.date} ${this.text}
      ${this.serial}${debit ? ` ${this.amount}` : ""}
      ${this.account}${debit ? "" : ` ${this.amount}`}`
  }
}

class TransactionParser {
  /** @private @constant */
  static cols = {
    /** `#1` Bank Key	Populated with the BSB of the current account. */
    account: 1,
    /** `#4` Statement Date	Statement Date formatted as DD.MM.YY	Date (8)	Mandatory */
    date: 3,
    /** `#7`	Bank Posting Text	Intentionally left blank	Empty	Omitted */
    text: 6,
    /** `#10`	Serial Number	Transaction serial code. For Cheque deposits this will contain the cheque number.	Alphanumeric (16)	Optional */
    serial: 9,
    /** `#11`	Transaction Amount	Signed amount formatted to 2 decimal places. */
    amount: 10,
    /** `#34`	Business Transaction Code */
    code: 33,
  }

  /**
   * carriage return charcode
   * @private
   * @constant
  */
  static CARRET = 13;

  /**
   * newline charcode
   * @private
   * @constant
  */
  static EOL = 10;

  /**
   * @param {string} line a line of input
   * @returns {Transaction} a parsed transaction
   * @throws a parsing error
   */
  static parseLine(line) {
    try {
      const cols = line.split(";");
      const account = Account.parse(cols[TransactionParser.cols.account]);
      const date = MulticashDate.parse(cols[TransactionParser.cols.date]);
      const amount = Amount.parse(cols[TransactionParser.cols.amount]);
      const code = parseInt(cols[TransactionParser.cols.code], 10);

      if (Number.isNaN(code)) {
        throw new Error(`Couldn't parse transaction code from "${code}"`);
      }

      const transaction = new Transaction(account, date, amount, code);

      const serial = cols[TransactionParser.cols.serial];

      if (serial) {
        transaction.serial = serial.trim();
      }

      const text = cols[TransactionParser.cols.text];

      if (text) {
        transaction.text = text.trim();
      }

      return transaction;
    } catch(e) {
      throw new Error(`Parsing error occured while reading line "${line}": ${e.message}`)
    }
  }

  async *[Symbol.asyncIterator]() {
    for await (const arrayBuffer of this.stream) {
      const typedArray = new Uint8Array(arrayBuffer);

      for (const charCode of typedArray) {
        const line = this.append(charCode);

        if (line) {
          try {
            yield TransactionParser.parseLine(line);
          } catch(error) {
            this.errors.push(error)
          }
        }
      }
    }
  }

  /**
   * Supports one file at time; It's possible to reassign the stream prop but you'll have to
   * clear the accumulator first (the line prop)
   * @param {ReadableStream} stream a readable stream of file contents
   */
  constructor(stream) {
    this.stream = stream;
    this.errors = [];
    this.line = [];
  }

  /**
   * 
   * @param {number} charCode current character code
   * @returns {string | undefined} if reached the end of the line, its contents
   */
  append(charCode) {
    if (charCode === TransactionParser.EOL) {
      const str = String.fromCharCode.apply(null, this.line);
      this.line = [];

      return str;
    } else if (charCode !== TransactionParser.CARRET) {
      this.line.push(charCode);
    }
  }
}

/**
 * @param {string[]} paths paths to UMSATZ.TXT files
 */
const main = async paths => {
  if (paths.length) {
    for (const path of paths) {
      const fileHandle = await fs.open(path);
      const parser = new TransactionParser(fileHandle.readableWebStream());

      for await (const transaction of parser) {
        process.stdout.write("\n\n" + transaction.toString())
      }

      fileHandle.close();

      if (parser.errors.length) {
        for (const error of parser.errors) {
          process.stderr.write("\n" + error);
        }
      }
    }
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}