import { useEffect } from "./deps/preact.tsx";

type EventMap<E extends EventTarget> = E extends Window ? WindowEventMap
  : E extends Document ? DocumentEventMap
  : E extends HTMLElement ? HTMLElementEventMap
  : GlobalEventHandlersEventMap;
type Listener<E extends EventTarget, K extends keyof EventMap<E>> = E extends
  Window ? (this: Window, ev: EventMap<E>[K]) => void
  : E extends Document ? (this: Document, ev: EventMap<E>[K]) => void
  : E extends HTMLElement ? (this: HTMLElement, ev: EventMap<E>[K]) => void
  : EventListenerOrEventListenerObject;

export const useEventListener = <
  E extends EventTarget,
  K extends (keyof EventMap<E>) & string,
>(
  element: E,
  type: K,
  listener: Listener<E, K>,
  options?: boolean | AddEventListenerOptions,
): void => {
  useEffect(() => {
    element.addEventListener(type, listener, options);
    return () => element.removeEventListener(type, listener, options);
  }, [element, type, options]);
};
