import currency from "currency.js";
import { Account } from "./account";
import { MulticashDate } from "./multicashDate";
import { Transaction } from "./transaction";

/** @link https://bankrec.westpac.com.au/docs/statements/sap-multicash/ */
enum MulticashColumn {
  /** `#1` Bank Key Populated with the BSB of the current account. */
  account = 1,
  /** `#4` Statement Date Statement Date formatted as DD.MM.YY Date (8) Mandatory */
  date = 3,
  /** `#7` Bank Posting Text Intentionally left blank Empty Omitted */
  text = 6,
  /** `#10` Serial Number Transaction serial code/cheque number. Alphanumeric (16) Optional */
  serial = 9,
  /** `#11` Transaction Amount Signed amount formatted to 2 decimal places. */
  amount = 10,
  /** `#34` Business Transaction Code */
  code = 33,
}

const CARRET = 13;
const EOL = 10;

// eslint-disable-next-line max-statements
const parseLine = (line: string) => {
  try {
    const cols = line.split(";");
    const account = Account.parse(cols[MulticashColumn.account]);
    const date = new MulticashDate(cols[MulticashColumn.date]);
    const amount = currency(cols[MulticashColumn.amount]);
    const code = parseInt(cols[MulticashColumn.code], 10);

    if (Number.isNaN(code)) {
      throw new Error(`Couldn't parse transaction code from "${code}"`);
    }

    const transaction = new Transaction(account, date, amount, code);
    const serial = cols[MulticashColumn.serial];

    if (serial) {
      transaction.serial = serial.trim();
    }

    const text = cols[MulticashColumn.text];

    if (text) {
      transaction.text = text.trim();
    }

    return transaction;
  } catch (e) {
    throw new Error(`Parsing error occured while reading line "${line}": ${(e as Error).message}`);
  }
};

/**
 * @description temporary implementation of ReadableStream[@@asyncIterator]
 * @todo ditch when all major browsers will have ReadableStream[@@asyncIterator] shipped
 */
const iterateOverReadableStream = async function* <T>(stream: ReadableStream<T>) {
  const reader = stream.getReader();
  let { value, done } = await reader.read();

  while (!done) {
    if (value) {
      yield value;
    }

    ({ value, done } = await reader.read());
  }
};

export class TransactionParser {
  stream: ReadableStream<Uint8Array>;
  errors: Error[];
  line: number[];

  constructor(stream: ReadableStream<Uint8Array>) {
    this.stream = stream;
    this.errors = [];
    this.line = [];
  }

  // eslint-disable-next-line generator-star-spacing
  async *[Symbol.asyncIterator]() {
    for await (const typedArray of iterateOverReadableStream(this.stream)) {
      for (const charCode of typedArray) {
        const line = this.append(charCode);

        if (line) {
          try {
            yield parseLine(line);
          } catch (error) {
            this.errors.push(error as Error);
          }
        }
      }
    }
  }

  // eslint-disable-next-line consistent-return
  append(charCode: number): string | void {
    if (charCode === EOL) {
      const str = String.fromCharCode.apply(null, this.line);
      this.line = [];

      return str;
    }

    if (charCode !== CARRET) {
      this.line.push(charCode);
    }
  }
}
