const { length } = "2020-02-02";

export class ShortISO8601Date extends Date {
  toString() {
    return this.toISOString().slice(0, length);
  }
}
