import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

/** 백엔드 BannerListRequest 와 동일 */
export interface BannerListRequestBody {
  startIndex: number;
  lengthPage: number;
  searchCondition?: string;
  searchKeyword?: string;
  banrGb?: string;
  userGbn?: string;
}

export interface BannerItemResponse {
  rnum?: string;
  banrCd?: string;
  banrGb?: string;
  title?: string;
  linkGb?: string;
  linkUrl?: string;
  imgUrl?: string;
  imgUrl1?: string;
  fileCd?: string;
  widthSize?: number;
  heightSize?: number;
  posiX?: number;
  posiY?: number;
  startDttm?: string;
  endDttm?: string;
  orderBy?: number;
  statCode?: string;
}

export interface BannerListResponse {
  result?: string;
  recordsFiltered?: number;
  recordsTotal?: number;
  data?: BannerItemResponse[];
}

/** 백엔드 BannerDetailDataResponse */
export interface BannerDetailDataResponse {
  banrCd?: string;
  banrGb?: string;
  title?: string;
  body?: string;
  linkGb?: string;
  linkUrl?: string;
  imgUrl?: string;
  orgfNm?: string;
  fileCd?: string;
  widthSize?: number;
  heightSize?: number;
  posiX?: number;
  posiY?: number;
  startDt?: string;
  endDt?: string;
  startDttm?: string;
  endDttm?: string;
  orderBy?: number;
  statCode?: string;
}

export interface BannerDetailResponse {
  result?: string;
  data?: BannerDetailDataResponse | null;
}

export interface BannerResultResponse {
  result?: string;
  message?: string;
  data?: number;
}

export class BannerService {
  static async getBannerList(
    body: BannerListRequestBody,
  ): Promise<BannerListResponse> {
    try {
      return await apiClient.post<BannerListResponse>(
        API_ENDPOINTS.BANNER.LIST,
        body,
      );
    } catch (error) {
      console.error("Get banner list error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "배너 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  static async getBannerDetail(banrCd: string): Promise<BannerDetailResponse> {
    try {
      return await apiClient.get<BannerDetailResponse>(
        API_ENDPOINTS.BANNER.detail(banrCd),
      );
    } catch (error) {
      console.error("Get banner detail error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "배너 상세를 불러오는 중 오류가 발생했습니다.");
    }
  }

  static async deleteBanner(banrCd: string): Promise<BannerResultResponse> {
    try {
      return await apiClient.delete<BannerResultResponse>(
        API_ENDPOINTS.BANNER.delete(banrCd),
      );
    } catch (error) {
      console.error("Delete banner error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "배너 삭제 중 오류가 발생했습니다.");
    }
  }

  static async deleteBannerImage(
    banrCd: string,
  ): Promise<BannerResultResponse> {
    try {
      return await apiClient.delete<BannerResultResponse>(
        API_ENDPOINTS.BANNER.deleteImage(banrCd),
      );
    } catch (error) {
      console.error("Delete banner image error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "배너 이미지 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 배너 수정 — multipart: `data`(JSON), `imageFile`(선택)
   */
  /**
   * 배너 등록 — multipart: `data`(JSON), `imageFile`(선택, 권장)
   */
  static async insertBanner(
    data: Record<string, unknown>,
    imageFile?: File | null,
  ): Promise<BannerResultResponse> {
    try {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(data)], { type: "application/json" }),
      );
      if (imageFile && imageFile.size > 0) {
        formData.append("imageFile", imageFile);
      }
      return await apiClient.post<BannerResultResponse>(
        API_ENDPOINTS.BANNER.REGISTER,
        formData,
      );
    } catch (error) {
      console.error("Insert banner error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "배너 등록 중 오류가 발생했습니다.");
    }
  }

  static async updateBanner(
    banrCd: string,
    data: Record<string, unknown>,
    imageFile?: File | null,
  ): Promise<BannerResultResponse> {
    try {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(data)], { type: "application/json" }),
      );
      if (imageFile && imageFile.size > 0) {
        formData.append("imageFile", imageFile);
      }
      return await apiClient.put<BannerResultResponse>(
        API_ENDPOINTS.BANNER.detail(banrCd),
        formData,
      );
    } catch (error) {
      console.error("Update banner error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "배너 수정 중 오류가 발생했습니다.");
    }
  }
}
