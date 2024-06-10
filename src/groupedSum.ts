import currency from "currency.js";
import { FallbackMap } from "./fallbackMap";
import { Transaction } from "./transaction";

const empty = () => currency(0);

export class GroupedSum extends FallbackMap<currency> {
  total: currency = currency(0);

  append(value: currency, groupedBy?: string): GroupedSum {
    this.total = this.total.add(value);

    if (groupedBy) {
      this.set(groupedBy, this.getWithFallback(groupedBy).add(value));
    }

    return this;
  }

  getAmountFor(group?: string) {
    if (group) {
      return this.getWithFallback(group);
    }

    return this.total;
  }

  getFallback = empty;

  static compare(x: GroupedSum, y: GroupedSum): number {
    return x.total.value - y.total.value;
  }

  static reduce(transaction: Transaction, sum?: GroupedSum, groupedBy?: string): GroupedSum {
    return (sum || new GroupedSum()).append(transaction.amount, groupedBy);
  }
}
