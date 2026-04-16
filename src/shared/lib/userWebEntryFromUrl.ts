/**
 * User web: URL·배지·테마·사이드바·브레드크럼에서 동일한 “진입 역할” 규칙을 쓰기 위한 공통 유틸.
 * reqGbPosition=1(학생)이면 type=parent와 동시에 와도 학생으로 해석한다.
 */

export type UserWebEntryThemeType =
  | "student"
  | "parent"
  | "school"
  | "academy"
  | "mentor";

/** URL reqGbPosition(1~5 유효값)·type → 헤더/사이드바 등 표시용 배지 라벨 */
export function userWebBadgeLabelFromUrl(
  reqGbPosition: number | null,
  typeParam: string | null,
): string {
  if (reqGbPosition === 1) return "학생";
  if (typeParam === "parent" || reqGbPosition === 2) return "학부모/일반";
  if (typeParam === "school" || reqGbPosition === 5) return "기관";
  if (reqGbPosition === 3) return "학원";
  if (reqGbPosition === 4) return "멘토";
  return "학생";
}

/** URL → LayoutWrapper / data-theme용 테마 키 */
export function userWebThemeTypeFromUrl(
  reqGbPosition: number | null,
  typeParam: string | null,
): UserWebEntryThemeType {
  if (reqGbPosition === 1) return "student";
  if (typeParam === "parent" || reqGbPosition === 2) return "parent";
  if (typeParam === "school" || reqGbPosition === 5) return "school";
  if (reqGbPosition === 3) return "academy";
  if (reqGbPosition === 4) return "mentor";
  return "student";
}

/**
 * 메인·상세 간 이동 후 남는 모순 쿼리 정리 (예: reqGbPosition=1 + type=parent).
 * 홈/사이드 링크에만 사용해도 이후 로고 이동 시 헤더·본문이 어긋나지 않게 한다.
 */
export function userWebNormalizeMainQueryConflict(
  reqGbPosition: number | undefined,
  typeParam: string | null,
): { reqGbPosition: number | undefined; typeParam: string | null } {
  let r = reqGbPosition;
  let t = typeParam;
  if (r === 1 && t === "parent") t = "student";
  if (r === 2 && t === "student") t = "parent";
  return { reqGbPosition: r, typeParam: t };
}

/**
 * 지원사업 신청 URL 등에 붙일 type·reqGbPosition.
 * SNR/PNR 로그인 시 URL과 무관하게 학생·학부모 쿼리로 통일한다.
 */
export function userWebSetTypeAndReqGbForBizNav(
  params: URLSearchParams,
  options: {
    userSe: string | null | undefined;
    fallbackType?: string | null;
    fallbackReqGb?: string | null;
  },
): void {
  const { userSe, fallbackType, fallbackReqGb } = options;
  if (userSe === "SNR") {
    params.set("type", "student");
    params.set("reqGbPosition", "1");
    return;
  }
  if (userSe === "PNR") {
    params.set("type", "parent");
    params.set("reqGbPosition", "2");
    return;
  }
  const t =
    fallbackType != null && String(fallbackType).trim() !== ""
      ? String(fallbackType).trim()
      : "parent";
  params.set("type", t);
  if (fallbackReqGb != null && String(fallbackReqGb).trim() !== "") {
    params.set("reqGbPosition", String(fallbackReqGb).trim());
  }
}

/** proGb 불일치 시 Pr 리다이렉트 등 — 현재 주소줄의 type·reqGbPosition 유지 */
export function userWebPreserveTypeReqGbToParams(
  target: URLSearchParams,
  source: { get: (key: string) => string | null },
): void {
  const t = source.get("type");
  target.set("type", t != null && t.trim() !== "" ? t : "parent");
  const r = source.get("reqGbPosition");
  if (r != null && r.trim() !== "") target.set("reqGbPosition", r);
}
