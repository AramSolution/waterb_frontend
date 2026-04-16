/**
 * 지원사업 상세(bizInfo2 패리티) 공통 — BizInfoSection·BizInfoCtSection 등에서 공유
 */
import { API_CONFIG } from "@/shared/config/apiUser";

export const BIZ_INFO2_IMG = "/images/userWeb";

/** API 상세 응답 detail (ArtpromUserDTO) */
export interface BizInfo2ArtpromDetail {
  proId?: string;
  proGb?: string;
  proType?: string;
  proNm?: string;
  proTargetNm?: string;
  recCnt?: number;
  recFromDd?: string;
  recToDd?: string;
  proSum?: string;
  proDesc?: string;
  runStaNm?: string;
  proPart?: string;
  proPartNm?: string;
  proDepa?: string;
  proCharge?: string;
  proTel?: string;
  proEnquiry?: string;
  proPage?: string;
  etcNm?: string;
  proFromDd?: string;
  proToDd?: string;
  proHow?: string;
  proSpace?: string;
  proCost?: string;
  [key: string]: unknown;
}

export interface BizInfo2ArtpromFileItem {
  fileId?: string;
  seq?: string;
  orgfNm?: string;
  saveNm?: string;
  filePath?: string;
  fileExt?: string;
  [key: string]: unknown;
}

export interface BizInfo2UserDetailResponse {
  detail?: BizInfo2ArtpromDetail | null;
  proFileList?: BizInfo2ArtpromFileItem[] | null;
  fileList?: BizInfo2ArtpromFileItem[] | null;
  result?: string;
}

export interface BizInfo2BreadcrumbCrumb {
  label: string;
  href?: string;
  current?: boolean;
  home?: boolean;
}

export const BIZ_INFO2_SCHOOL_GROUP_LABEL: Record<string, string> = {
  E: "초등",
  J: "중등",
  M: "중등",
  H: "고등",
};

export function parseReqGbPosition(value: string | null): number | undefined {
  if (value == null) return undefined;
  const n = parseInt(value, 10);
  return n >= 1 && n <= 5 ? n : undefined;
}

export function gradeParamToLabel(grade: string | undefined | null): string {
  if (!grade) return "";
  const g = grade.trim().toUpperCase();
  if (g === "Y1") return "영유아";
  if (g === "O1") return "일반";
  const num = g.replace(/^\D+/, "");
  if (!num) return "";
  return `${num}학년`;
}

export function natureChecksFromDetail(
  detail: BizInfo2ArtpromDetail | null,
): [boolean, boolean, boolean, boolean, boolean] {
  const pipe = String(detail?.proPart ?? "").trim();
  if (pipe.includes("|")) {
    const parts = pipe.split("|").map((x) => x.trim().toUpperCase());
    const pad = (i: number) => (parts[i] === "Y" ? true : false);
    return [pad(0), pad(1), pad(2), pad(3), pad(4)];
  }
  const nm = String(detail?.proPartNm ?? "").trim();
  if (!nm) return [true, false, false, false, false];
  const checks: [boolean, boolean, boolean, boolean, boolean] = [
    /교육|학습/.test(nm),
    /진로|진학/.test(nm),
    /문화|예술|체험/.test(nm),
    /복지|장학/.test(nm),
    /기타/.test(nm),
  ];
  return checks.some(Boolean) ? checks : [true, false, false, false, false];
}

export function statusPillClassFromRunNm(runStaNm: string): string {
  const s = runStaNm.replace(/\s/g, "");
  if (/마감|종료|완료|사업종료|불가|취소/.test(s)) return "statusEnd";
  if (/예정|준비|대기|공고/.test(s)) return "statusReady";
  return "statusIng";
}

export function formatYyyyMmDd(yyyymmdd: string | undefined): string {
  if (!yyyymmdd || yyyymmdd.length < 8) return "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${y}.${m}.${d}`;
}

export function formatProDateDd(raw: string | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}.${iso[2]}.${iso[3]}`;
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 8) return formatYyyyMmDd(digits.slice(0, 8));
  return s;
}

export function getMainImageUrl(
  proFileList: BizInfo2ArtpromFileItem[] | null | undefined,
): string | null {
  const first =
    Array.isArray(proFileList) && proFileList.length > 0
      ? proFileList[0]
      : null;
  const fileId = first?.fileId ?? "";
  const seq = first?.seq ?? "";
  if (fileId === "" || seq === "" || seq === undefined) return null;
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
  if (!base) return null;
  return `${base}/api/v1/files/view?fileId=${encodeURIComponent(String(fileId))}&seq=${encodeURIComponent(String(seq))}`;
}

export function getFileDownloadUrl(file: BizInfo2ArtpromFileItem): string {
  const fileId = file.fileId ?? "";
  const seq = file.seq ?? "";
  if (fileId && seq && API_CONFIG.BASE_URL) {
    return `${API_CONFIG.BASE_URL.replace(/\/$/, "")}/api/v1/files/download?fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(seq)}`;
  }
  return "#";
}

export function formatChargeLine(detail: BizInfo2ArtpromDetail | null): string {
  if (!detail) return "";
  const charge = String(detail.proCharge ?? "").trim();
  const tel = String(detail.proTel ?? "").trim();
  if (!charge && !tel) return "";
  return tel ? (charge ? `${charge} (${tel})` : tel) : charge;
}

export function displayOrDash(s: string): string {
  const t = s.trim();
  return t ? t : "";
}

export function externalHref(raw: string): string {
  const t = raw.trim();
  if (!t) return "#";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function getFileClass(
  fileExt: string | undefined,
  fileName?: string,
): string {
  let ext = (fileExt && String(fileExt).toLowerCase().replace(/^\./, "")) || "";
  if (!ext && fileName) {
    const lastDot = String(fileName).lastIndexOf(".");
    if (lastDot >= 0)
      ext = String(fileName)
        .slice(lastDot + 1)
        .toLowerCase();
  }
  if (!ext) return "img";
  if (ext === "xlsx" || ext === "xls") return "xls";
  if (["hwp", "pdf", "ppt", "pptx", "zip"].includes(ext))
    return ext === "pptx" ? "ppt" : ext;
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "img";
  return "img";
}
