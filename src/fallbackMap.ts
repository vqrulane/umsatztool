export abstract class FallbackMap<T> extends Map<string | number, T> {
  getWithFallback(key: string) {
    let current = this.get(key);

    if (!current) {
      current = this.getFallback();
      this.set(key, current);
    }

    return current;
  }

  abstract getFallback(): T;
}
