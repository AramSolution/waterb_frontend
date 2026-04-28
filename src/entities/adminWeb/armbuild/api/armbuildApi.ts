import { apiClient, ApiError } from "@/shared/lib/apiClient";

const ARMBUILD_BASE = "/api/admin/armbuild";

export interface ArmbuildListItem {
  buildId: string;
  gubun1?: string;
  gubun2?: string;
  buildNm?: string;
  dayVal?: number | string | null;
  buildDesc?: string | null;
  sttusCode?: string;
  chgUserId?: string;
  crtDate?: string;
  chgDate?: string;
}

/**
 * 목록 JSON 키가 `buildNm` / `build_nm` / `BUILD_NM` 등으로 올 수 있음(MyBatis 별칭·Jackson 설정 차이).
 * 용도조회 모달·원인자부담금 상세 줄 `usage` 표시에 사용.
 */
export function readArmbuildListItemBuildNm(item: ArmbuildListItem): string {
  const r = item as unknown as Record<string, unknown>;
  for (const k of ["buildNm", "build_nm", "BUILD_NM"] as const) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** 동일 이유로 `buildId` / `build_id` / `BUILD_ID` */
export function readArmbuildListItemBuildId(item: ArmbuildListItem): string {
  const r = item as unknown as Record<string, unknown>;
  for (const k of ["buildId", "build_id", "BUILD_ID"] as const) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export interface ArmbuildListResponse {
  data?: ArmbuildListItem[];
  result?: string;
  message?: string;
}

/**
 * `POST /api/admin/armbuild` body의 원소 — `ArmbuildInsertRequest` (배치 시 `items`에 넣음)
 */
export interface ArmbuildInsertBody {
  gubun1: string;
  gubun2: string;
  buildNm: string;
  dayVal?: number;
  buildDesc?: string;
  /** 신규 생략·수정 시 서버 `BUILD_ID` (일괄 응답 `buildIds`와 동일 순서) */
  buildId?: string;
}

/**
 * `POST /api/admin/armbuild` — 백엔드 `ArmbuildInsertBatchRequest`와 동일
 * @example { "items": [ { "gubun1": "01", "gubun2": "0101", "buildNm": "…", "dayVal": 12.5, "buildDesc": "…" } ] }
 */
export interface ArmbuildInsertBatchBody {
  items: ArmbuildInsertBody[];
}

/** `ArmbuildInsertBatchResponse` — `buildIds`는 `items` 입력 순서와 동일 */
export interface ArmbuildInsertResponse {
  result?: string;
  message?: string;
  buildIds?: string[];
}

export interface ArmbuildResultResponse {
  result?: string;
  message?: string;
}

export async function getArmbuildList(params: {
  gubun1: string;
  gubun2: string;
}): Promise<ArmbuildListResponse> {
  try {
    const q = new URLSearchParams({
      gubun1: params.gubun1.trim(),
      gubun2: params.gubun2.trim(),
    });
    return await apiClient.get<ArmbuildListResponse>(
      `${ARMBUILD_BASE}?${q.toString()}`,
    );
  } catch (error) {
    console.error("건축물용도 목록 조회 실패:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "건축물용도 목록 조회 중 오류가 발생했습니다.");
  }
}

/** `ArmbuildInsertResponse.result === "00"` 등 백엔드 결과 문자열 판별 */
export function isArmbuildApiSuccess(result: unknown): boolean {
  return String(result ?? "").trim() === "00";
}

/**
 * 건축물용도 일괄 저장 — body를 `items`로 감싸 `ArmbuildInsertBatchRequest` 형식으로 전송
 */
export async function insertArmbuild(
  body: ArmbuildInsertBody | ArmbuildInsertBody[],
): Promise<ArmbuildInsertResponse> {
  const items = Array.isArray(body) ? body : [body];
  const batch: ArmbuildInsertBatchBody = { items };
  try {
    return await apiClient.post<ArmbuildInsertResponse>(ARMBUILD_BASE, batch);
  } catch (error) {
    console.error("건축물용도 등록 실패:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "건축물용도 등록 중 오류가 발생했습니다.");
  }
}

/**
 * 건축물 용도 논리 삭제 — `DELETE /api/admin/armbuild/{buildId}`
 * (백엔드: `STTUS_CODE = 'D'` 업데이트)
 */
export async function deleteArmbuild(
  buildId: string,
): Promise<ArmbuildResultResponse> {
  try {
    const id = encodeURIComponent(buildId.trim());
    return await apiClient.delete<ArmbuildResultResponse>(
      `${ARMBUILD_BASE}/${id}`,
    );
  } catch (error) {
    console.error("건축물용도 삭제 실패:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "건축물용도 삭제 중 오류가 발생했습니다.");
  }
}
