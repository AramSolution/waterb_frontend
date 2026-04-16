/**
 * 학생 메인 교육 카드(EduListSection)와 동일한 ARTPROM 목록 행 표시 규칙.
 * MY PAGE 신청 목록 등 동일 DTO를 쓰는 화면에서 재사용.
 */
import { decodeDisplayText } from "@/shared/lib";

export type ArtpromCardBadge =
  | "elementary"
  | "middle"
  | "high"
  | "university"
  | "other"
  | "kids"
  | "usual";

/** EduListSection 호환 별칭 */
export type BadgeType = ArtpromCardBadge;

const MAIN_HTML_PRO_PART_LABELS: Record<string, string> = {
  "1": "교육/학습",
  "2": "진로/진학",
  "3": "문화/예술/체험",
  "4": "복지/장학",
  "5": "기타",
};

/** 목록 `proPart`(Y|N|…) → 상세 `PRO_PART_NM`과 동일한 콤마 구분 표시명 */
export function mainHtmlNatureLabelFromProPartPipe(pipe: string): string {
  const raw = pipe.trim();
  if (!raw) return "";
  const segments = raw.split("|");
  while (segments.length < 5) segments.push("N");
  const labels: string[] = [];
  for (let i = 0; i < 5; i++) {
    const flag = (segments[i] ?? "N").trim().toUpperCase();
    if (flag === "Y") {
      const label = MAIN_HTML_PRO_PART_LABELS[String(i + 1)];
      if (label) labels.push(label);
    }
  }
  return labels.join(", ");
}

export function formatYyyyMmDd(yyyymmdd: string | undefined): string {
  if (!yyyymmdd || yyyymmdd.length < 8) return "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${y}.${m}.${d}`;
}

export function getStrArtprom(
  item: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const k of keys) {
    const v = item[k];
    if (v != null && typeof v === "string") return v.trim();
    if (v != null && typeof v === "number") return String(v);
  }
  return "";
}

function hasTargetFlag(item: Record<string, unknown>, ...keys: string[]): boolean {
  return getStrArtprom(item, ...keys) !== "";
}

/** 메인·MY PAGE 공통: 영 → 초·중·고 → 대·일 (proType5 기타 제외) */
export function artpromTargetBadges(
  item: Record<string, unknown>,
): ArtpromCardBadge[] {
  const badges: ArtpromCardBadge[] = [];
  if (hasTargetFlag(item, "proType6", "pro_type_6")) badges.push("kids");
  if (hasTargetFlag(item, "proType1", "pro_type_1")) badges.push("elementary");
  if (hasTargetFlag(item, "proType2", "pro_type_2")) badges.push("middle");
  if (hasTargetFlag(item, "proType3", "pro_type_3")) badges.push("high");
  if (hasTargetFlag(item, "proType4", "pro_type_4")) badges.push("university");
  if (hasTargetFlag(item, "proType7", "pro_type_7")) badges.push("usual");
  return badges;
}

export function artpromNatureLabel(
  item: Record<string, unknown>,
  mainHtmlSingleProPartKey?: string,
): string | undefined {
  const proPartNmRaw = getStrArtprom(item, "proPartNm", "pro_part_nm");
  const proPartPipe = getStrArtprom(item, "proPart", "pro_part");
  const fromProPartPipe = proPartPipe
    ? mainHtmlNatureLabelFromProPartPipe(proPartPipe)
    : "";
  if (proPartNmRaw) return decodeDisplayText(proPartNmRaw);
  if (fromProPartPipe) return fromProPartPipe;
  if (
    mainHtmlSingleProPartKey &&
    MAIN_HTML_PRO_PART_LABELS[mainHtmlSingleProPartKey]
  ) {
    return MAIN_HTML_PRO_PART_LABELS[mainHtmlSingleProPartKey];
  }
  return undefined;
}

/** `.infoCompany`: proDepaNm 우선, 없으면 proDepa */
export function artpromDepartment(item: Record<string, unknown>): string {
  return decodeDisplayText(
    getStrArtprom(item, "proDepaNm", "pro_depa_nm") ||
      getStrArtprom(item, "proDepa", "pro_depa"),
  );
}

/** 홍보(PRO_TYPE 03)는 proSum 우선, 그 외 etcNm */
export function artpromCardDesc(item: Record<string, unknown>): string {
  const proType = getStrArtprom(item, "proType");
  const isPromo = proType === "03" || proType === "홍보";
  return decodeDisplayText(
    isPromo
      ? getStrArtprom(item, "proSum", "pro_sum") ||
          getStrArtprom(item, "etcNm", "etc_nm")
      : getStrArtprom(item, "etcNm", "etc_nm"),
  );
}

export function artpromDateRange(item: Record<string, unknown>): string {
  const fromStr = formatYyyyMmDd(
    getStrArtprom(item, "recFromDd", "rec_from_dd") || undefined,
  );
  const toStr = formatYyyyMmDd(
    getStrArtprom(item, "recToDd", "rec_to_dd") || undefined,
  );
  return fromStr && toStr ? `${fromStr} ~ ${toStr}` : fromStr || toStr || "";
}

export function artpromLocation(item: Record<string, unknown>): string {
  return decodeDisplayText(
    getStrArtprom(item, "proTargetNm", "pro_target_nm"),
  );
}

export function artpromCategoryMeta(item: Record<string, unknown>): {
  categoryLabel: string;
  categoryClass: "promo" | "education" | "biz";
  isPromo: boolean;
} {
  const proType = getStrArtprom(item, "proType");
  const isPromo = proType === "03" || proType === "홍보";
  return {
    isPromo,
    categoryLabel: isPromo ? "홍보" : proType || "지원사업",
    categoryClass: isPromo
      ? "promo"
      : proType === "교육"
        ? "education"
        : "biz",
  };
}

export function artpromBadgeLabel(
  badge: ArtpromCardBadge,
  layoutMainHtml: boolean,
): string {
  if (layoutMainHtml) {
    const short: Record<ArtpromCardBadge, string> = {
      elementary: "초",
      middle: "중",
      high: "고",
      university: "대",
      other: "기",
      kids: "영",
      usual: "일",
    };
    return short[badge];
  }
  const full: Record<ArtpromCardBadge, string> = {
    elementary: "초등",
    middle: "중등",
    high: "고등",
    university: "대학",
    other: "기타",
    kids: "영유아",
    usual: "일반",
  };
  return full[badge];
}

/** RUN_STA → 메인 HTML 카드 `.state` 계열 클래스 */
export function stateClassFromRunStaForMainHtml(runSta: string | undefined): string {
  if (!runSta) return "";
  switch (runSta) {
    case "01":
      return "announce";
    case "02":
      return "accepting";
    case "03":
      return "review";
    case "04":
      return "progress";
    case "05":
      return "complete";
    case "99":
      return "cancel";
    default:
      return "";
  }
}

/** 접수상태명 → 메인 카드 상단 pill 문구 */
export function mainHtmlRecruitLabel(stateLabel: string | undefined): string {
  if (!stateLabel) return "";
  const m: Record<string, string> = {
    접수예정: "모집예정",
    접수중: "모집중",
    접수마감: "모집마감",
    취소: "취소",
  };
  return m[stateLabel] ?? stateLabel;
}

export function mainHtmlStatusPillClass(stateClass: string | undefined): string {
  if (stateClass === "accepting") return "statusIng";
  if (stateClass === "announce") return "statusReady";
  return "statusEnd";
}

const BROWSE_BIZINFO = "/userWeb/bizInfo";
const BROWSE_BIZINFO_PR = "/userWeb/bizInfoPr";
const BROWSE_BIZINFO_CT = "/userWeb/bizInfoCt";
const BROWSE_BIZINFO_VD = "/userWeb/bizInfoVd";
const BROWSE_BIZINFO_DM = "/userWeb/bizInfoDm";
const BROWSE_BIZINFO_RC = "/userWeb/bizInfoRc";
const BROWSE_BIZINFO_GC = "/userWeb/bizInfoGc";

/** MY PAGE·메인 상세(신청 폼 아님) 링크 — `EduListSection` `mapApiItemToCard`와 동일 proGb 분기 */
export function buildArtpromBrowseDetailHref(
  proId: string,
  proGb: string | undefined,
  themeType: "student" | "parent" | "academy" | "mentor" | undefined,
): string {
  const gb = (proGb || "01").trim();
  const base =
    gb === "03"
      ? BROWSE_BIZINFO_CT
      : gb === "04"
        ? BROWSE_BIZINFO_VD
        : gb === "05"
          ? BROWSE_BIZINFO_RC
          : gb === "07"
            ? BROWSE_BIZINFO_GC
            : gb === "06"
              ? BROWSE_BIZINFO_DM
              : gb === "02"
                ? BROWSE_BIZINFO_PR
                : BROWSE_BIZINFO;
  const params = new URLSearchParams({ proId });
  let type = "student";
  let reqGbPosition = "1";
  if (themeType === "parent") {
    type = "parent";
    reqGbPosition = "2";
  } else if (themeType === "academy") {
    type = "academy";
    reqGbPosition = "3";
  } else if (themeType === "mentor") {
    type = "mentor";
    reqGbPosition = "4";
  }
  params.set("type", type);
  params.set("reqGbPosition", reqGbPosition);
  return `${base}?${params.toString()}`;
}
