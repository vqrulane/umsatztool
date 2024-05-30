import { Account } from "./account.ts";
import { Amount } from "./amount.ts";
import { MulticashDate } from "./multicashDate";

export class Transaction {
  account: Account;
  date: MulticashDate;
  amount: Amount;
  code: number;

  text: string | null = null;
  serial: string | null = null;

  // eslint-disable-next-line max-params
  constructor(account: Account, date: MulticashDate, amount: Amount, code: number) {
    this.date = date;
    this.amount = amount;
    this.code = code;
    this.account = account;
  }

  valueOf() {
    return this.amount.valueOf();
  }
}
