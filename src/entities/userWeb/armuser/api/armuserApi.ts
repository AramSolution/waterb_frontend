import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import type {
  ArmuserDetailResponse,
  ArmuserInsertRequest,
  ArmuserResultResponse,
  ArmuserUpdateRequest,
} from "@/entities/adminWeb/armuser/api";

/**
 * 사용자웹 - ARMUSER(통합회원) API
 * GET /api/user/armuser/{esntlId} 상세 조회, POST /api/user/armuser/ 회원가입
 */
export class UserArmuserService {
  /**
   * 회원 상세 조회 (본인 또는 자녀 등)
   * @param esntlId 고유ID
   */
  static async getDetail(esntlId: string): Promise<ArmuserDetailResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/${esntlId}`;
      const response = await apiClient.get<ArmuserDetailResponse>(path);
      return response;
    } catch (error) {
      console.error("회원 상세 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 정보를 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * userWeb 메인(학원 reqGbPosition=3)에서 사용하는 로그인 학원 상세 조회
   * - GET /api/user/armuser/academy-detail
   */
  static async getAcademyDetailForMain(): Promise<ArmuserDetailResponse> {
    try {
      const response = await apiClient.get<ArmuserDetailResponse>(
        API_ENDPOINTS.ARMUSER_USER.ACADEMY_DETAIL,
      );
      return response;
    } catch (error) {
      console.error("학원 메인 상세 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "학원 메인 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 회원가입 (학생 등록 등) - JSON only
   * @param request 등록 요청 (esntlId 미입력 시 서버에서 자동 생성)
   */
  static async insertArmuser(
    request: ArmuserInsertRequest,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/`;
      const response = await apiClient.post<ArmuserResultResponse>(
        path,
        request,
      );
      return response;
    } catch (error) {
      console.error("회원가입 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원가입 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원가입 (multipart: data + userPic) - 사진 포함 시 사용
   * @param request 등록 요청
   * @param userPicFile 회원 사진 파일 (선택)
   */
  static async insertArmuserMultipart(
    request: ArmuserInsertRequest,
    userPicFile?: File,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/`;
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(request)], {
          type: "application/json",
        }),
      );
      if (userPicFile) {
        formData.append("userPic", userPicFile);
      }
      const response = await apiClient.post<ArmuserResultResponse>(
        path,
        formData,
      );
      return response;
    } catch (error) {
      console.error("회원가입 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원가입 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원가입 (multipart: data + userPic + attachFiles + bizCertFile) - 학원 등록 등
   * @param request 등록 요청
   * @param options userPic, attachFiles(복수), bizCertFile(사업자등록증 1건)
   */
  static async insertArmuserMultipartFull(
    request: ArmuserInsertRequest,
    options?: {
      userPic?: File;
      attachFiles?: File[];
      bizCertFile?: File;
    },
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/`;
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(request)], {
          type: "application/json",
        }),
      );
      if (options?.userPic) {
        formData.append("userPic", options.userPic);
      }
      if (options?.attachFiles?.length) {
        for (const f of options.attachFiles) {
          formData.append("attachFiles", f);
        }
      }
      if (options?.bizCertFile) {
        formData.append("bizCertFile", options.bizCertFile);
      }
      const response = await apiClient.post<ArmuserResultResponse>(
        path,
        formData,
      );
      return response;
    } catch (error) {
      console.error("회원가입 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원가입 중 오류가 발생했습니다.");
    }
  }

  /**
   * USER_PIC(프로필 사진) 1건 삭제 (MY PAGE 사진로고 삭제)
   * @param esntlId 고유ID
   * @param fileId 파일 ID
   * @param seq 파일 순번
   */
  static async deleteUserPic(
    esntlId: string,
    fileId: string | number,
    seq: number,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/${esntlId}/user-pic/${String(fileId)}/${seq}`;
      const response = await apiClient.delete<ArmuserResultResponse>(path);
      return response;
    } catch (error) {
      console.error("프로필 사진 삭제 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "프로필 사진 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * ATTA_FILE(첨부파일) 1건 삭제 (학원 MY PAGE)
   * @param esntlId 고유ID
   * @param fileId 파일 ID
   * @param seq 파일 순번
   */
  static async deleteAttaFile(
    esntlId: string,
    fileId: string | number,
    seq: number,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/${esntlId}/atta-file/${String(fileId)}/${seq}`;
      const response = await apiClient.delete<ArmuserResultResponse>(path);
      return response;
    } catch (error) {
      console.error("첨부파일 삭제 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "첨부파일 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * BIZNO_FILE(사업자등록증) 1건 삭제 (학원 MY PAGE)
   * @param esntlId 고유ID
   * @param fileId 파일 ID
   * @param seq 파일 순번
   */
  static async deleteBiznoFile(
    esntlId: string,
    fileId: string | number,
    seq: number,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/${esntlId}/bizno-file/${String(fileId)}/${seq}`;
      const response = await apiClient.delete<ArmuserResultResponse>(path);
      return response;
    } catch (error) {
      console.error("사업자등록증 삭제 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "사업자등록증 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원 수정 (MY PAGE - multipart: data + userPic + attachFiles + bizCertFile)
   * 학생/학부모는 userPic만, 학원은 첨부파일·사업자등록증 추가 가능
   * @param esntlId 고유ID
   * @param request 수정 요청
   * @param userPicFile 회원 사진 파일 (선택, 있으면 교체)
   * @param options attachFiles(첨부파일 복수), bizCertFile(사업자등록증 1건) — 학원 MY PAGE용
   */
  static async updateArmuserMultipart(
    esntlId: string,
    request: ArmuserUpdateRequest,
    userPicFile?: File | null,
    options?: {
      attachFiles?: File[];
      bizCertFile?: File | null;
    },
  ): Promise<ArmuserResultResponse> {
    try {
      const formData = new FormData();
      const payload = { ...request, esntlId };
      formData.append(
        "data",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
      if (userPicFile != null && userPicFile.size > 0) {
        formData.append("userPic", userPicFile);
      }
      if (options?.attachFiles?.length) {
        for (const f of options.attachFiles) {
          formData.append("attachFiles", f);
        }
      }
      if (options?.bizCertFile != null && options.bizCertFile.size > 0) {
        formData.append("bizCertFile", options.bizCertFile);
      }
      const path = `${API_ENDPOINTS.ARMUSER_USER.BASE}/${esntlId}`;
      const response = await apiClient.put<ArmuserResultResponse>(
        path,
        formData,
      );
      return response;
    } catch (error) {
      console.error("회원 수정 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 수정 중 오류가 발생했습니다.");
    }
  }
}
