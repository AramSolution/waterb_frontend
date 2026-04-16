import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 메뉴생성관리 목록 조회 요청 파라미터
export interface MenuMakeListParams {
  searchCondition: string; // "1": 권한코드, "2": 권한명, "3": 권한설명
  searchKeyword: string;
}

// 메뉴생성관리 정보 타입
export interface MenuMake {
  rnum: number; // 번호
  authorCode: string; // 권한코드
  authorNm: string; // 권한명
  authorDc: string; // 권한설명
  authorCreatDe: string; // 권한생성일시
  chkYeoBu: string; // 메뉴생성여부
  [key: string]: any;
}

// 메뉴생성관리 목록 응답 타입
export interface MenuMakeListResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  data?: MenuMake[];
  Array?: MenuMake[];
  list?: MenuMake[];
  content?: MenuMake[];
  [key: string]: any;
}

// 메뉴 생성 내역 조회 요청 파라미터
export interface MenuCreatListParams {
  authorCode: string; // 권한코드
}

// 메뉴 생성 내역 정보 타입
export interface MenuCreatItem {
  MENU_NO: string; // 메뉴번호
  MENU_ORDR: string; // 메뉴순서
  MENU_NM: string; // 메뉴명
  UPPER_MENU_ID: string; // 상위메뉴ID
  CHK_YEO_BU: string; // 체크여부 (0: 미생성, 1: 생성)
  [key: string]: any;
}

// 메뉴 생성 내역 응답 타입
export interface MenuCreatListResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  data?: MenuCreatItem[];
  Array?: MenuCreatItem[];
  list?: MenuCreatItem[];
  content?: MenuCreatItem[];
  [key: string]: any;
}

// 메뉴 생성 저장 요청 파라미터
export interface InsertMenuCreatListParams {
  authorCode: string; // 권한코드
  menuNo: string[]; // 메뉴번호 배열
}

// 메뉴 생성 저장 응답 타입
export interface InsertMenuCreatListResponse {
  result?: string;
  resultCode?: string;
  resultMessage?: string;
  [key: string]: any;
}

export class MenuMakeService {
  // 메뉴생성관리 목록 조회
  static async getMenuMakeList(
    params: MenuMakeListParams,
  ): Promise<MenuMakeListResponse> {
    try {
      const response = await apiClient.post<MenuMakeListResponse>(
        API_ENDPOINTS.MENU.MAKE_LIST,
        params,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "메뉴생성관리 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  // 메뉴 생성 내역 조회
  static async getMenuCreatList(
    params: MenuCreatListParams,
  ): Promise<MenuCreatListResponse> {
    try {
      const response = await apiClient.post<MenuCreatListResponse>(
        API_ENDPOINTS.MENU.CREAT_LIST,
        params,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "메뉴 생성 내역을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  // 메뉴 생성 저장
  static async insertMenuCreatList(
    params: InsertMenuCreatListParams,
  ): Promise<InsertMenuCreatListResponse> {
    try {
      const response = await apiClient.post<InsertMenuCreatListResponse>(
        API_ENDPOINTS.MENU.INSERT_MENU_CREAT_LIST,
        params,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "메뉴 생성 저장 중 오류가 발생했습니다.");
    }
  }
}
