import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiUser";

/** 자녀(학생) 정보 - 부모별 자녀 목록 항목 (userPicFiles의 fileId는 string) */
export interface ArmchilChildDTO {
  esntlId?: string;
  userNm?: string;
  mbtlnum?: string;
  sexdstnCode?: string;
  sexdstnCodeNm?: string;
  rnum?: number;
  brthdy?: string;
  ihidnum?: string;
  userPic?: string;
  userPicFiles?: Array<{
    fileId?: string;
    seq?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/** 자녀 목록 조회 응답 */
export interface ArmchilChildrenResponse {
  data?: ArmchilChildDTO[];
  result?: string;
  [key: string]: unknown;
}

/** 자녀 연동 등록 요청 */
export interface ArmchilLinkRequest {
  userNm: string;
  sexdstnCode: string;
  mbtlnum: string;
  ihidnum: string;
}

/** 연동 등록 결과 */
export interface ArmchilLinkResponse {
  result?: string;
  message?: string;
}

const BASE = API_ENDPOINTS.USER_ARMCHIL.CHILDREN;
const PARENTS_BASE = API_ENDPOINTS.USER_ARMCHIL.PARENTS;

/**
 * 사용자웹 - ARMCHIL(자녀연동) API
 * 로그인한 학부모 기준: GET/POST/DELETE /api/user/armchil/children (pEsntlId 없음)
 */
export class UserArmchilService {
  /**
   * 로그인한 학생의 보호자(학부모) 목록 조회
   * GET /api/user/armchil/parents — ArmchilUserController.getParents()
   */
  static async getParents(): Promise<ArmchilChildrenResponse> {
    try {
      const response = await apiClient.get<ArmchilChildrenResponse>(
        PARENTS_BASE,
      );
      return response;
    } catch (error) {
      console.error("보호자 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "보호자 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 로그인한 학부모의 자녀 목록 조회
   * GET /api/user/armchil/children
   */
  static async getChildren(): Promise<ArmchilChildrenResponse> {
    try {
      const response = await apiClient.get<ArmchilChildrenResponse>(BASE);
      return response;
    } catch (error) {
      console.error("자녀 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "자녀 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 자녀 연동 등록
   * POST /api/user/armchil/children
   */
  static async linkChild(
    request: ArmchilLinkRequest,
  ): Promise<ArmchilLinkResponse> {
    try {
      const response = await apiClient.post<ArmchilLinkResponse>(BASE, request);
      return response;
    } catch (error) {
      console.error("자녀 연동 등록 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "자녀 연동 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 자녀 연동 삭제
   * DELETE /api/user/armchil/children/{cEsntlId}
   * @param cEsntlId 자녀 고유ID (string 유지 - user-web fileId 규칙)
   */
  static async deleteChildLink(cEsntlId: string): Promise<void> {
    try {
      const path = `${BASE}/${encodeURIComponent(cEsntlId)}`;
      await apiClient.delete(path);
    } catch (error) {
      console.error("자녀 연동 삭제 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "자녀 연동 삭제 중 오류가 발생했습니다.");
    }
  }
}
