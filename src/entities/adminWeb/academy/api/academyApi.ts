import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 학원 정보 타입
export interface Academy {
  rnum?: string; // 번호 (DB에서 내려주는 순번)
  academyId: string; // 학원 ID
  academyName: string; // 학원명
  address: string; // 주소
  subject: string; // 취급과목
  status: string; // 상태 코드 (예: A/P/D)
  statusNm?: string; // 상태명 (예: 신청/가입/탈퇴)
  [key: string]: any;
}

// 학원 목록 조회 요청 파라미터
export interface AcademyListParams {
  academyName: string; // 학원명 검색어
  status: string; // 상태 코드 ("" 전체, "A" 신청, "P" 가입, "D" 탈퇴 등)
  length: string; // 페이지 사이즈
  start: string; // 시작 인덱스 (0부터 시작)
}

// 학원 목록 응답 타입
export interface AcademyListResponse {
  result?: string;
  recordsFiltered?: string | number;
  recordsTotal?: string | number;
  data?: Academy[];
  Array?: Academy[];
  [key: string]: any;
}

// 학원 삭제 요청 파라미터
export interface AcademyDeleteParams {
  academyId: string;
}

// 학원 서비스
export class AcademyService {
  /**
   * 학원 목록 조회
   */
  static async getAcademies(
    params: AcademyListParams,
  ): Promise<AcademyListResponse> {
    try {
      const response = await apiClient.post<AcademyListResponse>(
        API_ENDPOINTS.ACADEMY.LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get academies error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "학원 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 학원 삭제
   */
  static async deleteAcademy(
    params: AcademyDeleteParams,
  ): Promise<{ result?: string; message?: string }> {
    try {
      const response = await apiClient.post<{ result?: string; message?: string }>(
        API_ENDPOINTS.ACADEMY.DELETE,
        params,
      );
      return response;
    } catch (error) {
      console.error("Delete academy error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "학원 삭제 중 오류가 발생했습니다.");
    }
  }
}


