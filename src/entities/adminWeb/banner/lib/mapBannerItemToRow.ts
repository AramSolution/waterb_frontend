import type { AdminBannerRow } from "../model/types";
import type { BannerItemResponse } from "../api/bannerApi";
import {
  resolveBannerListImageByFileId,
  resolveBannerListImageSrc,
} from "./resolveBannerImageUrl";

/** SQL `YYYY-MM-DD HH:mm` → datetime-local */
export function sqlDttmToDatetimeLocal(sql: string): string {
  if (!sql?.trim()) return "";
  const s = sql.trim();
  if (s.length >= 16) {
    return `${s.slice(0, 10)}T${s.slice(11, 16)}`;
  }
  return s.replace(" ", "T").slice(0, 16);
}

export function mapBannerItemToAdminRow(
  item: BannerItemResponse,
): AdminBannerRow {
  const imageByFileId = resolveBannerListImageByFileId(item.fileCd, 1);
  const thumb = item.imgUrl1?.trim() || item.imgUrl?.trim() || "";
  return {
    bannerId: item.banrCd || "",
    title: item.title || "",
    content: "",
    postStartDttm: sqlDttmToDatetimeLocal(item.startDttm || ""),
    postEndDttm: sqlDttmToDatetimeLocal(item.endDttm || ""),
    imageUrl: imageByFileId || resolveBannerListImageSrc(thumb),
    sortOrder: item.orderBy ?? 0,
    useYn: item.statCode === "A" ? "Y" : "N",
    rnum: item.rnum != null ? String(item.rnum) : undefined,
  };
}
