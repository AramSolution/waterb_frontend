import { apiClient, ApiError } from '@/shared/lib/apiClient';
import { API_ENDPOINTS } from '@/shared/config/apiAdmin';

/** 자녀(학생) 정보 - 부모별 자녀 목록 항목 */
export interface ArmchilChildDTO {
  /** 자녀 고유ID (C_ESNTL_ID) */
  esntlId?: string;
  /** 자녀 이름 */
  userNm?: string;
  /** 연락처 */
  mbtlnum?: string;
  /** 성별코드 */
  sexdstnCode?: string;
  /** 성별명 (M=남자, F=여자) */
  sexdstnCodeNm?: string;
  /** 목록 순번 (RNUM) */
  rnum?: number;
  /** 생년월일 (yyyy-MM-dd) */
  brthdy?: string;
  /** 주민등록번호 */
  ihidnum?: string;
  /** 프로필 사진 FILE_ID */
  userPic?: string;
  /** 프로필 사진 파일 목록 */
  userPicFiles?: Array<{ fileId?: string; seq?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

/** 부모별 자녀 목록 조회 응답 */
export interface ArmchilChildrenResponse {
  data?: ArmchilChildDTO[];
  result?: string;
  [key: string]: unknown;
}

/** 자녀 연동 등록 요청 (학생명, 성별, 연락처, 주민등록번호) */
export interface ArmchilLinkRequest {
  userNm: string;
  sexdstnCode: string;
  mbtlnum: string;
  ihidnum: string;
}

/** 연동 등록 결과 (result: "00" 성공, "01" 등 실패) */
export interface ArmchilLinkResponse {
  result?: string;
  message?: string;
}

/**
 * ARMCHIL(자녀관리) 관리자웹 API - 부모별 자녀 목록 조회
 */
export class ArmchilService {
  /**
   * 부모(학부모) 고유ID에 따른 자녀 목록 조회
   * GET /api/admin/armchil/children?pEsntlId=xxx
   * @param pEsntlId 부모(학부모) 고유ID
   */
  static async getChildren(pEsntlId: string): Promise<ArmchilChildrenResponse> {
    try {
      const url = `${API_ENDPOINTS.ADMIN_ARMCHIL.CHILDREN}?pEsntlId=${encodeURIComponent(pEsntlId)}`;
      const response = await apiClient.get<ArmchilChildrenResponse>(url);
      return response;
    } catch (error) {
      console.error('자녀 목록 조회 실패:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, '자녀 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 자녀(학생) 고유ID에 따른 학부모(보호자) 목록 조회 (학생 기준 → 학부모)
   * GET /api/admin/armchil/parents?cEsntlId=xxx
   * @param cEsntlId 자녀(학생) 고유ID
   */
  static async getParents(cEsntlId: string): Promise<ArmchilChildrenResponse> {
    try {
      const url = `${API_ENDPOINTS.ADMIN_ARMCHIL.PARENTS}?cEsntlId=${encodeURIComponent(cEsntlId)}`;
      const response = await apiClient.get<ArmchilChildrenResponse>(url);
      return response;
    } catch (error) {
      console.error('학부모 목록 조회 실패:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, '학부모 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 부모별 자녀 목록 엑셀 다운로드용 조회
   * GET /api/admin/armchil/children/excel?pEsntlId=xxx
   */
  static async getChildrenExcel(pEsntlId: string): Promise<ArmchilChildrenResponse> {
    try {
      const url = `${API_ENDPOINTS.ADMIN_ARMCHIL.CHILDREN_EXCEL}?pEsntlId=${encodeURIComponent(pEsntlId)}`;
      const response = await apiClient.get<ArmchilChildrenResponse>(url);
      return response;
    } catch (error) {
      console.error('자녀 목록 엑셀 조회 실패:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, '자녀 목록 엑셀을 불러오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 자녀 연동 등록
   * POST /api/admin/armchil/children?pEsntlId=xxx
   * @param pEsntlId 부모(학부모) 고유ID
   * @param request 학생명, 성별, 연락처, 주민등록번호 (연락처/주민번호는 숫자만 권장)
   */
  static async linkChild(
    pEsntlId: string,
    request: ArmchilLinkRequest
  ): Promise<ArmchilLinkResponse> {
    try {
      const url = `${API_ENDPOINTS.ADMIN_ARMCHIL.CHILDREN}?pEsntlId=${encodeURIComponent(pEsntlId)}`;
      const response = await apiClient.post<ArmchilLinkResponse>(url, request);
      return response;
    } catch (error) {
      console.error('자녀 연동 등록 실패:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, '자녀 연동 등록 중 오류가 발생했습니다.');
    }
  }

  /**
   * 자녀 연동 삭제
   * DELETE /api/admin/armchil/children/{pEsntlId}/{cEsntlId}
   */
  static async deleteChildLink(pEsntlId: string, cEsntlId: string): Promise<void> {
    return deleteChildLink(pEsntlId, cEsntlId);
  }
}

/**
 * 자녀 연동 삭제 (함수 export - 번들/캐시 이슈 방지)
 * DELETE /api/admin/armchil/children/{pEsntlId}/{cEsntlId}
 */
export async function deleteChildLink(pEsntlId: string, cEsntlId: string): Promise<void> {
  try {
    const url = `${API_ENDPOINTS.ADMIN_ARMCHIL.CHILDREN}/${encodeURIComponent(pEsntlId)}/${encodeURIComponent(cEsntlId)}`;
    await apiClient.delete(url);
  } catch (error) {
    console.error('자녀 연동 삭제 실패:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, '자녀 연동 삭제 중 오류가 발생했습니다.');
  }
}
