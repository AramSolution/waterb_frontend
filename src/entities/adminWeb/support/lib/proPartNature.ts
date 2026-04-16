/**
 * ARTPROM PRO_PART — 홍보·샘플업무 등 동일 DB 형식 (Y|N 5슬롯).
 */

export const PRO_NATURE_LABELS = [
  "교육/학습",
  "진로/진학",
  "문화/예술/체험",
  "복지/장학",
  "기타",
] as const;

export const PRO_PART_DEFAULT_PIPE = "N|N|N|N|N";

/** REQ_GB, PRO_PART 등 Y|N 파이프 문자열 → boolean[] */
export function booleansFromYnPipe(
  value: string | undefined,
  length: number,
): boolean[] {
  if (!value) return Array.from({ length }, () => false);
  const parts = value.split("|");
  return Array.from({ length }, (_, idx) => parts[idx] === "Y");
}

/** boolean[] → Y|N|… 파이프 문자열 */
export function ynPipeFromBooleans(arr: boolean[]): string {
  return arr.map((v) => (v ? "Y" : "N")).join("|");
}
