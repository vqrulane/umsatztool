export class Account {
  number: number;

  constructor(accNumber: number) {
    this.number = accNumber;
  }

  toString() {
    return `#${this.number}`;
  }

  static parse(str: string) {
    const number = parseInt(str, 10);

    if (Number.isNaN(number)) {
      throw new Error(`"${str} is not a valid account number"`);
    }

    return new Account(number);
  }
}
