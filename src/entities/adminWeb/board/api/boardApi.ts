import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 대상구분 코드 타입
export interface TargetCode {
  codeId: string;
  code: string;
  codeNm: string;
  codeDc: string;
}

// 게시판 유형 코드 타입
export interface BbsSeCode {
  codeld: string;
  code: string;
  codeNm: string;
  codeDc: string;
}

// 사이트 정보 타입
export interface Site {
  siteId: string;
  siteNm: string;
}

// 게시판 관리 화면 응답 타입
export interface BoardMasterManageResponse {
  targetList: TargetCode[];
  [key: string]: any;
}

// 게시판 등록 화면 응답 타입
export interface BoardRegisterScreenResponse {
  bbsSeList: BbsSeCode[];
  siteList: Site[];
  targetList: TargetCode[];
  [key: string]: any;
}

// 게시판 목록 조회 요청 파라미터
export interface BoardListParams {
  searchCondition: string; // "1": 게시판명, "2": 게시판설명
  searchKeyword: string;
  targetGbn: string; // "T": 통합, "S": 학생, "P": 학부모, "A": 학원, "M": 멘토
  length: string;
  start: string;
  // 테이블 필터 파라미터
  filterBbsNm?: string; // 게시판명 필터
  filterBbsDe?: string; // 게시판설명 필터
  filterBbsSeNm?: string; // 게시판유형 필터
  filterSttusCode?: string; // 상태 필터 ("A": 정상, "D": 삭제)
}

// 게시판 정보 타입 (API 응답 구조에 맞게 정의)
export interface Board {
  rnum: string; // 번호
  bbsId: string; // 게시판코드
  siteId: string; // 사이트코드
  bbsSe: string; // 게시판유형코드
  bbsNm: string; // 게시판명
  bbsDe: string; // 게시판설명
  tagUseYn: string; // 사용여부
  atchFileCnt: string; // 파일갯수
  atchFileSize: string; // 파일사이즈
  replyYn: string; // 응답여부
  commentYn: string; // 댓글여부
  crtDate: string; // 등록일
  chgUserId: string; // 최종수정자
  sttusCode: string; // 상태
  bbsSeNm: string; // 게시판유형명
  [key: string]: any;
}

// 게시판 목록 응답 타입
export interface BoardListResponse {
  result?: string; // "00": 성공, "01": 실패
  recordsFiltered?: string | number;
  recordsTotal?: string | number;
  data?: Board[];
  Array?: Board[]; // API 응답에서 배열 필드명이 "Array"일 수 있음
  [key: string]: any;
}

// 게시판 등록 요청 파라미터
export interface BoardRegisterParams {
  siteId: string;
  targetGbn: string;
  bbsSe: string;
  bbsNm: string;
  bbsDe: string;
  atchFileCnt: string;
  replyYn: string;
  secretYn: string; // 비밀글사용여부 (Y/N)
  sttusCode: string;
  uniqId: string;
}

// 게시판 등록 응답 타입
export interface BoardRegisterResponse {
  result: string; // "00": 성공, "01": 실패
  message: string;
  [key: string]: any;
}

// 게시판 수정 요청 파라미터
export interface BoardUpdateParams {
  bbsId: string; // 게시판ID
  siteId: string; // 사이트ID
  bbsSe: string; // 게시판유형코드
  bbsNm: string; // 게시판명
  bbsDe: string; // 게시판설명
  atchFileCnt: string; // 파일첨부개수
  replyYn: string; // 답장가능여부
  secretYn: string; // 비밀글사용여부 (Y/N)
  sttusCode: string; // 게시판상태
  uniqId: string; // 로그인코드
}

// 게시판 수정 응답 타입
export interface BoardUpdateResponse {
  result: string; // "00": 성공, "01": 실패
  message: string;
  [key: string]: any;
}

// 게시판 삭제 요청 파라미터
export interface BoardDeleteParams {
  bbsId: string; // 게시판ID
  uniqId: string; // 로그인코드
}

// 게시판 삭제 응답 타입
export interface BoardDeleteResponse {
  result: string; // "00": 성공, "01": 실패
  message: string;
  [key: string]: any;
}

// 게시판 상세 조회 요청 파라미터
export interface BoardDetailParams {
  bbsId: string;
}

// 게시판 상세 정보 타입
export interface BoardDetail {
  bbsId: string; // 게시판코드
  siteId: string; // 사이트코드
  targetGbn: string; // 대상구분
  bbsSe: string; // 게시판유형코드
  bbsNm: string; // 게시판명
  bbsDe: string; // 게시판설명
  tagUseYn: string; // 사용여부
  atchFileCnt: string; // 파일갯수
  atchFileSize: string; // 파일사이즈
  replyYn: string; // 응답여부
  commentYn: string; // 댓글여부
  readRole: string; // 읽기권한
  writeRole: string; // 쓰기권한
  deleteRole: string; // 삭제권한
  secretYn: string; // 비밀글여부
  captchaAt: string; // 캡차여부
  passAt: string; // 비밀번호여부
  pagePerLen: string; // 페이지당개수
  pageLen: string; // 페이지개수
  useMhrls: string; // 사용여부
  chrgDept: string; // 담당부서
  chargerNm: string; // 담당자명
  tlphonNo: string; // 전화번호
  crtDate: string; // 등록일
  sttusCode: string; // 상태
  codeNm: string; // 게시판유형명
  [key: string]: any;
}

// 게시판 상세 조회 응답 타입
export interface BoardDetailResponse {
  detail?: BoardDetail;
  data?: {
    detail?: BoardDetail;
  };
  [key: string]: any;
}

// 게시판 서비스
export class BoardService {
  /**
   * 게시판 관리 화면 열기 (대상구분 리스트 조회)
   */
  static async getBoardMasterManage(): Promise<BoardMasterManageResponse> {
    try {
      const response = await apiClient.post<BoardMasterManageResponse>(
        API_ENDPOINTS.BOARD.MASTER_MANAGE,
        {},
      );
      return response;
    } catch (error) {
      console.error("Get board master manage error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "게시판 관리 화면 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 게시판 목록 조회
   */
  static async getBoardList(
    params: BoardListParams,
  ): Promise<BoardListResponse> {
    try {
      const response = await apiClient.post<BoardListResponse>(
        API_ENDPOINTS.BOARD.LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get board list error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "게시판 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 게시판 등록 화면 열기 (게시판유형, 사이트, 대상구분 리스트 조회)
   */
  static async getBoardRegisterScreen(): Promise<BoardRegisterScreenResponse> {
    try {
      const response = await apiClient.post<BoardRegisterScreenResponse>(
        API_ENDPOINTS.BOARD.REGISTER_SCREEN,
        {},
      );
      return response;
    } catch (error) {
      console.error("Get board register screen error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "게시판 등록 화면 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 게시판 등록
   */
  static async registerBoard(
    params: BoardRegisterParams,
  ): Promise<BoardRegisterResponse> {
    try {
      const response = await apiClient.post<BoardRegisterResponse>(
        API_ENDPOINTS.BOARD.REGISTER,
        params,
      );
      return response;
    } catch (error) {
      console.error("Register board error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "게시판 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 게시판 상세 조회
   */
  static async getBoardDetail(
    params: BoardDetailParams,
  ): Promise<BoardDetailResponse> {
    try {
      const response = await apiClient.post<BoardDetailResponse>(
        API_ENDPOINTS.BOARD.DETAIL,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get board detail error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "게시판 상세 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 게시판 수정
   */
  static async updateBoard(
    params: BoardUpdateParams,
  ): Promise<BoardUpdateResponse> {
    try {
      const response = await apiClient.post<BoardUpdateResponse>(
        API_ENDPOINTS.BOARD.UPDATE,
        params,
      );
      return response;
    } catch (error) {
      console.error("Update board error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "게시판 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 게시판 삭제
   */
  static async deleteBoard(
    params: BoardDeleteParams,
  ): Promise<BoardDeleteResponse> {
    try {
      const response = await apiClient.post<BoardDeleteResponse>(
        API_ENDPOINTS.BOARD.DELETE,
        params,
      );
      return response;
    } catch (error) {
      console.error("Delete board error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "게시판 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 게시판 엑셀 목록 조회
   */
  static async getBoardsExcel(
    params: Omit<BoardListParams, "length" | "start">,
  ): Promise<BoardListResponse> {
    try {
      const response = await apiClient.post<BoardListResponse>(
        API_ENDPOINTS.BOARD.EXCEL_LIST,
        params,
      );
      return response;
    } catch (error) {
      console.error("Get boards excel error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "게시판 Excel 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }
}
