import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

/** 가맹 목록 아이템 (01:임시저장, 02:신청, 03:승인, 04:반려, 05:중단, 99:취소) */
export interface Franchise {
  rnum?: string;
  /** 상태 코드 */
  status: string;
  /** 학원명 */
  academyName: string;
  /** 대표자 */
  representative: string;
  /** 연락처 */
  contact: string;
  /** 주소 */
  address: string;
  /** 희망사업 */
  desiredBusiness: string;
  /** 취급과목 */
  subject: string;
  /** 상세용 ID (eduEsntlId) */
  franchiseId?: string;
  /** 희망사업 코드 (1=마중물, 2=희망) - 상세/수정 API 경로용 */
  eduGb?: string;
  [key: string]: unknown;
}

export interface FranchiseListParams {
  /** 사용자 구분 (ARMUSER.USER_SE) - 학원 목록은 'ANR' */
  userSe?: string;
  searchCondition?: string;
  searchKeyword?: string;
  /**
   * 진행상태 필터 (백엔드 ArtedumListRequest.runSta에 매핑)
   * 01=임시저장, 02=신청, 03=승인, 04=반려, 05=정지, 99=취소
   */
  runSta?: string;
  /** 상태 필터 (01,02,03,04,05,99) - 기존 필드(하위 호환용) */
  filterStatus?: string;
  length: string;
  start: string;
}

export interface FranchiseListResponse {
  result?: string;
  recordsFiltered?: string | number;
  recordsTotal?: string | number;
  data?: Franchise[] | ArtedumListItem[];
  Array?: Franchise[];
  [key: string]: unknown;
}

/**
 * 백엔드 ArtedumDTO 목록 응답 1건 (API가 반환하는 필드명)
 */
export interface ArtedumListItem {
  rnum?: number | string;
  eduEsntlId?: string;
  /** 희망사업 코드 (1=마중물, 2=희망) */
  eduGb?: string;
  runSta?: string;
  runStaNm?: string;
  schoolNm?: string;
  /** 대표자 (ARMUSER.CXFC) */
  cxfc?: string;
  userNm?: string;
  applcntNm?: string;
  mbtlnum?: string;
  usrTelno?: string;
  adres?: string;
  detailAdres?: string;
  eduGbNm?: string;
  subNmList?: string;
  [key: string]: unknown;
}

/**
 * 백엔드 목록 한 건을 Franchise(UI용) 형태로 변환
 */
export function mapArtedumItemToFranchise(item: ArtedumListItem): Franchise {
  const address = [item.adres, item.detailAdres].filter(Boolean).join(" ");
  const contact = item.mbtlnum || item.usrTelno || "";
  return {
    rnum: item.rnum != null ? String(item.rnum) : undefined,
    status: item.runSta ?? "",
    academyName: item.userNm ?? "",
    representative: item.cxfc ?? "",
    contact,
    address,
    desiredBusiness: item.eduGbNm ?? "",
    subject: item.subNmList ?? "",
    franchiseId: item.eduEsntlId,
    eduGb: item.eduGb,
  };
}

export interface FranchiseDeleteParams {
  franchiseId: string;
}

/** 가맹학원 상세 조회 응답 (ArtedumDetailResponse) */
export interface FranchiseDetailResponse {
  esntlId?: string;
  userId?: string;
  userNm?: string;
  emailAdres?: string;
  usrTelno?: string;
  mbtlnum?: string;
  adres?: string;
  detailAdres?: string;
  schoolNm?: string;
  bizrno?: string;
  cxfc?: string;
  applcntNm?: string;
  eduGb?: string;
  eduGbNm?: string;
  eduFile?: string;
  runSta?: string;
  runStaNm?: string;
  subjects?: FranchiseDetailSubjectItem[];
  /** 상세 응답 첨부파일 1건 */
  files?: {
    fileId: number | string;
    seq: number | string;
    orgfNm?: string;
    /** 하위호환(구 응답 키) */
    orgnm?: string;
  }[];
  /** 기존 응답 하위호환 */
  eduFiles?: {
    fileId: number | string;
    seq: number | string;
    orgfNm?: string;
    orgnm?: string;
  }[];
  [key: string]: unknown;
}

export interface FranchiseDetailSubjectItem {
  eduEsntlId?: string;
  eduGb?: string;
  seq?: number;
  subNm?: string;
  subPay?: number;
  subCnt?: number;
}

/** 가맹학원 수정 요청 (ArtedumUpdateRequest) */
export interface FranchiseUpdateParams {
  eduEsntlId: string;
  eduGb: string;
  eduFile?: string;
  runSta?: string;
  subjects: {
    seq?: number;
    subNm: string;
    subPay: number | null;
    subCnt: number | null;
  }[];
  eduFiles?: File[];
}

/**
 * 가맹학원 신청 과목 1건 (ArtedumSubjectItem에 매핑)
 */
export interface FranchiseSubjectItem {
  /** 취급과목 (subNm) */
  subNm: string;
  /** 수강료 (subPay) */
  subPay: number | null;
  /** 모집가능인원 (subCnt) */
  subCnt: number | null;
}

/**
 * 가맹학원(희망사업 신청) 등록 요청 파라미터 (ArtedumInsertRequest에 매핑)
 */
export interface FranchiseRegisterParams {
  /** 학원 ID (ARMUSER.ESNTL_ID → eduEsntlId) */
  eduEsntlId: string;
  /** 희망사업 (01=마중물스터디, 02=희망스터디 → eduGb) */
  eduGb: string;
  /** 진행상태 (01=임시저장, 02=신청, 03=승인, 04=반려, 05=정지, 99=취소) */
  runSta?: string;
  /** 신청 과목 목록 */
  subjects: FranchiseSubjectItem[];
  /** 첨부파일 (eduFiles) */
  eduFiles?: File[];
}

export interface FranchiseRegisterResponse {
  result?: string;
  message?: string;
  [key: string]: unknown;
}

/** 가맹학원 첨부파일 삭제 등 결과 응답 (result 00=성공, 01=실패) */
export interface ArtedumResultResponse {
  result?: string;
  message?: string;
}

export class FranchiseService {
  /**
   * 가맹 목록 조회 (페이징)
   */
  static async getList(
    params: FranchiseListParams,
  ): Promise<FranchiseListResponse> {
    try {
      const response = await apiClient.post<FranchiseListResponse>(
        API_ENDPOINTS.FRANCHISE.LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get franchise list error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "가맹 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 가맹 목록 엑셀용 전체 목록 조회 (페이징 없음)
   */
  static async getExcelList(
    params: Omit<FranchiseListParams, "length" | "start">,
  ): Promise<FranchiseListResponse> {
    try {
      const response = await apiClient.post<FranchiseListResponse>(
        API_ENDPOINTS.FRANCHISE.EXCEL_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get franchise excel list error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "가맹 엑셀 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 가맹학원 상세 조회
   * GET /api/admin/artedum/{eduEsntlId}/{eduGb}
   */
  static async getDetail(
    eduEsntlId: string,
    eduGb: string,
  ): Promise<FranchiseDetailResponse> {
    try {
      const url = API_ENDPOINTS.FRANCHISE.detailPath(eduEsntlId, eduGb);
      const response = await apiClient.get<FranchiseDetailResponse>(url);
      return response;
    } catch (error) {
      console.error("Get franchise detail error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "가맹학원 상세를 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 가맹학원(ARTEDUM) 1건 논리 삭제
   * DELETE /api/admin/artedum/{eduEsntlId}/{eduGb}
   * @returns result 00=성공, 02=이미 삭제됨, 01=실패. 404 시 ApiError throw.
   */
  static async deleteArtedum(
    eduEsntlId: string,
    eduGb: string,
  ): Promise<ArtedumResultResponse> {
    try {
      const url = API_ENDPOINTS.FRANCHISE.detailPath(eduEsntlId, eduGb);
      const response = await apiClient.delete<ArtedumResultResponse>(url);
      return response;
    } catch (error) {
      console.error("Delete artedum error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "가맹학원 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 가맹학원 수정
   * PUT /api/admin/artedum/{eduEsntlId}/{eduGb} (multipart/form-data: data(JSON), eduFiles)
   */
  static async updateFranchise(
    eduEsntlId: string,
    eduGb: string,
    params: FranchiseUpdateParams,
  ): Promise<FranchiseRegisterResponse> {
    try {
      const { eduFiles, ...rest } = params;
      const requestBody = {
        eduEsntlId: rest.eduEsntlId,
        eduGb: rest.eduGb,
        eduFile: rest.eduFile ?? "",
        runSta: rest.runSta ?? undefined,
        subjects: rest.subjects.map((s) => ({
          seq: s.seq,
          subNm: s.subNm,
          subPay: s.subPay ?? 0,
          subCnt: s.subCnt ?? 0,
        })),
      };

      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(requestBody)], { type: "application/json" }),
        "data.json",
      );
      if (eduFiles?.length) {
        eduFiles.forEach((file) => formData.append("eduFiles", file));
      }

      const url = API_ENDPOINTS.FRANCHISE.detailPath(eduEsntlId, eduGb);
      const response = await apiClient.put<FranchiseRegisterResponse>(
        url,
        formData,
      );
      return response;
    } catch (error) {
      console.error("Update franchise error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "가맹학원 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 가맹학원(희망사업 신청) 등록
   * 백엔드 ArtedumManageController.insert (multipart/form-data: data(JSON), eduFiles) 연동
   */
  static async registerFranchise(
    params: FranchiseRegisterParams,
  ): Promise<FranchiseRegisterResponse> {
    try {
      const { eduFiles, ...rest } = params;
      // 백엔드 ArtedumInsertRequest 필드만 전달 (eduEsntlId, eduGb, runSta, subjects)
      const requestBody = {
        eduEsntlId: rest.eduEsntlId,
        eduGb: rest.eduGb,
        runSta: rest.runSta ?? "02",
        subjects: rest.subjects,
      };

      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(requestBody)], {
        type: "application/json",
      });
      // filename 있으면 Spring @RequestPart("data") JSON 파싱이 안정적
      formData.append("data", jsonBlob, "data.json");

      if (eduFiles && eduFiles.length > 0) {
        eduFiles.forEach((file) => {
          formData.append("eduFiles", file);
        });
      }

      const response = await apiClient.post<FranchiseRegisterResponse>(
        API_ENDPOINTS.FRANCHISE.REGISTER,
        formData,
      );

      return response;
    } catch (error) {
      console.error("Register franchise error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "가맹학원 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 가맹학원 첨부파일(EDU_FILE) 1건 삭제
   * DELETE /api/admin/artedum/{eduEsntlId}/{eduGb}/files/{fileId}/{seq}
   */
  static async deleteEduFile(
    eduEsntlId: string,
    eduGb: string,
    fileId: number | string,
    seq: number | string,
  ): Promise<ArtedumResultResponse> {
    try {
      const url = API_ENDPOINTS.FRANCHISE.deleteFilePath(
        eduEsntlId,
        eduGb,
        fileId,
        seq,
      );
      const response = await apiClient.delete<ArtedumResultResponse>(url);
      return response;
    } catch (error) {
      console.error("Delete franchise edu file error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "첨부파일 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 가맹학원 신청과목(ARTEDUD) 1건 삭제 (논리 삭제)
   * DELETE /api/admin/artedum/{eduEsntlId}/{eduGb}/subjects/{seq}
   */
  static async deleteSubject(
    eduEsntlId: string,
    eduGb: string,
    seq: number,
  ): Promise<ArtedumResultResponse> {
    try {
      const url = API_ENDPOINTS.FRANCHISE.deleteSubjectPath(
        eduEsntlId,
        eduGb,
        seq,
      );
      const response = await apiClient.delete<ArtedumResultResponse>(url);
      return response;
    } catch (error) {
      console.error("Delete franchise subject error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청과목 삭제 중 오류가 발생했습니다.");
    }
  }

  static async deleteFranchise(
    params: FranchiseDeleteParams,
  ): Promise<{ result?: string; message?: string }> {
    try {
      const response = await apiClient.post<{
        result?: string;
        message?: string;
      }>(API_ENDPOINTS.FRANCHISE.DELETE, params);
      return response;
    } catch (error) {
      console.error("Delete franchise error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "가맹 삭제 중 오류가 발생했습니다.");
    }
  }
}
