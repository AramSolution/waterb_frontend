import type { BannerDetailDataResponse } from "../api/bannerApi";
import type { AdminBannerRow } from "../model/types";
import { resolveBannerListImageSrc } from "./resolveBannerImageUrl";

function sqlDttmToDateOnly(sql: string): string {
  if (!sql?.trim()) return "";
  return sql.trim().slice(0, 10);
}

/** GET `/api/admin/banner/{banrCd}` → 폼: startDttm/endDttm·startDt/endDt → postStart/postEnd, title, body, orderBy */
export function mapBannerDetailDataToAdminRow(
  data: BannerDetailDataResponse,
): AdminBannerRow {
  const img = data.imgUrl?.trim() || "";
  let postStart = sqlDttmToDateOnly(data.startDttm || "");
  let postEnd = sqlDttmToDateOnly(data.endDttm || "");
  if (!postStart && data.startDt?.trim()) {
    postStart = data.startDt.trim();
  }
  if (!postEnd && data.endDt?.trim()) {
    postEnd = data.endDt.trim();
  }
  return {
    bannerId: data.banrCd || "",
    title: data.title || "",
    content: data.body || "",
    postStartDttm: postStart,
    postEndDttm: postEnd,
    imageUrl: resolveBannerListImageSrc(img),
    sortOrder: data.orderBy ?? 0,
    useYn: data.statCode === "A" ? "Y" : "N",
  };
}
