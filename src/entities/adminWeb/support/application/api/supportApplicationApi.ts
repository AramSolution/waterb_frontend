import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 신청 등록/수정 요청 파라미터
export interface ArtappmInsertRequest {
  /** 지원사업신청ID (수정 시 필수, 등록 시 서버 채번) */
  reqId?: string;
  /** 신청순번 (REQ_PRO_SEQ) */
  reqProSeq?: string;
  proId?: string; // 사업코드
  proNm?: string; // 사업명 (ARTAPPS 등록 시 필수)
  proSeq?: string; // 사업순번
  reqEsntlId?: string; // 신청자(등록자) ID — 학부모 신청 시 보호자 ID
  /** 학생(자녀) 고유ID — 학부모 신청 시 필수, REQ_ESNTL_ID와 별도 */
  cEsntlId?: string;
  proType?: string; // 01:1인탐구형, 02:모둠 탐구형
  pEsntlId?: string; // 학부모ID
  headNm?: string; // 세대주명
  pUserNm?: string; // 보호자명
  mbtlnum?: string; // 보호자 연락처
  brthdy?: string; // 보호자 생년월일
  pIhidnum?: string; // 학부모 주민번호
  cIhidnum?: string; // 학생 주민번호
  certYn?: string; // 인증여부
  crtfcDnValue?: string; // 인증값
  /** 학교 ID (sdSchulCode, NEIS 학교 KEY) - 상세 조회 시 학교명·학년·반 표시에 사용 */
  schoolId?: string;
  schoolGb?: string; // 학교구분
  schoolNm?: string; // 학교명
  schoolLvl?: number; // 학년
  schoolNo?: number; // 반
  payBankCode?: string; // 은행코드
  payBank?: string; // 은행명
  holderNm?: string; // 예금주
  reqPart?: string; // 신청분야
  playPart?: string; // 활동범위
  reqObj?: string; // 목적
  reqPlay?: string; // 활동내용
  reqPlan?: string; // 예산 사용계획
  mchilYn?: string; // 다자녀유무
  mchilNm?: string; // 다자녀명
  reqDesc?: string; // 기타
  fileId?: string; // 파일ID
  fileSeqs?: number[]; // 첨부파일별 seq
  resultGb?: string; // 결과구분
  /** 공부의 명수 신청ID(REQ_APPS_ID) */
  reqAppsId?: string;
  reqDt?: string; // 신청일시
  workDt?: string; // 상담일자 (ARTAPPM.WORK_DT)
  aprrDt?: string; // 승인일시
  chgDt?: string; // 변경일시
  stopDt?: string; // 중단일시
  reaDesc?: string; // 사유
  sttusCode?: string; // 상태코드
  UNIQ_ID?: string; // 고유ID
  /** ARTPROM.PRO_GB (공부의 명수 08) */
  proGb?: string;
  /** ARTAPPS (insertArtapps와 동일 필드명) */
  proGbn?: string;
  proGbnEtc?: string;
  reqSub?: string;
  joinCnt?: string;
  befJoin?: string;
  joinTime?: string;
  joinTimeCon?: string;
  sUnder?: string;
  sTarget?: string;
  sChar?: string;
  sReason?: string;
  sExpect?: string;
  sAppr?: string;
  sComm?: string;
  agree1Yn?: string;
  agree2Yn?: string;
  agree3Yn?: string;
}

// 신청 등록 응답
export interface ArtappmResultResponse {
  result?: string; // "00": 성공, "01": 실패
  message?: string; // 메시지
  [key: string]: any;
}

/** POST .../mentor-applications JSON 파트 (백엔드 ArtapmmMentorApplicationRegisterRequest, ARTAPMM 컬럼) */
export interface ArtapmmMentorApplicationRegisterRequest {
  proSeq?: number;
  reqEsntlId: string;
  reqPlay?: string;
  reqDesc?: string;
  fileId?: string;
  fileSeqs?: number[];
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
  sttusCode?: string;
  /** ARTAPMM.REQ_SUB (CHAR 4) */
  reqSub?: string;
  /** ARTAPMM.JOIN_TIME (VARCHAR 64) */
  joinTime?: string;
  /** ARTAPMM.AGREE1_YN */
  agree1Yn?: string;
  /** ARTAPMM.AGREE2_YN */
  agree2Yn?: string;
  uniqId?: string;
}

// 상세 조회 시 첨부파일 항목 (백엔드 FileDTO 매핑)
export interface ArtappmFileItem {
  fileId?: string | number; // string | number로 변경 (18자리 숫자 정밀도 문제 해결)
  seq?: string | number; // string | number로 변경
  orgfNm?: string;
  saveNm?: string;
  filePath?: string;
  fileExt?: string;
  fileSize?: number;
  fileType?: string;
  sttusCode?: string;
  [key: string]: unknown;
}

// 신청 상세 응답
export interface ArtappmDetailResponse {
  result?: string;
  detail?: any;
  files?: ArtappmFileItem[];
  [key: string]: any;
}

/** POST /api/admin/artapps/application-list 요청 */
export interface ArtappsApplicationListRequestBody {
  searchProId: string;
  searchUserNm?: string;
  start?: number;
  length?: number;
}

/**
 * POST /api/admin/artapps/application-list 응답 `data[]` 1행.
 * 백엔드 ArtappsApplicationListRowDTO와 필드명·의미 동일 (Jackson camelCase).
 */
export interface ArtappsApplicationListRow {
  rnum?: string;
  reqId?: string;
  proId?: string;
  proSeq?: string;
  reqProSeq?: string;
  sttusCode?: string;
  sttusCodeNm?: string;
  /** 학생명 */
  userNm?: string;
  /** 학생 연락처(마스킹, ARMUSER MBTLNUM) */
  cmbtlnum?: string;
  /** ARMUSER USR_TELNO(복호화·마스킹) */
  usrTelno?: string;
  schoolNm?: string;
  /** 학년반 요약 */
  schoolClass?: string;
  pUserNm?: string;
  /** 보호자 연락처(마스킹) */
  mbtlnum?: string;
  proGbn?: string;
  proGbnEtc?: string;
  reqSub?: string;
  joinCnt?: string;
  befJoin?: string;
  joinTime?: string;
  joinTimeCon?: string;
  sUnder?: string;
  sTarget?: string;
  sChar?: string;
  sReason?: string;
  sExpect?: string;
  sAppr?: string;
  sComm?: string;
  /** 신청일시 (서버 Date → JSON 문자열) */
  reqDt?: string;
}

/** POST /api/admin/artapps/application-list 본문. 백엔드 ArtappsApplicationListResponse와 동일 구조 */
export interface ArtappsApplicationListApiResponse {
  data?: ArtappsApplicationListRow[];
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

/**
 * 지원사업 신청 API 서비스
 */
export class SupportApplicationService {
  /**
   * 신청 등록
   * @param data 신청 데이터
   * @param files 첨부파일 배열
   */
  static async insertArtappm(
    data: ArtappmInsertRequest,
    files?: File[],
  ): Promise<ArtappmResultResponse> {
    try {
      // 디버깅: API 전송 전 데이터 확인
      console.log("API 전송 전 data:", data);
      console.log("pEsntlId:", data.pEsntlId);
      console.log("pUserNm:", data.pUserNm);

      const formData = new FormData();

      // JSON 데이터를 Blob으로 변환하여 추가 (Content-Type 명시)
      const jsonString = JSON.stringify(data, (key, value) => {
        // 빈 문자열도 포함하도록 (null이나 undefined만 제외)
        if (value === null || value === undefined) {
          return undefined; // undefined는 JSON에서 제외됨
        }
        return value;
      });
      console.log("JSON 직렬화된 데이터:", jsonString);
      console.log(
        "JSON에 pEsntlId 포함 여부:",
        jsonString.includes('"pEsntlId"'),
      );
      console.log(
        "JSON에 pUserNm 포함 여부:",
        jsonString.includes('"pUserNm"'),
      );
      if (jsonString.includes('"pEsntlId"')) {
        const pEsntlIdMatch = jsonString.match(/"pEsntlId"\s*:\s*"([^"]*)"/);
        console.log(
          "JSON에서 추출한 pEsntlId 값:",
          pEsntlIdMatch ? pEsntlIdMatch[1] : "없음",
        );
      }
      if (jsonString.includes('"pUserNm"')) {
        const pUserNmMatch = jsonString.match(/"pUserNm"\s*:\s*"([^"]*)"/);
        console.log(
          "JSON에서 추출한 pUserNm 값:",
          pUserNmMatch ? pUserNmMatch[1] : "없음",
        );
      }

      const jsonBlob = new Blob([jsonString], {
        type: "application/json",
      });
      formData.append("data", jsonBlob, "data.json");

      const isArtapps = data.proGb === "08" || data.proGb === "09";

      // 첨부파일 추가
      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append(isArtapps ? "artappsFiles" : "artappmFiles", file);
        });
      }

      // FormData는 브라우저가 자동으로 Content-Type과 boundary를 설정하므로
      // 명시적으로 Content-Type을 설정하지 않음
      const registerEndpoint =
        isArtapps
          ? API_ENDPOINTS.ARTAPPS.REGISTER
          : API_ENDPOINTS.SUPPORT.APPLICATION_REGISTER;

      const response = await apiClient.post<ArtappmResultResponse>(
        registerEndpoint,
        formData,
      );

      return response;
    } catch (error) {
      console.error("신청 등록 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 멘토 신청 등록 (ARTAPMM). multipart: data(JSON), mentorApplicationFiles
   */
  static async registerMentorApplication(
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
  }

  /**
   * 신청 수정
   * @param data 수정 데이터
   * @param files 첨부파일 배열 (추가 파일)
   */
  static async updateArtappm(
    data: ArtappmInsertRequest,
    files?: File[],
  ): Promise<ArtappmResultResponse> {
    try {
      console.log("API 전송 전 update data:", data);
      const isArtapps = data.proGb === "08" || data.proGb === "09";

      const formData = new FormData();

      const jsonString = JSON.stringify(data, (key, value) => {
        if (value === null || value === undefined) {
          return undefined;
        }
        return value;
      });

      const jsonBlob = new Blob([jsonString], {
        type: "application/json",
      });
      formData.append("data", jsonBlob, "data.json");

      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append(isArtapps ? "artappsFiles" : "artappmFiles", file);
        });
      }

      const updateEndpoint = isArtapps
        ? API_ENDPOINTS.ARTAPPS.UPDATE
        : API_ENDPOINTS.SUPPORT.APPLICATION_REGISTER;

      const response = await apiClient.put<ArtappmResultResponse>(
        updateEndpoint,
        formData,
      );

      return response;
    } catch (error) {
      console.error("신청 수정 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 신청 상세 조회. reqId 있으면 by-req-id 사용(PRO_SEQ 변경에 안전), 없으면 복합키 경로 사용.
   * 백엔드: GET /api/admin/artappm/by-req-id/{reqId} 또는 GET .../{proId}/{proSeq}/{reqEsntlId}
   */
  static async getArtappmDetail(
    params:
      | { reqId: string }
      | { proId: string; proSeq: string; reqEsntlId: string },
  ): Promise<ArtappmDetailResponse> {
    try {
      if ("reqId" in params && params.reqId?.trim()) {
        const response = await apiClient.get<ArtappmDetailResponse>(
          `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/by-req-id/${encodeURIComponent(params.reqId)}`,
        );
        return response;
      }
      const { proId, proSeq, reqEsntlId } = params as {
        proId: string;
        proSeq: string;
        reqEsntlId: string;
      };
      if (!proId || !proSeq || !reqEsntlId) {
        throw new ApiError(400, "신청 상세 조회를 위한 키 값이 부족합니다.");
      }
      const response = await apiClient.get<ArtappmDetailResponse>(
        `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/${encodeURIComponent(proId)}/${encodeURIComponent(proSeq)}/${encodeURIComponent(reqEsntlId)}`,
      );
      return response;
    } catch (error) {
      console.error("신청 상세 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "신청 상세 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 첨부파일 1건 삭제 (REQ_ID 기반)
   * 백엔드 API: DELETE /api/admin/artappm/by-req-id/{reqId}/files/{fileId}/{seq}
   */
  static async deleteArtappmFile(params: {
    reqId: string;
    fileId: string;
    seq: number;
  }): Promise<ArtappmResultResponse> {
    try {
      const { reqId, fileId, seq } = params;
      if (!reqId?.trim()) {
        throw new ApiError(400, "첨부파일 삭제를 위한 reqId가 없습니다.");
      }

      const endpoint = `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/by-req-id/${encodeURIComponent(
        reqId,
      )}/files/${encodeURIComponent(String(fileId))}/${seq}`;

      const response = await apiClient.delete<ArtappmResultResponse>(endpoint);

      return response;
    } catch (error) {
      console.error("첨부파일 삭제 API 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "첨부파일 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 신청 상태만 변경 (REQ_ID 기준)
   * 백엔드: PUT /api/admin/artappm/by-req-id/{reqId}/status-code?sttusCode=
   */
  static async updateArtappmStatusByReqId(params: {
    reqId: string;
    sttusCode: string;
  }): Promise<ArtappmResultResponse> {
    try {
      const { reqId, sttusCode } = params;
      if (!reqId?.trim()) {
        throw new ApiError(400, "상태 변경을 위한 reqId가 없습니다.");
      }
      if (!sttusCode?.trim()) {
        throw new ApiError(400, "상태코드가 없습니다.");
      }
      const qs = new URLSearchParams({ sttusCode: sttusCode.trim() });
      const endpoint = `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/by-req-id/${encodeURIComponent(reqId.trim())}/status-code?${qs.toString()}`;
      const response = await apiClient.put<ArtappmResultResponse>(
        endpoint,
        undefined,
      );
      return response;
    } catch (error) {
      console.error("신청 상태 변경 API 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청 상태 변경 중 오류가 발생했습니다.");
    }
  }

  /**
   * 공부의 명수 신청 상태만 변경 (REQ_ID 기준)
   * 백엔드: PUT /api/admin/artapps/applications/by-req-id/{reqId}/status-code?sttusCode=
   */
  static async updateArtappsStatusByReqId(params: {
    reqId: string;
    sttusCode: string;
  }): Promise<ArtappmResultResponse> {
    try {
      const { reqId, sttusCode } = params;
      const id = reqId?.trim();
      const code = sttusCode?.trim();
      if (!id) {
        throw new ApiError(400, "상태 변경을 위한 reqId가 없습니다.");
      }
      if (!code) {
        throw new ApiError(400, "상태코드가 없습니다.");
      }
      const endpoint = API_ENDPOINTS.ARTAPPS.UPDATE_APPLICATION_STATUS_BY_REQ_ID(
        id,
        code,
      );
      const response = await apiClient.put<ArtappmResultResponse>(
        endpoint,
        undefined,
      );
      return response;
    } catch (error) {
      console.error("공부의 명수 신청 상태 변경 API 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청 상태 변경 중 오류가 발생했습니다.");
    }
  }

  /**
   * 공부의 명수(ARTAPPS) — 지원사업신청ID(REQ_ID) 단위 신청 삭제 (ARTAPPS → ARTAPPM)
   * 백엔드: DELETE /api/admin/artapps/applications/by-req-id/{reqId}
   */
  static async deleteApplicationsByReqId(
    reqId: string,
  ): Promise<ArtappmResultResponse> {
    try {
      const id = reqId?.trim();
      if (!id) {
        throw new ApiError(400, "지원사업신청ID(reqId)가 필요합니다.");
      }
      const endpoint = API_ENDPOINTS.ARTAPPS.DELETE_APPLICATIONS_BY_REQ_ID(id);
      const response = await apiClient.delete<ArtappmResultResponse>(endpoint);
      return response;
    } catch (error) {
      console.error("공부의 명수 신청 삭제 API 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 공부의 명수 신청목록 (ARTAPPM INNER JOIN ARTAPPS ON REQ_ID)
   * 백엔드: POST /api/admin/artapps/application-list
   */
  static async getArtappsApplicationList(
    params: ArtappsApplicationListRequestBody,
  ): Promise<ArtappsApplicationListApiResponse> {
    try {
      if (!params.searchProId?.trim()) {
        throw new ApiError(400, "사업코드(searchProId)는 필수입니다.");
      }
      const body = {
        searchProId: params.searchProId.trim(),
        searchUserNm: params.searchUserNm?.trim() || undefined,
        start: params.start ?? 0,
        length: params.length ?? 15,
      };
      const response = await apiClient.post<ArtappsApplicationListApiResponse>(
        API_ENDPOINTS.ARTAPPS.APPLICATION_LIST,
        body,
      );
      return response;
    } catch (error) {
      console.error("공부의 명수 신청목록 조회 API 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청목록을 불러오는 중 오류가 발생했습니다.");
    }
  }
}

// ----- 상담관리(멘토지정) ARTADVI -----

export interface ArtadviDTO {
  proId?: string;
  proSeq?: string;
  reqEsntlId?: string;
  advEsntlId?: string;
  advEsntlNm?: string;
  /** 멘토 연락처 (API: MBTLNUM) */
  mbtlnum?: string;
  advDt?: string;
  advFrom?: string;
  advTo?: string;
  advSpace?: string;
  advDesc?: string;
  fileId?: string;
  /** FILE_ID로 조회한 첨부파일 목록 (API 응답에 담김) */
  files?: ArtappmFileItem[];
  chgUserId?: string;
  crtDate?: string;
  chgDate?: string;
}

export interface ArtadviSaveRequest {
  reqId: string;
  proId: string;
  proSeq: string;
  reqEsntlId: string;
  advEsntlId: string;
  advDt?: string;
  advFrom?: string;
  advTo?: string;
  advSpace?: string;
  advDesc?: string;
  fileId?: string;
}

/**
 * 상담관리(멘토지정) 목록 조회
 * GET /api/admin/artadvi/list?reqId=
 */
export async function getArtadviList(params: {
  reqId: string;
}): Promise<ArtadviDTO[]> {
  const { reqId } = params;
  const q = new URLSearchParams({ reqId });
  const res = await apiClient.get<ArtadviDTO[]>(
    `${API_ENDPOINTS.SUPPORT.ARTADVI_LIST}?${q}`,
  );
  return Array.isArray(res) ? res : [];
}

/**
 * 상담관리(멘토지정) 등록
 * 백엔드는 PUT만 제공(upsert). POST 대신 PUT 사용.
 */
export async function insertArtadvi(data: ArtadviSaveRequest): Promise<void> {
  await apiClient.put(API_ENDPOINTS.SUPPORT.ARTADVI_UPDATE, data);
}

/**
 * 상담관리(멘토지정) 수정
 * PUT /api/admin/artadvi/
 */
export async function updateArtadvi(data: ArtadviSaveRequest): Promise<void> {
  await apiClient.put(API_ENDPOINTS.SUPPORT.ARTADVI_UPDATE, data);
}
