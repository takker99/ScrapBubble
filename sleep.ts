export const sleep = (
  milliseconds: number,
): Promise<void> & { cancel: () => void } => {
  let cancel = () => {};
  const pending = new Promise<void>(
    (resolve, reject) => {
      const id = setTimeout(() => resolve(), milliseconds);
      cancel = () => {
        clearTimeout(id);
        reject("cancelled");
      };
    },
  ) as Promise<void> & { cancel: () => void };
  pending.cancel = cancel;
  return pending;
};
