/** 오수 원인자부담금 목록으로 복원할 때 유지하는 조회·페이징 키 */
export const SUPPORT_LIST_QUERY_KEYS = [
  "startDate",
  "endDate",
  "applicantNm",
  "addr",
  "paySta",
  "page",
] as const;

export const SUPPORT_LIST_PATH = "/adminWeb/support/list";

type SearchParamReader = {
  get: (key: string) => string | null;
  has: (key: string) => boolean;
};

export function buildSupportListSearchParams(input: {
  startDate: string;
  endDate: string;
  applicantNm: string;
  addr: string;
  paySta: string;
  page: number;
}): URLSearchParams {
  const params = new URLSearchParams();
  const page = input.page > 0 ? input.page : 1;
  params.set("startDate", input.startDate);
  params.set("endDate", input.endDate);
  params.set("applicantNm", input.applicantNm);
  params.set("addr", input.addr);
  params.set("paySta", input.paySta);
  params.set("page", String(page));
  return params;
}

export function supportListPathFromSearchParams(
  searchParams: SearchParamReader | null | undefined,
): string {
  if (!searchParams) return SUPPORT_LIST_PATH;
  const next = new URLSearchParams();
  let hasListKey = false;
  for (const key of SUPPORT_LIST_QUERY_KEYS) {
    if (!searchParams.has(key)) continue;
    hasListKey = true;
    next.set(key, searchParams.get(key) ?? "");
  }
  if (!hasListKey) return SUPPORT_LIST_PATH;
  return `${SUPPORT_LIST_PATH}?${next.toString()}`;
}

/** 상세·등록·납부내역 주소에 목록 조회 쿼리를 붙인다 */
export function appendSupportListQuery(
  pathWithQuery: string,
  listParams: URLSearchParams,
): string {
  const splitAt = pathWithQuery.indexOf("?");
  const path = splitAt >= 0 ? pathWithQuery.slice(0, splitAt) : pathWithQuery;
  const own = splitAt >= 0 ? pathWithQuery.slice(splitAt + 1) : "";
  const merged = new URLSearchParams(own);
  listParams.forEach((value, key) => {
    merged.set(key, value);
  });
  const query = merged.toString();
  return query ? `${path}?${query}` : path;
}
