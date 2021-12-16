export const sleep = (milliseconds: number) => {
  let cancel = () => {};
  const pending = new Promise<void>(
    (resolve, reject) => {
      const id = setTimeout(() => resolve(), milliseconds);
      cancel = () => {
        clearTimeout(id);
        reject("timeout");
      };
    },
  ) as Promise<void> & { cancel: () => void };
  pending.cancel = cancel;
  return pending;
};
