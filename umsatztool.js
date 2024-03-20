const fs = require("node:fs/promises");

class MulticashDateParsingError extends Error {
  /**
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

  get month() {
    return [
      this.toLocaleString("default", { month: "long" }),
      this.getFullYear(),
    ].join(" ");
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
    const sign = this.amount < 0 ? "-" : "";
    const extraZeroes = Number.isInteger(this.amount) ? ".00" : "0";
    const suffixed = String(Math.abs(this.amount)).concat(extraZeroes)
    const [intPart, floatPart] = suffixed.split(".");

    return `${sign}$${intPart}.${floatPart.substring(0, 2)}`;
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
}

class TransactionParser {
  /** @private @constant https://bankrec.westpac.com.au/docs/statements/sap-multicash/ */
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

class Week {
  /** @private @constant */
  static wholeDay = new Date(0).setUTCDate(2);

  /**
   * @param {Date} date
   */
  constructor(date) {
    const offset = date.getDay() % 7;
    const delta = Week.wholeDay * offset;
    const weekStart = date - delta;
    const weekEnd = weekStart + (Week.wholeDay * 7);

    this.weekStart = new ShortISO8601Date(weekStart);
    this.weekEnd = new ShortISO8601Date(weekEnd);
  }

  toString() {
    return [this.weekStart, this.weekEnd].join(":");
  }
}

class FallbackMap extends Map {
  getWithFallback(key) {
    let current = this.get(key);

    if (!current) {
      current = this.getFallback();
      this.set(key, current);
    }

    return current;
  }

  /**
   * @abstract
   */
  getFallback() {
    return null;
  }
}

class TransactionList extends Array {
  sum = 0;

  /**
   * @param {Transaction} transaction 
   */
  append(transaction) {
    this.sum += transaction;
    this.push(transaction);
  }
}

class TransactionGroup extends FallbackMap {
  /** @type {Record<string, (transaction: Transaction) => any>} */
  static groups = {
    month: transaction => transaction.date.month,
    week: transaction => new Week(transaction.date),
    day: transaction => transaction.date,
    serial: transaction => transaction.serial
  };

  /**
   * @param {any | string[]} arg
   * @returns {string[] | null}
   */
  static parseGroups(arg) {
    if (Array.isArray(arg) && !arg.some(a => !TransactionGroup.groups[a])) {
      return arg;
    }

    return null
  }
  
  /**
   * Browsers don't allow super() in extended native classes even though Node.js does
   * @param {string[]} groupings 
   */
  static of(groupings) {
    const transactionGroup = new TransactionGroup();
    transactionGroup.groupings = groupings;

    return transactionGroup;
  }

  /** @type {string[]} */
  groupings = [];
  sum = 0;

  /**
   * 
   * @param {Transaction} transaction 
   */
  append(transaction) {
    this.sum += transaction;
    const [grouping] = this.groupings;
    const groupBy = TransactionGroup.groups[grouping];
    const group = String(groupBy(transaction));
    const current = this.getWithFallback(group);

    current.append(transaction);
  }

  getFallback() {
    if (this.groupings.length > 1) {
      return TransactionGroup.of(this.groupings.slice(1));
    }

    return new TransactionList();
  }
}

class Arguments {
  params = new Map();
  paths = [];

  static param = /^--(?<name>\w+)=(?<value>[\w,]+)/

  /**
   * @param {string} str param value
   * @returns {{ name: string; value: string; } | null}
   */
  static matchParam(str) {
    const match = Arguments.param.exec(str);

    if (match === null || !match.groups) {
      return null;
    }

    return match.groups;
  }

  /**
   * 
   * @param {string[]} raw `process.argv` stripped of node path
   */
  constructor(raw) {
    for (const arg of raw) {
      const param = Arguments.matchParam(arg);

      if (!param) {
        this.paths.push(arg);
      } else {
        const values = param.value.split(",");

        this.params.set(param.name, values.length > 1 ? values : param.value)
      }
    }
  }
}

class Tree {
  static INIT_LEAF = "├──";
  static LAST_LEAF = "└──";
  static NEST_LEAF = "│  ";
  static GAP = " ".repeat(Tree.LAST_LEAF.length);

  /**
   * @note assuming non-empty list
   * @param {T[]} xs 
   * @returns {T[]}
   */
  static init(xs) {
    return xs.slice(0, -1);
  }

  /**
   * @note assuming non-empty list
   * @param {T[]} xs 
   * @returns {T}
   */
  static last(xs) {
    const [last] = xs.slice(-1);

    return last;
  }

  /**
   * @param {string} str 
   * @param {string} oldChar 
   * @param {string} newChar 
   * @returns {string}
   */
  static replaceLast(str, oldChar, newChar) {
    const idx = str.lastIndexOf(oldChar);

    if (idx === -1) {
      return str;
    }

    const head = str.substring(0, idx);
    const tail = str.substring(idx + oldChar.length);
  
    return head.concat(newChar).concat(tail);
  }

  /**
   * @param {string} padding 
   * @param {string} key 
   * @param {{ sum: number }} children 
   * @returns {string}
   */
  static renderMapNode(padding, key, children) {
    return padding.concat(
      `[${key}] `,
      new Amount(children.sum),
      "\n"
    );
  }

  /**
   * @param {string} padding 
   * @param {Transaction} child 
   * @returns {string}
   */
  static renderListNode(padding, child) {
    return padding.concat(
      child.amount < 0 ? " " : "  ",
      child.amount,
      "\n"
    );
  }

  /**
   * @param {number} lvl 
   * @param {boolean} isLast 
   * @returns {string}
   */
  static getPadding(prevPadding, isLast) {
    const currentLeaf = isLast ? Tree.LAST_LEAF : Tree.INIT_LEAF;

    if (!prevPadding) {
      return currentLeaf;
    }

    const nested = Tree.replaceLast(prevPadding, Tree.INIT_LEAF, Tree.NEST_LEAF);
    const lastSkipped = Tree.replaceLast(nested, Tree.LAST_LEAF, Tree.GAP);

    return lastSkipped.concat(Tree.GAP, currentLeaf);
  }

  /**
   * @param {number} lvl 
   * @param {TransactionGroup | TransactionList} nodes 
   * @yields {string}
   */
  *[Symbol.iterator](prevPadding = "", nodes = this.nodes) {
    if (!prevPadding) {
      yield `Total: ${new Amount(nodes.sum)}\n`;
    }

    if (nodes instanceof Map) {
      const nodeList = Array.from(nodes);
      const initPadding = Tree.getPadding(prevPadding, false);

      for (const [key, children] of Tree.init(nodeList)) {
        yield Tree.renderMapNode(initPadding, key, children);
        yield* this[Symbol.iterator](initPadding, children);
      }
      
      const [key, children] = Tree.last(nodeList);
      const lastPadding = Tree.getPadding(prevPadding, true);

      yield Tree.renderMapNode(lastPadding, key, children);
      yield* this[Symbol.iterator](lastPadding, children);
    }

    if (nodes instanceof Array && nodes.length > 1) {
      const nodeList = nodes.sort((t1, t2) => t1.amount - t2.amount);

      for (const child of Tree.init(nodeList)) {
        yield Tree.renderListNode(Tree.getPadding(prevPadding, false), child);
      }

      yield Tree.renderListNode(Tree.getPadding(prevPadding, true), Tree.last(nodeList));
    }
  }

  constructor(nodes) {
    this.nodes = nodes;
  }
}

/**
 * @param {Arguments} args argument object containing paths to UMSATZ.TXT files and grouping settings
 */
const main = async args => {
  const { paths, params } = args;
  const groupings = TransactionGroup.parseGroups(params.get("groupBy"));
  const transactions = groupings ? TransactionGroup.of(groupings) : new TransactionList();

  if (paths.length) {
    for (const path of paths) {
      const fileHandle = await fs.open(path);
      const parser = new TransactionParser(fileHandle.readableWebStream());

      for await (const transaction of parser) {
        transactions.append(transaction);
      }

      fileHandle.close();

      if (parser.errors.length) {
        for (const error of parser.errors) {
          process.stderr.write("\n" + error);
        }
      }

      for (const node of new Tree(transactions)) {
        process.stdout.write(node);
      };
    }
  }
}

if (require.main === module) {
  main(new Arguments(process.argv.slice(2)));
}