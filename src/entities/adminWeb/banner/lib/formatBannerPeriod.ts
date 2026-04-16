import type { AdminBannerRow } from "../model/types";

/** 목록·상세 등에서 게시기간 문자열 */
export function formatBannerPostingPeriod(
  row: Pick<AdminBannerRow, "postStartDttm" | "postEndDttm">,
): string {
  const start = row.postStartDttm?.replace("T", " ") ?? "";
  const end = row.postEndDttm?.replace("T", " ") ?? "";
  return `${start} ~ ${end}`;
}
