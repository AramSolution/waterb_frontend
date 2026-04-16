import { apiClient } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";
import type {
  ArtapmmMentorApplicationRegisterRequest,
  ArtappmFileItem,
} from "@/entities/adminWeb/support/application/api/supportApplicationApi";
import { ApiError } from "@/shared/lib";

/** POST /api/admin/artappm/mentor-application-list 요청 */
export interface ArtapmmApplicationListRequest {
  start?: number;
  length?: number;
  /** 지원사업코드 */
  searchProId?: string;
  /** 멘토명 (USER_NM LIKE) */
  searchUserNm?: string;
}

/** ARTAPMM 전 컬럼 + ARTPROM(PRO_NM) + ARMUSER 일부 */
export interface ArtapmmApplicationListItemResponse {
  rnum?: string;
  reqId?: string;
  proId?: string;
  proSeq?: number;
  /** ARTPROM 사업명 */
  proNm?: string;
  reqEsntlId?: string;
  reqPlay?: string;
  reqDesc?: string;
  fileId?: string;
  resultGb?: string;
  reqDt?: string;
  aprrDt?: string;
  chgDt?: string;
  stopDt?: string;
  reaDesc?: string;
  collegeNm?: string;
  leaveYn?: string;
  majorNm?: string;
  schoolLvl?: number;
  studentId?: string;
  hschoolNm?: string;
  reqReason?: string;
  career?: string;
  reqSub?: string;
  joinTime?: string;
  agree1Yn?: string;
  agree2Yn?: string;
  sttusCode?: string;
  chgUserId?: string;
  crtDate?: string;
  chgDate?: string;
  userSe?: string;
  userId?: string;
  userNm?: string;
  usrTelno?: string;
  mbtlnum?: string;
  emailAdres?: string;
  brthdy?: string;
  mberSttus?: string;
  /** 상세 조회 전용 */
  fullAdres?: string;
  profileDesc?: string;
  /** GET .../mentor-applications/{reqId} — FILE_ID 기준 첨부 메타 */
  files?: ArtappmFileItem[];
}

export interface ArtapmmApplicationListApiResponse {
  data?: ArtapmmApplicationListItemResponse[];
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

/** GET .../mentor-application-duplicate */
export interface ArtapmmDuplicateCheckResponse {
  result?: string;
  duplicate?: boolean;
}

export interface ArtapmmMentorListItemResponse {
  reqId?: string;
  proId?: string;
  proSeq?: number;
  reqEsntlId?: string;
  resultGb?: string;
  resultGbNm?: string;
  sttusCode?: string;
  userNm?: string;
  mbtlnum?: string;
  profileDesc?: string;
}

export interface ArtapmmMentorItemSaveRequest {
  reqId?: string;
  reqEsntlId?: string;
  /** 선정여부 (Y/N/R) */
  resultGb?: string;
  /** 상태 (A/D 등) */
  sttusCode?: string;
}

export interface ArtapmmMentorSaveRequest {
  proSeq?: number;
  items?: ArtapmmMentorItemSaveRequest[];
}

export interface ArtappmResultResponse {
  result?: string; // "00": 성공, "01": 실패
  message?: string;
}

export const ArtappmService = {
  /**
   * 멘토 신청(ARTAPMM) 목록 — 사업별·멘토명 검색·페이징
   * 백엔드: POST /api/admin/artappm/mentor-application-list
   */
  async getMentorApplicationList(
    request: ArtapmmApplicationListRequest,
  ): Promise<ArtapmmApplicationListApiResponse> {
    return await apiClient.post<ArtapmmApplicationListApiResponse>(
      API_ENDPOINTS.SUPPORT.MENTOR_APPLICATION_LIST,
      request,
    );
  },

  /** 동일 사업·회차에 해당 멘토 활성 신청 건 존재 여부 (등록 전 검증) */
  async checkMentorApplicationDuplicate(
    proId: string,
    reqEsntlId: string,
    proSeq = 0,
  ): Promise<ArtapmmDuplicateCheckResponse> {
    const pid = proId?.trim() ?? "";
    const id = reqEsntlId?.trim() ?? "";
    if (!pid || !id) {
      return { result: "00", duplicate: false };
    }
    const params = new URLSearchParams();
    params.set("reqEsntlId", id);
    params.set("proSeq", String(proSeq));
    return await apiClient.get<ArtapmmDuplicateCheckResponse>(
      `${API_ENDPOINTS.SUPPORT.MENTOR_APPLICATION_DUPLICATE_CHECK(pid)}?${params.toString()}`,
    );
  },

  /** GET — 멘토 신청 단건 (수정 폼 로드) */
  async getMentorApplicationDetail(
    proId: string,
    reqId: string,
  ): Promise<ArtapmmApplicationListItemResponse | null> {
    const pid = proId?.trim() ?? "";
    const rid = reqId?.trim() ?? "";
    if (!pid || !rid) {
      return null;
    }
    try {
      return await apiClient.get<ArtapmmApplicationListItemResponse>(
        API_ENDPOINTS.SUPPORT.MENTOR_APPLICATION_DETAIL(pid, rid),
      );
    } catch {
      return null;
    }
  },

  /**
   * POST multipart — 멘토 신청 등록 (mentorApplicationFiles 또는 artappmFiles)
   */
  async registerMentorApplication(
    proId: string,
    data: ArtapmmMentorApplicationRegisterRequest,
    files?: File[],
  ): Promise<ArtappmResultResponse> {
    const pid = proId?.trim() ?? "";
    if (!pid) {
      throw new ApiError(0, "사업코드가 필요합니다.");
    }
    try {
      const formData = new FormData();
      const jsonString = JSON.stringify(data, (_key, value) => {
        if (value === null || value === undefined) {
          return undefined;
        }
        return value;
      });
      formData.append(
        "data",
        new Blob([jsonString], { type: "application/json" }),
        "data.json",
      );
      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append("mentorApplicationFiles", file);
        });
      }
      return await apiClient.post<ArtappmResultResponse>(
        API_ENDPOINTS.SUPPORT.MENTOR_APPLICATION_REGISTER(pid),
        formData,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "멘토 신청 등록 중 오류가 발생했습니다.");
    }
  },

  /** PUT multipart — 멘토 신청 수정 */
  async updateMentorApplication(
    proId: string,
    reqId: string,
    data: ArtapmmMentorApplicationRegisterRequest,
    files?: File[],
  ): Promise<ArtappmResultResponse> {
    const pid = proId?.trim() ?? "";
    const rid = reqId?.trim() ?? "";
    if (!pid || !rid) {
      throw new Error("사업코드와 신청ID가 필요합니다.");
    }
    const formData = new FormData();
    const jsonString = JSON.stringify(data, (_key, value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      return value;
    });
    formData.append(
      "data",
      new Blob([jsonString], { type: "application/json" }),
      "data.json",
    );
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("mentorApplicationFiles", file);
      });
    }
    return await apiClient.put<ArtappmResultResponse>(
      API_ENDPOINTS.SUPPORT.MENTOR_APPLICATION_UPDATE(pid, rid),
      formData,
    );
  },

  async getMentorList(proId: string): Promise<ArtapmmMentorListItemResponse[]> {
    return await apiClient.get<ArtapmmMentorListItemResponse[]>(
      API_ENDPOINTS.SUPPORT.MENTOR_LIST(proId),
    );
  },

  async saveMentorList(
    proId: string,
    request: ArtapmmMentorSaveRequest,
  ): Promise<ArtappmResultResponse> {
    return await apiClient.put<ArtappmResultResponse>(
      API_ENDPOINTS.SUPPORT.MENTOR_LIST(proId),
      request,
    );
  },

  async deleteMentor(reqId: string): Promise<ArtappmResultResponse> {
    return await apiClient.delete<ArtappmResultResponse>(
      API_ENDPOINTS.SUPPORT.MENTOR_DELETE(reqId),
    );
  },
};

