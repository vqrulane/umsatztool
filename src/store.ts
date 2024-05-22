import React from "react";

const CHANGE = "change";

export class Store<T> extends EventTarget {
  value: T;
  compare: (x: T, y: T) => boolean = Object.is;

  constructor(initialValue: T) {
    super();
    this.value = initialValue;

    this.subscribe = this.subscribe.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
    this.update = this.update.bind(this);
  }

  subscribe(onStoreChange: () => void) {
    this.addEventListener(CHANGE, onStoreChange);

    return this.removeEventListener.bind(this, CHANGE, onStoreChange);
  }

  getSnapshot() {
    return this.value;
  }

  update(getNewValue: (prevValue: T) => T) {
    const newValue = getNewValue(this.value);

    if (!this.compare(this.value, newValue)) {
      this.value = newValue;
      this.dispatchEvent(new Event(CHANGE));
    }
  }
}

export const useStore = <T>(store: Store<T>) => {
  const value = React.useSyncExternalStore(store.subscribe, store.getSnapshot);

  return [value, store.update] as const;
};
