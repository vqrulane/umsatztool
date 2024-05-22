/** @todo Temporary; Extend the decimal type and AUSZUG.TXT data instead */
export class Amount {
  amount: number;

  constructor(amount: number) {
    this.amount = amount;
  }

  static parse(str: string) {
    const amount = parseFloat(str);

    if (Number.isNaN(amount)) {
      throw new Error(`"${str}" is not a valid amount`);
    }

    return new Amount(amount);
  }

  valueOf() {
    return this.amount;
  }

  /** @todo use locale formatter in accordance with AUSZUG.TXT contents */
  toString() {
    const sign = this.amount < 0 ? "-" : "";
    const extraZeroes = Number.isInteger(this.amount) ? ".00" : "0";
    const suffixed = String(Math.abs(this.amount)).concat(extraZeroes);
    const [intPart, floatPart] = suffixed.split(".");

    return `${sign}$${intPart}.${floatPart.substring(0, 2)}`;
  }
}
