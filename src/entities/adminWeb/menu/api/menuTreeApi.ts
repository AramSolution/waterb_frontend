import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 메뉴 아이템 타입 (API 응답 구조)
// SQL에서 UPPER_MENU_NO AS UPPER_MENU_ID로 alias되어 있음
export interface MenuItem {
  MENU_NO?: string;
  menuNo?: string;
  UPPER_MENU_NO?: string;
  UPPER_MENU_ID?: string; // SQL alias
  upperMenuId?: string;
  MENU_NM?: string;
  menuNm?: string;
  MENU_ORDR?: string;
  menuOrdr?: string;
  PROGRM_FILE_NM?: string;
  progrmFileNm?: string;
  MENU_DC?: string;
  menuDc?: string;
  RELATE_IMAGE_PATH?: string;
  relateImagePath?: string;
  RELATE_IMAGE_NM?: string;
  relateImageNm?: string;
}

// 메뉴 트리 목록 조회 응답
export interface MenuTreeListResponse {
  data: MenuItem[];
  result: string;
}

// 메뉴 상세 조회 요청 파라미터
export interface MenuDetailParams {
  menuNo: string;
}

// 메뉴 상세 조회 응답
export interface MenuDetailResponse {
  data: MenuItem;
  result: string;
}

// 메뉴 등록 요청 파라미터
export interface MenuInsertParams {
  menuNo: string;
  upperMenuNo: string;
  menuOrdr: string;
  menuNm: string;
  progrmFileNm: string;
  menuDc: string;
  relateImagePath: string;
  relateImageNm: string;
}

// 메뉴 등록 응답
export interface MenuInsertResponse {
  result: string;
  message: string;
}

// 메뉴 수정 요청 파라미터
export interface MenuUpdateParams {
  menuNo: string;
  upperMenuNo: string;
  menuOrdr: string;
  menuNm: string;
  progrmFileNm: string;
  menuDc: string;
  relateImagePath: string;
  relateImageNm: string;
}

// 메뉴 수정 응답
export interface MenuUpdateResponse {
  result: string;
  message: string;
}

// 메뉴 삭제 요청 파라미터
export interface MenuDeleteParams {
  menuNo: string;
}

// 메뉴 삭제 응답
export interface MenuDeleteResponse {
  data: any;
  result: string;
}

export class MenuTreeService {
  // 메뉴 트리 목록 조회
  static async getMenuTreeList(): Promise<MenuTreeListResponse> {
    const response = await apiClient.post<MenuTreeListResponse>(
      API_ENDPOINTS.MENU.TREE_LIST,
      {},
    );
    return response;
  }

  // 메뉴 상세 조회
  static async getMenuDetail(
    params: MenuDetailParams,
  ): Promise<MenuDetailResponse> {
    const response = await apiClient.post<MenuDetailResponse>(
      API_ENDPOINTS.MENU.TREE_DETAIL,
      params,
    );
    return response;
  }

  // 메뉴 등록
  static async insertMenu(
    params: MenuInsertParams,
  ): Promise<MenuInsertResponse> {
    const response = await apiClient.post<MenuInsertResponse>(
      API_ENDPOINTS.MENU.TREE_INSERT,
      params,
    );
    return response;
  }

  // 메뉴 수정
  static async updateMenu(
    params: MenuUpdateParams,
  ): Promise<MenuUpdateResponse> {
    const response = await apiClient.post<MenuUpdateResponse>(
      API_ENDPOINTS.MENU.TREE_UPDATE,
      params,
    );
    return response;
  }

  // 메뉴 삭제
  static async deleteMenu(
    params: MenuDeleteParams,
  ): Promise<MenuDeleteResponse> {
    const response = await apiClient.post<MenuDeleteResponse>(
      API_ENDPOINTS.MENU.TREE_DELETE,
      params,
    );
    return response;
  }
}
