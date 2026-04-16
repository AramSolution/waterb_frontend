import { API_CONFIG, FILES } from "@/shared/config/api";

/** 목록/상세에서 이미지 경로를 절대 URL로 (상대 경로 시 API 호스트 기준) */
export function resolveBannerListImageSrc(path: string): string {
  if (!path?.trim()) return "";
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? "";
  if (!base) return p;
  return p.startsWith("/") ? `${base}${p}` : `${base}/${p}`;
}

/** 배너 목록 이미지: fileId가 있으면 files/view 우선 사용 */
export function resolveBannerListImageByFileId(
  fileId?: string | null,
  seq?: string | number | null,
): string {
  const id = String(fileId ?? "").trim();
  if (!id) return "";
  const fileSeq =
    seq == null || String(seq).trim() === "" ? "1" : String(seq).trim();
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? "";
  if (!base) return "";
  return `${base}${FILES.VIEW}?fileId=${encodeURIComponent(id)}&seq=${encodeURIComponent(fileSeq)}`;
}
