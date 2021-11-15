export const toLc = (title: string) => title.toLowerCase().replaceAll(" ", "_");
export const encodeTitle = (title: string) =>
  title.replaceAll(" ", "_").replace(
    /[/?#\{}^|<>]/g,
    (char) => encodeURIComponent(char),
  );
