import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 프로그램 목록 조회 요청 파라미터
export interface ProgramListParams {
  searchCondition: string; // "1": 프로그램명, "2": 저장경로, "3": 한글명, "4": 프로그램설명, "5": URL
  searchKeyword: string;
  length: string;
  start: string;
  // 테이블 필터 파라미터
  filterProgrmFileNm?: string; // 프로그램명 필터
  filterProgrmStrePath?: string; // 저장경로 필터
  filterProgrmKoreanNm?: string; // 한글명 필터
  filterUrl?: string; // URL 필터
}

// 프로그램 정보 타입
export interface Program {
  rnum: number; // 번호
  progrmFileNm: string; // 프로그램명
  progrmStrePath: string; // 저장경로
  progrmKoreanNm: string; // 한글명
  progrmDc: string; // 프로그램설명
  url: string; // URL
  [key: string]: any;
}

// 프로그램 목록 응답 타입
export interface ProgramListResponse {
  resultCode?: string;
  resultMessage?: string;
  recordsFiltered?: number;
  recordsTotal?: number;
  data?: Program[];
  [key: string]: any;
}

// 프로그램 등록 요청 파라미터
export interface ProgramRegisterParams {
  progrmFileNm: string; // 프로그램명
  progrmStrePath: string; // 저장경로
  progrmKoreanNm: string; // 한글명
  progrmDc: string; // 프로그램설명
  url: string; // URL
}

// 프로그램 등록 응답 타입
export interface ProgramRegisterResponse {
  resultCode: string;
  resultMessage: string;
  [key: string]: any;
}

// 프로그램 상세 조회 요청 파라미터
export interface ProgramDetailParams {
  progrmFileNm: string; // 프로그램명
}

// 프로그램 상세 정보 타입
export interface ProgramDetail {
  progrmFileNm: string; // 프로그램명
  progrmStrePath: string; // 저장경로
  progrmKoreanNm: string; // 한글명
  progrmDc: string; // 프로그램설명
  url: string; // URL
  [key: string]: any;
}

// 프로그램 상세 조회 응답 타입
export interface ProgramDetailResponse {
  detail?: ProgramDetail;
  data?: {
    detail?: ProgramDetail;
  };
  [key: string]: any;
}

// 프로그램 수정 요청 파라미터
export interface ProgramUpdateParams {
  progrmFileNm: string; // 프로그램명 (수정 불가, 식별자)
  progrmStrePath: string; // 저장경로
  progrmKoreanNm: string; // 한글명
  progrmDc: string; // 프로그램설명
  url: string; // URL
}

// 프로그램 수정 응답 타입
export interface ProgramUpdateResponse {
  resultCode: string;
  resultMessage: string;
  [key: string]: any;
}

// 프로그램 삭제 요청 파라미터
export interface ProgramDeleteParams {
  progrmFileNm: string; // 프로그램명
}

// 프로그램 삭제 응답 타입
export interface ProgramDeleteResponse {
  resultCode: string;
  resultMessage: string;
  [key: string]: any;
}

// 프로그램 서비스
export class ProgramService {
  /**
   * 프로그램 목록 조회
   */
  static async getProgramList(
    params: ProgramListParams,
  ): Promise<ProgramListResponse> {
    try {
      const response = await apiClient.post<ProgramListResponse>(
        API_ENDPOINTS.PROGRAM.LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get program list error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "프로그램 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 프로그램 등록
   */
  static async registerProgram(
    params: ProgramRegisterParams,
  ): Promise<ProgramRegisterResponse> {
    try {
      console.log("🔍 프로그램 등록 요청:");
      console.log("  엔드포인트:", API_ENDPOINTS.PROGRAM.REGISTER);
      console.log("  파라미터:", params);

      const response = await apiClient.post<ProgramRegisterResponse>(
        API_ENDPOINTS.PROGRAM.REGISTER,
        params,
      );

      console.log("✅ 응답:", response);
      return response;
    } catch (error) {
      console.error("Register program error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "프로그램 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 프로그램 상세 조회 (화면 열기)
   */
  static async getProgramDetailScreen(
    params: ProgramDetailParams,
  ): Promise<ProgramDetailResponse> {
    try {
      const response = await apiClient.post<ProgramDetailResponse>(
        API_ENDPOINTS.PROGRAM.DETAIL_SCREEN,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get program detail screen error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "프로그램 상세 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 프로그램 수정
   */
  static async updateProgram(
    params: ProgramUpdateParams,
  ): Promise<ProgramUpdateResponse> {
    try {
      console.log("🔍 프로그램 수정 요청:");
      console.log("  엔드포인트:", API_ENDPOINTS.PROGRAM.UPDATE);
      console.log("  파라미터:", params);

      const response = await apiClient.post<ProgramUpdateResponse>(
        API_ENDPOINTS.PROGRAM.UPDATE,
        params,
      );

      console.log("✅ 응답:", response);
      return response;
    } catch (error) {
      console.error("Update program error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "프로그램 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 프로그램 삭제
   */
  static async deleteProgram(
    params: ProgramDeleteParams,
  ): Promise<ProgramDeleteResponse> {
    try {
      console.log("🔍 프로그램 삭제 요청:");
      console.log("  엔드포인트:", API_ENDPOINTS.PROGRAM.DELETE);
      console.log("  파라미터:", params);

      const response = await apiClient.post<ProgramDeleteResponse>(
        API_ENDPOINTS.PROGRAM.DELETE,
        params,
      );

      console.log("✅ 응답:", response);
      return response;
    } catch (error) {
      console.error("Delete program error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "프로그램 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 프로그램 엑셀 목록 조회
   */
  static async getProgramsExcel(
    params: Omit<ProgramListParams, "length" | "start">,
  ): Promise<ProgramListResponse> {
    try {
      const response = await apiClient.post<ProgramListResponse>(
        API_ENDPOINTS.PROGRAM.EXCEL_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get programs excel error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "프로그램 Excel 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }
}
