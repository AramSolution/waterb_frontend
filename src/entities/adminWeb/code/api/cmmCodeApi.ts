import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 공통코드 목록 조회 요청 파라미터
export interface CmmCodeListParams {
  searchCondition?: string; // "1": 코드ID, "2": 코드명, "3": 분류코드명
  searchKeyword?: string;
  searchUseAt?: string; // 사용여부: "Y" 또는 "N"
  length?: string;
  start?: string;
  // 테이블 필터 파라미터
  filterCodeId?: string; // 코드ID 필터
  filterCodeIdNm?: string; // 코드명 필터
  filterClCodeNm?: string; // 분류코드명 필터
  filterUseAt?: string; // 사용여부 필터
}

// 공통코드 정보 타입
export interface CmmCode {
  rnum: number; // 번호
  codeId: string; // 코드ID
  codeIdNm: string; // 코드명
  codeIdDc?: string; // 코드설명
  useAt: string; // 사용여부 (Y/N)
  clCode: string; // 분류코드
  clCodeNm: string; // 분류코드명
  [key: string]: any;
}

// 공통코드 목록 응답 타입
export interface CmmCodeListResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  data?: CmmCode[];
  Array?: CmmCode[];
  list?: CmmCode[];
  content?: CmmCode[];
  [key: string]: any;
}

// 공통분류코드 정보 타입
export interface ClCode {
  clCode: string; // 분류코드
  clCodeNm: string; // 분류코드명
  [key: string]: any;
}

// 공통분류코드 목록 응답 타입
export interface ClCodeListResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  codeList?: ClCode[];
  codeDetailList?: ClCode[];
  data?: ClCode[];
  Array?: ClCode[];
  list?: ClCode[];
  content?: ClCode[];
  [key: string]: any;
}

// 소분류코드 목록 조회 요청 파라미터
export interface CmmDetailCodeListParams {
  searchCondition?: string; // 코드ID (백엔드 쿼리에서 searchCondition으로 사용)
  searchUseAt?: string; // 사용여부: "Y" 또는 "N" (백엔드 쿼리에서 searchUseAt으로 사용)
  length?: string;
  start?: string;
  // 테이블 필터 파라미터
  filterCode?: string; // 상세코드 필터
  filterCodeNm?: string; // 상세코드명 필터
  filterOrderBy?: string; // 순서 필터
  filterUseAt?: string; // 사용여부 필터
}

// 소분류코드 정보 타입
export interface CmmDetailCode {
  rnum: number; // 번호
  code: string; // 상세코드
  codeNm: string; // 상세코드명
  orderBy: number | string; // 순서
  useAt: string; // 사용여부 (Y/N)
  [key: string]: any;
}

// 소분류코드 목록 응답 타입
export interface CmmDetailCodeListResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  data?: CmmDetailCode[];
  Array?: CmmDetailCode[];
  list?: CmmDetailCode[];
  content?: CmmDetailCode[];
  [key: string]: any;
}

// 대분류코드 등록 요청 파라미터
export interface InsertCmmCodeParams {
  clCode: string; // 분류코드
  codeIdNum: string; // 코드ID 입력값 (3자리 숫자)
  codeIdNm: string; // 코드ID명
  codeIdDc?: string; // 코드ID설명
  useAt: string; // 사용여부 (Y/N)
}

// 대분류코드 등록 응답 타입
export interface InsertCmmCodeResponse {
  result?: string;
  resultCode?: string;
  message?: string;
  resultMessage?: string;
  data?: any;
  [key: string]: any;
}

// 대분류코드 상세 조회 요청 파라미터
export interface CmmCodeDetailParams {
  codeId: string; // 코드ID
}

// 대분류코드 상세 조회 응답 타입
export interface CmmCodeDetailResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  data?: CmmCode;
  [key: string]: any;
}

// 대분류코드 수정 요청 파라미터
export interface UpdateCmmCodeParams {
  codeId: string; // 코드ID
  codeIdNm: string; // 코드ID명
  codeIdDc?: string; // 코드ID설명
  useAt: string; // 사용여부 (Y/N)
}

// 대분류코드 수정 응답 타입
export interface UpdateCmmCodeResponse {
  result?: string;
  resultCode?: string;
  message?: string;
  resultMessage?: string;
  data?: any;
  [key: string]: any;
}

// 대분류코드 삭제 요청 파라미터
export interface DeleteCmmCodeParams {
  codeId: string; // 코드ID (필수)
}

// 대분류코드 삭제 응답 타입
export interface DeleteCmmCodeResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  message?: string;
  data?: any;
  [key: string]: any;
}

/** 소분류 코드 한 건 (GET /api/cont/code/{codeId}/details 응답 항목) */
export interface DetailCodeItem {
  codeId: string;
  code: string;
  codeNm: string;
  codeDc?: string;
}

/** GET /api/cont/code/{codeId}/details/by-category — selectLetDetailCodeListByCategory */
export interface DetailCodeListByCategoryItem {
  codeCategory?: string;
  codeId?: string;
  code?: string;
  codeNm?: string;
  codeDc?: string;
}

// 코드ID 목록 조회 요청 파라미터
export interface CodeIdListParams {
  clCode: string; // 분류코드 (필수)
}

// 코드ID 정보 타입
export interface CodeId {
  codeId: string; // 코드ID
  codeIdNm: string; // 코드ID명
  [key: string]: any;
}

// 코드ID 목록 응답 타입
export interface CodeIdListResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  data?: CodeId[];
  Array?: CodeId[];
  list?: CodeId[];
  [key: string]: any;
}

// 소분류코드 등록 요청 파라미터
export interface InsertCmmDetailCodeParams {
  codeId: string; // 코드ID (필수)
  code: string; // 상세코드 (필수)
  codeNm: string; // 상세코드명 (필수)
  codeDc?: string; // 상세코드설명
  orderBy?: number; // 순서
  useAt?: string; // 사용여부 (Y/N)
}

// 소분류코드 등록 응답 타입
export interface InsertCmmDetailCodeResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  message?: string;
  data?: any;
  [key: string]: any;
}

// 소분류코드 상세 조회 요청 파라미터
export interface CmmDetailCodeDetailParams {
  codeId: string; // 코드ID (필수)
  code: string; // 상세코드 (필수)
}

// 소분류코드 상세 정보 타입
export interface CmmDetailCodeDetail {
  codeId: string; // 코드ID
  code: string; // 상세코드
  codeNm: string; // 상세코드명
  codeDc?: string; // 상세코드설명
  orderBy?: number; // 순서
  useAt?: string; // 사용여부 (Y/N)
  [key: string]: any;
}

// 소분류코드 상세 조회 응답 타입
export interface CmmDetailCodeDetailResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  message?: string;
  data?: CmmDetailCodeDetail;
  [key: string]: any;
}

// 소분류코드 수정 요청 파라미터
export interface UpdateCmmDetailCodeParams {
  codeId: string; // 코드ID (필수)
  code: string; // 상세코드 (필수)
  codeNm: string; // 상세코드명 (필수)
  codeDc?: string; // 상세코드설명
  orderBy?: number; // 순서
  useAt?: string; // 사용여부 (Y/N)
}

// 소분류코드 수정 응답 타입
export interface UpdateCmmDetailCodeResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  message?: string;
  data?: any;
  [key: string]: any;
}

export class CmmCodeService {
  // 공통코드 목록 조회
  static async getCmmCodeList(
    params: CmmCodeListParams,
  ): Promise<CmmCodeListResponse> {
    try {
      const response = await apiClient.post<CmmCodeListResponse>(
        API_ENDPOINTS.CODE.CMM_CODE_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("공통코드 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "공통코드 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  // 공통코드 엑셀 목록 조회
  static async getCmmCodesExcel(
    params: Omit<CmmCodeListParams, "length" | "start">,
  ): Promise<CmmCodeListResponse> {
    try {
      const response = await apiClient.post<CmmCodeListResponse>(
        API_ENDPOINTS.CODE.CMM_CODE_EXCEL_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("공통코드 엑셀 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "공통코드 Excel 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  // 공통분류코드 목록 조회
  static async getClCodeList(): Promise<ClCodeListResponse> {
    try {
      const response = await apiClient.post<ClCodeListResponse>(
        API_ENDPOINTS.CODE.CL_CODE_LIST,
        {},
      );
      return response;
    } catch (error) {
      console.error("공통분류코드 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "공통분류코드 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * codeId별 소분류 코드 목록 조회 (GET /api/cont/code/{codeId}/details)
   * 사업대상(EDR003) 등 소분류 코드 목록 조회용
   */
  static async getDetailCodeListByCodeId(
    codeId: string,
  ): Promise<DetailCodeItem[]> {
    try {
      const path = `${API_ENDPOINTS.CODE.DETAIL_LIST_BASE}/${encodeURIComponent(codeId)}/details`;
      const response = await apiClient.get<
        DetailCodeItem[] | { data?: DetailCodeItem[] }
      >(path);
      const list = Array.isArray(response)
        ? response
        : ((response as { data?: DetailCodeItem[] })?.data ?? []);
      return list;
    } catch (error) {
      console.error("소분류 코드 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "소분류 코드 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 소분류 코드 목록 (학교급·카테고리별). GET /api/cont/code/{codeId}/details/by-category?studentCode=
   * 백엔드 selectLetDetailCodeListByCategory (studentCode: M|H 등)
   */
  static async getDetailCodeListByCategory(
    codeId: string,
    studentCode?: string,
  ): Promise<DetailCodeListByCategoryItem[]> {
    try {
      const path = `${API_ENDPOINTS.CODE.DETAIL_LIST_BASE}/${encodeURIComponent(codeId)}/details/by-category`;
      const params = new URLSearchParams();
      if (studentCode != null && studentCode !== "") {
        params.set("studentCode", studentCode);
      }
      const qs = params.toString();
      const url = qs ? `${path}?${qs}` : path;
      const response = await apiClient.get<
        | DetailCodeListByCategoryItem[]
        | { data?: DetailCodeListByCategoryItem[] }
      >(url);
      const list = Array.isArray(response)
        ? response
        : ((response as { data?: DetailCodeListByCategoryItem[] })?.data ??
          []);
      return list;
    } catch (error) {
      console.error("소분류 코드(by-category) 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "소분류 코드 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  // 소분류코드 목록 조회
  static async getCmmDetailCodeList(
    params: CmmDetailCodeListParams,
  ): Promise<CmmDetailCodeListResponse> {
    try {
      const response = await apiClient.post<CmmDetailCodeListResponse>(
        API_ENDPOINTS.CODE.CMM_DETAIL_CODE_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("소분류코드 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "소분류코드 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  // 소분류코드 엑셀 목록 조회
  static async getCmmDetailCodesExcel(
    params: Omit<CmmDetailCodeListParams, "length" | "start">,
  ): Promise<CmmDetailCodeListResponse> {
    try {
      const response = await apiClient.post<CmmDetailCodeListResponse>(
        API_ENDPOINTS.CODE.CMM_DETAIL_CODE_EXCEL_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("소분류코드 엑셀 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "소분류코드 Excel 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  // 대분류코드 등록
  static async insertCmmCode(
    params: InsertCmmCodeParams,
  ): Promise<InsertCmmCodeResponse> {
    try {
      const response = await apiClient.post<InsertCmmCodeResponse>(
        API_ENDPOINTS.CODE.INSERT_CMM_CODE,
        params,
      );
      return response;
    } catch (error) {
      console.error("대분류코드 등록 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "대분류코드 등록 중 오류가 발생했습니다.");
    }
  }

  // 대분류코드 상세 조회
  static async getCmmCodeDetail(
    params: CmmCodeDetailParams,
  ): Promise<CmmCodeDetailResponse> {
    try {
      const response = await apiClient.post<CmmCodeDetailResponse>(
        API_ENDPOINTS.CODE.CMM_CODE_DETAIL,
        params,
      );
      return response;
    } catch (error) {
      console.error("대분류코드 상세 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "대분류코드 상세 조회 중 오류가 발생했습니다.");
    }
  }

  // 대분류코드 수정
  static async updateCmmCode(
    params: UpdateCmmCodeParams,
  ): Promise<UpdateCmmCodeResponse> {
    try {
      const response = await apiClient.post<UpdateCmmCodeResponse>(
        API_ENDPOINTS.CODE.UPDATE_CMM_CODE,
        params,
      );
      return response;
    } catch (error) {
      console.error("대분류코드 수정 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "대분류코드 수정 중 오류가 발생했습니다.");
    }
  }

  // 대분류코드 삭제
  static async deleteCmmCode(
    params: DeleteCmmCodeParams,
  ): Promise<DeleteCmmCodeResponse> {
    try {
      const response = await apiClient.post<DeleteCmmCodeResponse>(
        API_ENDPOINTS.CODE.DELETE_CMM_CODE,
        params,
      );
      return response;
    } catch (error) {
      console.error("대분류코드 삭제 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "대분류코드 삭제 중 오류가 발생했습니다.");
    }
  }

  // 코드ID 목록 조회
  static async getCodeIdList(
    params: CodeIdListParams,
  ): Promise<CodeIdListResponse> {
    try {
      const response = await apiClient.post<CodeIdListResponse>(
        API_ENDPOINTS.CODE.CODE_ID_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("코드ID 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "코드ID 목록 조회 중 오류가 발생했습니다.");
    }
  }

  // 소분류코드 등록
  static async insertCmmDetailCode(
    params: InsertCmmDetailCodeParams,
  ): Promise<InsertCmmDetailCodeResponse> {
    try {
      const response = await apiClient.post<InsertCmmDetailCodeResponse>(
        API_ENDPOINTS.CODE.INSERT_CMM_DETAIL_CODE,
        params,
      );
      return response;
    } catch (error) {
      console.error("소분류코드 등록 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "소분류코드 등록 중 오류가 발생했습니다.");
    }
  }

  // 소분류코드 상세 조회
  static async getCmmDetailCodeDetail(
    params: CmmDetailCodeDetailParams,
  ): Promise<CmmDetailCodeDetailResponse> {
    try {
      const response = await apiClient.post<CmmDetailCodeDetailResponse>(
        API_ENDPOINTS.CODE.CMM_DETAIL_CODE_DETAIL,
        params,
      );
      return response;
    } catch (error) {
      console.error("소분류코드 상세 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "소분류코드 상세 조회 중 오류가 발생했습니다.");
    }
  }

  // 소분류코드 수정
  static async updateCmmDetailCode(
    params: UpdateCmmDetailCodeParams,
  ): Promise<UpdateCmmDetailCodeResponse> {
    try {
      const response = await apiClient.post<UpdateCmmDetailCodeResponse>(
        API_ENDPOINTS.CODE.UPDATE_CMM_DETAIL_CODE,
        params,
      );
      return response;
    } catch (error) {
      console.error("소분류코드 수정 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "소분류코드 수정 중 오류가 발생했습니다.");
    }
  }

  // 소분류코드 삭제
  static async deleteCmmDetailCode(
    params: DeleteCmmDetailCodeParams,
  ): Promise<DeleteCmmDetailCodeResponse> {
    try {
      const response = await apiClient.post<DeleteCmmDetailCodeResponse>(
        API_ENDPOINTS.CODE.DELETE_CMM_DETAIL_CODE,
        params,
      );
      return response;
    } catch (error) {
      console.error("소분류코드 삭제 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "소분류코드 삭제 중 오류가 발생했습니다.");
    }
  }
}

// 소분류코드 삭제 요청 파라미터
export interface DeleteCmmDetailCodeParams {
  codeId: string; // 코드ID (필수)
  code: string; // 상세코드 (필수)
}

// 소분류코드 삭제 응답 타입
export interface DeleteCmmDetailCodeResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  message?: string;
  data?: any;
  [key: string]: any;
}

/** 건축용도 소분류 (building-use-codes 트리 children) */
export interface BuildingUseCodeChildDto {
  code: string;
  name: string;
}

/** 건축용도 중분류 + 소분류 트리 노드 — GET /api/cont/code/building-use-codes */
export interface BuildingUseCodeTreeDto {
  code: string;
  name: string;
  children?: BuildingUseCodeChildDto[];
}

/**
 * 건축용도 코드 트리 (중분류 + 소분류 children).
 * GET /api/cont/code/building-use-codes
 */
export async function getBuildingUseCodeList(): Promise<BuildingUseCodeTreeDto[]> {
  return apiClient.get<BuildingUseCodeTreeDto[]>(
    "/api/cont/code/building-use-codes",
  );
}
