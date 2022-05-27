export type Listener<T> = (event: T) => void;

export interface EventEmitter<T, U> {
  /** eventを発行する */
  dispatch: (eventName: T, value: U) => void;

  /** 特定のeventが発火したときに実行するlistenerを登録する */
  on: (eventName: T, listener: Listener<U>) => void;

  /** listenerの登録を解除する */
  off: (eventName: T, listener: Listener<U>) => void;
}

export const makeEmitter = <T, U>(): EventEmitter<T, U> => {
  const listenersMap = new Map<T, Set<Listener<U>>>();

  return {
    dispatch: (eventName, value) => {
      const listeners = listenersMap.get(eventName);
      if (!listeners) return;
      for (const listener of listeners) {
        listener(value);
      }
    },
    on: (eventName, listener) => {
      const listeners = listenersMap.get(eventName) ?? new Set<Listener<U>>();
      listeners.add(listener);
      listenersMap.set(eventName, listeners);
    },
    off: (eventName, listener) => {
      const listeners = listenersMap.get(eventName);
      if (!listeners) return;
      listeners.delete(listener);
    },
  };
};
