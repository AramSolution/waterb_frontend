import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 학교 목록 조회 요청 파라미터
export interface GunsanSchoolsParams {
  page?: number; // 페이지 번호 (0부터 시작)
  size?: number; // 페이지 크기
  text?: string; // 검색어 (학교명 검색)
}

// 학교 정보 타입
export interface SchoolItem {
  schulNm: string; // 학교명
  schulKndScNm: string; // 학교종류
  orgRdnma: string; // 주소
  sdSchulCode?: string; // 학교 KEY값 (응답에 포함될 수 있음)
  [key: string]: any;
}

// 학교 목록 응답 타입
export interface GunsanSchoolsResponse {
  content?: SchoolItem[];
  data?: SchoolItem[];
  Array?: SchoolItem[];
  list?: SchoolItem[];
  totalElements?: number;
  totalPages?: number;
  [key: string]: any;
}

// 학급 정보 조회 요청 파라미터
export interface ClassInfoParams {
  sdSchulCode: string; // 학교 KEY값 (필수)
}

// 학급 정보 타입
export interface ClassItem {
  grade: string; // 학년
  classNm: string; // 반
  [key: string]: any;
}

// 학급 정보 응답 타입
export interface ClassInfoResponse {
  data?: ClassItem[];
  Array?: ClassItem[];
  list?: ClassItem[];
  content?: ClassItem[];
  [key: string]: any;
}

/**
 * NEIS API 서비스
 */
export class NeisService {
  /**
   * 군산 학교 목록 조회
   * @param params 페이지, 크기, 검색어
   */
  static async getGunsanSchools(
    params: GunsanSchoolsParams = {},
  ): Promise<GunsanSchoolsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) {
        queryParams.append("page", params.page.toString());
      }
      if (params.size !== undefined) {
        queryParams.append("size", params.size.toString());
      }
      if (params.text) {
        queryParams.append("text", params.text);
      }

      const path = `${API_ENDPOINTS.NEIS.GUNSAN_SCHOOLS}?${queryParams.toString()}`;
      const response = await apiClient.get<GunsanSchoolsResponse>(path);
      return response;
    } catch (error) {
      console.error("군산 학교 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "학교 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 학급 정보 조회
   * @param params 학교 KEY값
   */
  static async getClassInfo(params: ClassInfoParams): Promise<ClassItem[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("sdSchulCode", params.sdSchulCode);

      const path = `${API_ENDPOINTS.NEIS.CLASS_INFO}?${queryParams.toString()}`;
      const response = await apiClient.get<ClassInfoResponse>(path);

      // 응답 데이터 추출
      let classList: ClassItem[] = [];
      if (Array.isArray(response)) {
        classList = response;
      } else if (response && typeof response === "object") {
        if (Array.isArray(response.data)) {
          classList = response.data;
        } else if (Array.isArray(response.Array)) {
          classList = response.Array;
        } else if (Array.isArray(response.list)) {
          classList = response.list;
        } else if (Array.isArray(response.content)) {
          classList = response.content;
        }
      }

      return classList;
    } catch (error) {
      console.error("학급 정보 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "학급 정보를 불러오는 중 오류가 발생했습니다.");
    }
  }
}
