import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

/** GET /api/admin/artchoi 응답 항목 (ArtchoiListItemResponse) */
export interface MemberArtchoiListItem {
  choiSeq?: number;
  resultGb?: string;
  baseId?: string;
  item1?: string;
  item2?: string;
  item3?: string;
  item4?: string;
  item5?: string;
  item6?: string;
  item7?: string;
  item8?: string;
  item9?: string;
  item10?: string;
  item11?: string;
  item12?: string;
  item13?: string;
  item14?: string;
  item15?: string;
  item16?: string;
  item17?: string;
  item18?: string;
  item19?: string;
  item20?: string;
}

// 회원 정보 타입
export interface Member {
  id: number;
  userId: string;
  name: string;
  email: string;
  joinDate: string;
  status: "active" | "pending" | "inactive";
  userSe?: string;
  role?: string;
}

// 회원 목록 응답 타입
export interface MemberListResponse {
  content: Member[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// 회원 목록 요청 파라미터
export interface MemberListParams {
  page?: number;
  size?: number;
  sort?: string;
  // 필터 파라미터
  userId?: string;
  name?: string;
  email?: string;
  joinDate?: string;
  status?: string;
}

// 관리자 회원 조회 요청 파라미터
export interface AdminMemberListParams {
  searchCondition: string; // "1": 관리자명, "2": 아이디, "3": 연락처
  searchKeyword: string;
  joGunMberSta: string; // "": 전체, "A": 대기, "P": 사용, "D": 탈퇴
  length: string; // "15"
  start: string; // 페이지네이션 시작 인덱스 (0부터 시작)
  // 테이블 필터 파라미터
  filterUserId?: string; // 아이디 필터
  filterUserNm?: string; // 이름 필터
  filterEmailAdres?: string; // 이메일 필터
  filterSbscrbDe?: string; // 가입일 필터 (YYYY-MM-DD 형식)
  filterMberSttus?: string; // 상태 필터 ("A": 대기, "P": 사용, "D": 탈퇴)
}

// 관리자 회원 정보 타입 (API 응답 구조에 맞게 정의)
export interface AdminMember {
  rnum: string; // 번호
  userId: string; // 회원ID
  userNm: string; // 관리자명
  emailAdres: string; // 이메일
  usrTelNo: string; // 사무실전화
  mbtlnum: string; // 연락처
  mberSttus: string; // 상태코드 (A: 대기, P: 사용, D: 탈퇴)
  mberSttusNm: string; // 상태명
  sbscrbDe: string; // 가입일
  secsnDe: string; // 탈퇴일
  lockAt: string; // 잠금여부
  esntlId?: string; // 관리자코드 (PK)
  [key: string]: any; // 추가 필드 대응
}

// 관리자 회원 상세 정보 타입
export interface AdminMemberDetail {
  userId: string; // 회원ID
  userNm: string; // 관리자명
  emailAdres: string; // 이메일
  usrTelNo: string; // 사무실전화
  mbtlnum: string; // 연락처
  mberSttus: string; // 상태코드
  sbscrbDe: string; // 가입일
  secsnDe: string; // 탈퇴일
  lockLastPnttm: string; // 잠금일시
  lockAt: string; // 잠금여부
  groupId?: string; // 권한 ID
  [key: string]: any;
}

// 관리자 회원 상세 조회 응답 타입
export interface AdminMemberDetailResponse {
  adminInfo?: AdminMemberDetail;
  [key: string]: any;
}

// 관리자 회원 목록 응답 타입
export interface AdminMemberListResponse {
  result?: string; // "00": 성공, "01": 실패
  recordsFiltered?: string | number;
  recordsTotal?: string | number;
  data?: AdminMember[];
  Array?: AdminMember[]; // API 응답에서 배열 필드명이 "Array"일 수 있음
  [key: string]: any;
}

// 권한 그룹 정보 타입
export interface AuthGroup {
  groupId: string; // 그룹 ID (예: "GROUP_00000000000000")
  groupNm: string; // 그룹명 (예: "ROLE_ADMIN")
  groupDc: string; // 그룹별칭 (예: "최고관리자")
}

// 관리자 등록 화면 응답 타입
export interface AdminRegisterScreenResponse {
  authList?: AuthGroup[];
  [key: string]: any;
}

// 관리자 회원 등록 요청 파라미터
export interface AdminMemberRegisterParams {
  userId: string; // 아이디
  password: string; // 비밀번호
  userNm: string; // 관리자명
  usrTelno: string; // 사무실번호
  mbtlnum: string; // 연락처
  emailAdres: string; // 이메일
  mberSttus: string; // 상태 (A:대기, P:사용, D:탈퇴)
  sbscrbDe: string; // 가입일
  secsnDe?: string; // 탈퇴일
  lockAt: string; // 잠금여부 (Y:예, N:아니오)
  lockLastPnttm?: string; // 잠금일자
  groupId: string; // 권한 ID
}

// 관리자 회원 수정 요청 파라미터
export interface AdminMemberUpdateParams {
  esntlId: string; // 관리자코드
  userId: string; // 아이디
  password: string; // 비밀번호 (변경하지 않을 때는 빈 문자열 전송, API 스펙상 필수)
  userNm: string; // 관리자명
  usrTelno: string; // 사무실번호
  mbtlnum: string; // 연락처
  emailAdres: string; // 이메일
  mberSttus: string; // 상태 (A:대기, P:사용, D:탈퇴)
  sbscrbDe: string; // 가입일
  lockAt: string; // 잠금여부 (Y:예, N:아니오)
  groupId: string; // 권한 ID
}

// 관리자 회원 수정 응답 타입
export interface AdminMemberUpdateResponse {
  result: string; // "00": 성공, "01": 실패, "50": ID중복
  message: string; // 결과 메시지
}

// 관리자 회원 등록 응답
export interface AdminMemberRegisterResponse {
  result: string; // 결과 코드 (00: 성공, 01: 실패, 50: ID중복)
  message: string; // 결과 메시지
}

// 관리자 회원 탈퇴 요청 파라미터
export interface AdminMemberDeleteParams {
  esntlId: string; // 관리자코드
}

// 관리자 회원 탈퇴 응답
export interface AdminMemberDeleteResponse {
  result: string; // "00": 성공, "01": 실패
  message: string; // 결과 메시지
}

// 회원 서비스
export class MemberService {
  /**
   * 회원 목록 조회
   */
  static async getMembers(
    params: MemberListParams = {},
  ): Promise<MemberListResponse> {
    try {
      const queryParams = new URLSearchParams();

      // 페이지네이션 파라미터
      if (params.page !== undefined)
        queryParams.append("page", String(params.page));
      if (params.size !== undefined)
        queryParams.append("size", String(params.size));
      if (params.sort) queryParams.append("sort", params.sort);

      // 필터 파라미터
      if (params.userId) queryParams.append("userId", params.userId);
      if (params.name) queryParams.append("name", params.name);
      if (params.email) queryParams.append("email", params.email);
      if (params.joinDate) queryParams.append("joinDate", params.joinDate);
      if (params.status) queryParams.append("status", params.status);

      const url =
        API_ENDPOINTS.MEMBER.LIST +
        `${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      const response = await apiClient.get<MemberListResponse>(url);

      return response;
    } catch (error) {
      console.error("Get members error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원 상세 조회
   */
  static async getMember(id: number): Promise<Member> {
    try {
      const response = await apiClient.get<Member>(`/api/v1/member/${id}`);
      return response;
    } catch (error) {
      console.error("Get member error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 정보를 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원 삭제
   */
  static async deleteMember(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/member/${id}`);
    } catch (error) {
      console.error("Delete member error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원 생성
   */
  static async createMember(member: Partial<Member>): Promise<Member> {
    try {
      const response = await apiClient.post<Member>("/api/v1/member", member);
      return response;
    } catch (error) {
      console.error("Create member error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 생성 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원 수정
   */
  static async updateMember(
    id: number,
    member: Partial<Member>,
  ): Promise<Member> {
    try {
      const response = await apiClient.put<Member>(
        `/api/v1/member/${id}`,
        member,
      );
      return response;
    } catch (error) {
      console.error("Update member error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "회원 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 관리자 회원 목록 조회 (새로운 API)
   */
  static async getAdminMembers(
    params: AdminMemberListParams,
  ): Promise<AdminMemberListResponse> {
    try {
      const response = await apiClient.post<AdminMemberListResponse>(
        API_ENDPOINTS.MEMBER.ADMIN_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get admin members error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "관리자 회원 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 관리자 회원 엑셀 목록 조회
   */
  static async getAdminMembersExcel(
    params: Omit<AdminMemberListParams, "length" | "start">,
  ): Promise<AdminMemberListResponse> {
    try {
      const response = await apiClient.post<AdminMemberListResponse>(
        API_ENDPOINTS.MEMBER.ADMIN_EXCEL_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get admin members excel error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "관리자 회원 엑셀 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 관리자 등록 화면 열기 (권한 리스트 조회)
   */
  static async getAdminRegisterScreen(): Promise<AdminRegisterScreenResponse> {
    try {
      const response = await apiClient.post<AdminRegisterScreenResponse>(
        API_ENDPOINTS.MEMBER.ADMIN_REGISTER_SCREEN,
        {},
      );
      return response;
    } catch (error) {
      console.error("Get admin register screen error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "관리자 등록 화면 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 관리자 회원 등록
   */
  static async registerAdminMember(
    params: AdminMemberRegisterParams,
  ): Promise<AdminMemberRegisterResponse> {
    try {
      const response = await apiClient.post<AdminMemberRegisterResponse>(
        API_ENDPOINTS.MEMBER.ADMIN_REGISTER,
        params,
      );
      return response;
    } catch (error) {
      console.error("Register admin member error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "관리자 회원 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 관리자 회원 상세 조회
   */
  static async getAdminMemberDetail(
    esntlId: string,
  ): Promise<AdminMemberDetailResponse> {
    try {
      const response = await apiClient.post<AdminMemberDetailResponse>(
        API_ENDPOINTS.MEMBER.ADMIN_DETAIL,
        { esntlId: esntlId },
      );
      return response;
    } catch (error) {
      console.error("Get admin member detail error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "관리자 회원 상세 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 관리자 회원 수정
   */
  static async updateAdminMember(
    params: AdminMemberUpdateParams,
  ): Promise<AdminMemberUpdateResponse> {
    try {
      const response = await apiClient.post<AdminMemberUpdateResponse>(
        API_ENDPOINTS.MEMBER.ADMIN_UPDATE,
        params,
      );
      return response;
    } catch (error) {
      console.error("Update admin member error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "관리자 회원 수정 중 오류가 발생했습니다.");
    }
  }

  /** GET /api/admin/artchoi — ARTCHOI 선정 결과 (서버 정렬: Y, R, N) */
  static async getMemberSelectionList(): Promise<MemberArtchoiListItem[]> {
    try {
      const response = await apiClient.get<MemberArtchoiListItem[]>(
        API_ENDPOINTS.MEMBER_SELECTION.LIST,
      );
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("getMemberSelectionList error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "선정 결과를 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 회원 선정 업무 실행
   * 백엔드 API: POST /api/admin/artchoi/selection-insert
   */
  static async runMemberSelection(params: {
    list: {
      resultGb?: string;
      baseId: string;
      item1?: string; item2?: string; item3?: string; item4?: string;
      item5?: string; item6?: string; item7?: string; item8?: string;
      item9?: string; item10?: string; item11?: string; item12?: string;
      item13?: string; item14?: string; item15?: string; item16?: string;
      item17?: string; item18?: string; item19?: string; item20?: string;
    }[];
    selectCnt: number;
    reserveCnt: number;
  }): Promise<{ result?: string; message?: string }> {
    try {
      const response = await apiClient.post<{ result?: string; message?: string }>(
        API_ENDPOINTS.MEMBER_SELECTION.RUN,
        params,
      );
      return response ?? {};
    } catch (error) {
      console.error("runMemberSelection error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "회원 선정 처리 중 오류가 발생했습니다.");
    }
  }

  /**
   * 관리자 회원 탈퇴
   */
  static async deleteAdminMember(
    params: AdminMemberDeleteParams,
  ): Promise<AdminMemberDeleteResponse> {
    try {
      const response = await apiClient.post<AdminMemberDeleteResponse>(
        API_ENDPOINTS.MEMBER.ADMIN_DELETE,
        params,
      );
      return response;
    } catch (error) {
      console.error("Delete admin member error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "관리자 회원 탈퇴 중 오류가 발생했습니다.");
    }
  }
}
