import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 사용자 목록 조회 요청 파라미터 (백엔드 setDefaultPaging: start/length → startIndex/lengthPage)
export interface ArmuserListRequest {
  userSe?: string; // 사용자구분 (SNR: 학생, PNR: 학부모, USR: 관리자 등)
  searchCondition?: string; // 검색조건 ("1": 이름, "2": 아이디, "3": 휴대폰)
  searchKeyword?: string; // 검색어
  mberSttus?: string; // 회원상태 (A: 대기, P: 사용, D: 탈퇴)
  /** 0-based 시작 인덱스 (페이징) */
  start?: number;
  /** 페이지 크기 */
  length?: number;
  lengthPage?: number;
  startIndex?: number;
}

// 사용자 정보 타입 (매퍼 selectList RNUM 등과 매칭)
export interface ArmuserDTO {
  rnum?: string; // 목록 번호 (서버 페이징 시 사용)
  esntlId?: string; // 고유ID
  userId?: string; // 사용자ID
  userNm?: string; // 사용자명
  emailAdres?: string; // 이메일
  usrTelno?: string; // 전화번호
  mbtlnum?: string; // 휴대전화번호
  brthdy?: string; // 생년월일
  ihidnum?: string; // 주민등록번호
  sexdstnCode?: string; // 성별코드
  zip?: string; // 우편번호
  adres?: string; // 주소
  detailAdres?: string; // 상세주소
  mberSttus?: string; // 회원상태
  mberSttusNm?: string; // 회원상태명
  sbscrbDe?: string; // 가입일
  secsnDe?: string; // 탈퇴일
  lockAt?: string; // 잠금여부
  userSe?: string; // 사용자구분
  chgLastDt?: string; // 최종수정일시
  payBankCode?: string; // 은행코드 (ARM002)
  payBankCodeNm?: string; // 은행명
  payBank?: string; // 계좌번호
  holderNm?: string; // 예금주명
  /** 학교 ID (sdSchulCode, NEIS 학교 KEY) */
  schoolId?: string;
  schoolGb?: string; // 학교구분
  schoolNm?: string; // 학교명
  schoolLvl?: number; // 학년
  schoolNo?: number; // 반
  /** 학교 소재지 (ARMUSER.FARM_DESC) */
  farmDesc?: string;
  /** 취급과목 (SUBJECT_DESC, 학원 등) */
  subjectDesc?: string;
  /** 학원소개 (PROFILE_DESC) */
  profileDesc?: string;
  /** 회원 사진(USER_PIC) fileId */
  userPic?: string;
  [key: string]: any;
}

// 사용자 목록 응답 타입
export interface ArmuserListResponse {
  data?: ArmuserDTO[];
  recordsFiltered?: number;
  recordsTotal?: number;
  result?: string;
  [key: string]: any;
}

// 엑셀 목록 응답 타입
export interface ArmuserExcelListResponse {
  data?: ArmuserDTO[];
  result?: string; // "00": 성공, "01": 실패
  [key: string]: any;
}

// 사용자 등록 요청 파라미터 (ArmuserInsertRequest)
export interface ArmuserInsertRequest {
  esntlId?: string;
  userSe?: string;
  userId?: string;
  password?: string;
  passwordHint?: string;
  passwordCnsr?: string;
  userNm?: string;
  ihidnum?: string;
  usrTelno?: string;
  mbtlnum?: string;
  emailAdres?: string;
  zip?: string;
  adresLot?: string;
  adres?: string;
  detailAdres?: string;
  brthdy?: string;
  sexdstnCode?: string;
  mberSttus?: string;
  sbscrbDe?: string;
  schoolId?: string;
  schoolGb?: string;
  schoolNm?: string;
  schoolLvl?: number;
  schoolNo?: number;
  payBankCode?: string;
  payBank?: string;
  holderNm?: string;
  singleYn?: string;
  basicYn?: string;
  poorYn?: string;
  citizenYn?: string;
  minorYn?: string;
  farmYn?: string;
  /** 학교 소재지 (FARM_DESC, 학생 등록/수정) */
  farmDesc?: string;
  /** 취급과목 (SUBJECT_DESC, 학원 등) */
  subjectDesc?: string;
  /** 학원소개 (PROFILE_DESC) */
  profileDesc?: string;
  di?: string;
  [key: string]: string | number | undefined;
}

// 등록/수정/삭제 결과 응답
export interface ArmuserResultResponse {
  result?: string; // "00": 성공, "01": 실패
  message?: string;
}

// 사용자 상세 조회 요청 파라미터
export interface ArmuserDetailRequest {
  esntlId: string; // 고유ID
}

// 상세 조회 시 회원 사진 파일 1건 (fileId+seq로 /api/v1/files/view 사용)
export interface ArmuserUserPicFileItem {
  fileId?: number;
  seq?: number;
  orgfNm?: string;
}

// 사용자 상세 응답 타입
export interface ArmuserDetailResponse {
  detail?: ArmuserDTO;
  /** 회원 사진(USER_PIC) 파일 목록 - 이미지 표시 시 fileId+seq로 /api/v1/files/view */
  userPicFiles?: ArmuserUserPicFileItem[];
  /** 첨부파일(ATTA_FILE) 파일 목록 */
  attaFiles?: ArmuserUserPicFileItem[];
  /** 사업자등록증(BIZNO_FILE) 파일 목록 (1건) */
  biznoFiles?: ArmuserUserPicFileItem[];
  result?: string;
  [key: string]: any;
}

// 사용자 수정 요청 파라미터 (ArmuserUpdateRequest)
export interface ArmuserUpdateRequest {
  esntlId?: string;
  userSe?: string;
  userId?: string;
  password?: string;
  passwordHint?: string;
  passwordCnsr?: string;
  userNm?: string;
  ihidnum?: string;
  usrTelno?: string;
  mbtlnum?: string;
  emailAdres?: string;
  zip?: string;
  adresLot?: string;
  adres?: string;
  detailAdres?: string;
  brthdy?: string;
  sexdstnCode?: string;
  mberSttus?: string;
  sbscrbDe?: string;
  secsnDe?: string;
  schoolId?: string;
  schoolGb?: string;
  schoolNm?: string;
  schoolLvl?: number;
  schoolNo?: number;
  singleYn?: string;
  basicYn?: string;
  poorYn?: string;
  citizenYn?: string;
  minorYn?: string;
  farmYn?: string;
  /** 학교 소재지 (FARM_DESC, 학생 수정) */
  farmDesc?: string;
  /** 취급과목 (SUBJECT_DESC, 학원 등) */
  subjectDesc?: string;
  /** 학원소개 (PROFILE_DESC) */
  profileDesc?: string;
  [key: string]: string | number | undefined;
}

/**
 * ARMUSER(공통 사용자) API 서비스
 */
export class ArmuserService {
  /**
   * 사용자 목록 조회 (페이징/검색)
   * @param request 조회 요청 파라미터
   */
  static async getList(
    request: ArmuserListRequest,
  ): Promise<ArmuserListResponse> {
    try {
      const response = await apiClient.post<ArmuserListResponse>(
        API_ENDPOINTS.ARMUSER.LIST,
        request,
      );
      return response;
    } catch (error) {
      console.error("사용자 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "사용자 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 엑셀 목록 조회 (페이징 없음, 현재 검색 조건 적용)
   */
  static async getExcelList(
    request: Omit<
      ArmuserListRequest,
      "start" | "length" | "lengthPage" | "startIndex"
    >,
  ): Promise<ArmuserExcelListResponse> {
    try {
      const response = await apiClient.post<ArmuserExcelListResponse>(
        API_ENDPOINTS.ARMUSER.LIST_EXCEL,
        request,
      );
      return response;
    } catch (error) {
      console.error("사용자 엑셀 목록 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "엑셀 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 등록 (통합회원 1건) - JSON only
   * @param request 등록 요청 (esntlId 미입력 시 서버에서 자동 생성)
   */
  static async insertArmuser(
    request: ArmuserInsertRequest,
  ): Promise<ArmuserResultResponse> {
    try {
      const response = await apiClient.post<ArmuserResultResponse>(
        API_ENDPOINTS.ARMUSER.BASE + "/",
        request,
      );
      return response;
    } catch (error) {
      console.error("사용자 등록 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 등록 (multipart: data + userPic + bizCertFile + attachFiles)
   * @param request 등록 요청
   * @param userPicFile 회원 사진 파일 (선택, USER_PIC)
   * @param bizCertFile 사업자등록증 1건 (선택, BIZNO_FILE)
   * @param attachFiles 첨부파일 복수 (선택, ATTA_FILE)
   */
  static async insertArmuserMultipart(
    request: ArmuserInsertRequest,
    userPicFile?: File | null,
    bizCertFile?: File | null,
    attachFiles?: File[],
  ): Promise<ArmuserResultResponse> {
    try {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(request)], { type: "application/json" }),
      );
      if (userPicFile != null && userPicFile.size > 0) {
        formData.append("userPic", userPicFile);
      }
      if (bizCertFile != null && bizCertFile.size > 0) {
        formData.append("bizCertFile", bizCertFile);
      }
      if (attachFiles?.length) {
        attachFiles.forEach((file) => formData.append("attachFiles", file));
      }
      const response = await apiClient.post<ArmuserResultResponse>(
        API_ENDPOINTS.ARMUSER.BASE + "/",
        formData,
      );
      return response;
    } catch (error) {
      console.error("사용자 등록 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 상세 조회
   * @param esntlId 고유ID
   */
  static async getDetail(esntlId: string): Promise<ArmuserDetailResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER.BASE}/${esntlId}`;
      const response = await apiClient.get<ArmuserDetailResponse>(path);
      return response;
    } catch (error) {
      console.error("사용자 상세 조회 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "사용자 정보를 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 수정 (통합회원 1건) - JSON only
   * @param esntlId 고유ID
   * @param request 수정 요청 (password는 변경 시에만 전달)
   */
  static async updateArmuser(
    esntlId: string,
    request: ArmuserUpdateRequest,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER.BASE}/${esntlId}`;
      const response = await apiClient.put<ArmuserResultResponse>(path, {
        ...request,
        esntlId,
      });
      return response;
    } catch (error) {
      console.error("사용자 수정 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 수정 (multipart: data + userPic + bizCertFile + attachFiles)
   * @param esntlId 고유ID
   * @param request 수정 요청 (기존 attaFile/biznoFile 유지 시 detail 값 포함)
   * @param userPicFile 회원 사진 파일 (선택, USER_PIC)
   * @param bizCertFile 사업자등록증 1건 (선택, BIZNO_FILE)
   * @param attachFiles 첨부파일 복수 (선택, ATTA_FILE - 있으면 새 그룹으로 저장)
   */
  static async updateArmuserMultipart(
    esntlId: string,
    request: ArmuserUpdateRequest,
    userPicFile?: File | null,
    bizCertFile?: File | null,
    attachFiles?: File[],
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
      if (bizCertFile != null && bizCertFile.size > 0) {
        formData.append("bizCertFile", bizCertFile);
      }
      if (attachFiles?.length) {
        attachFiles.forEach((file) => formData.append("attachFiles", file));
      }
      const path = `${API_ENDPOINTS.ARMUSER.BASE}/${esntlId}`;
      const response = await apiClient.put<ArmuserResultResponse>(
        path,
        formData,
      );
      return response;
    } catch (error) {
      console.error("사용자 수정 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원 프로필 사진(USER_PIC) 1건 삭제
   * fileId/seq는 문자열로 전달하여 큰 수 정밀도 손실 방지 (JavaScript Number 한계)
   */
  static async deleteUserPic(
    esntlId: string,
    fileId: string,
    seq: string,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER.BASE}/${esntlId}/user-pic/${fileId}/${seq}`;
      const response = await apiClient.delete<ArmuserResultResponse>(path);
      return response;
    } catch (error) {
      console.error("회원 사진 삭제 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 사진 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 첨부파일(ATTA_FILE) 1건 삭제. 해당 fileId에 남은 파일이 없으면 ARMUSER.ATTA_FILE 비움.
   */
  static async deleteAttaFile(
    esntlId: string,
    fileId: string,
    seq: string,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER.BASE}/${esntlId}/atta-file/${fileId}/${seq}`;
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
   * 사업자등록증(BIZNO_FILE) 1건 삭제 후 ARMUSER.BIZNO_FILE 비움.
   */
  static async deleteBiznoFile(
    esntlId: string,
    fileId: string,
    seq: string,
  ): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER.BASE}/${esntlId}/bizno-file/${fileId}/${seq}`;
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
   * 사용자 탈퇴(삭제) - MBER_STTUS='D', SECSN_DE 설정
   * @param esntlId 고유ID
   */
  static async deleteArmuser(esntlId: string): Promise<ArmuserResultResponse> {
    try {
      const path = `${API_ENDPOINTS.ARMUSER.BASE}/${esntlId}`;
      const response = await apiClient.delete<ArmuserResultResponse>(path);
      return response;
    } catch (error) {
      console.error("회원 탈퇴 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 탈퇴 중 오류가 발생했습니다.");
    }
  }
}
