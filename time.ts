/** DateをUNIX時刻に変換する
 *
 * @param data 変換したい日時
 * @return UNIX時刻
 */
export const getUnixTime = (date: Date): number =>
  Math.round(date.getTime() / 1000);
