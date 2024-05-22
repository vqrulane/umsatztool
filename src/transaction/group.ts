import { FallbackMap } from "../fallbackMap";
import { Week } from "../week";
import { Transaction } from "./transaction";

export class TransactionList extends Array<Transaction> {
  sum = 0;

  append(transaction: Transaction) {
    this.sum += Number(transaction);
    this.push(transaction);
  }
}

const transactionGroupings = {
  month: (transaction: Transaction) => transaction.date.month,
  week: (transaction: Transaction) => new Week(transaction.date),
  day: (transaction: Transaction) => transaction.date,
  serial: (transaction: Transaction) => transaction.serial,
} as const;

export type TransactionGrouping = keyof typeof transactionGroupings;
export const transactionGroupingNames = Object.keys(transactionGroupings) as TransactionGrouping[];

export class TransactionGroup extends FallbackMap<TransactionList | TransactionGroup> {
  groupings: TransactionGrouping[] = [];
  sum = 0;

  /** constructor for derived classes with native code aren't supported */
  static of(groupings: TransactionGrouping[]) {
    if (groupings.length > 0) {
      const transactionGroup = new TransactionGroup();
      transactionGroup.groupings = groupings;

      return transactionGroup;
    }

    return new TransactionList();
  }

  append(transaction: Transaction) {
    this.sum += Number(transaction);
    const [grouping] = this.groupings;
    const groupBy = transactionGroupings[grouping];
    const group = String(groupBy(transaction));
    const current = this.getWithFallback(group);

    current.append(transaction);
  }

  getFallback() {
    return TransactionGroup.of(this.groupings.slice(1));
  }
}
