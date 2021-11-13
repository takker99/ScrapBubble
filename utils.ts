export const toLc = (title: string) =>
  title.toLowerCase().replaceAll(" ", "_").replace(/[/?#\{}^|<>]/g, char => encodeURIComponent(char));
