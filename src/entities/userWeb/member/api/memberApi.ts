import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiUser";

export interface CheckMemberIdResponse {
  result?: string;
  message?: string;
  exist?: number;
}

export class UserMemberService {
  static async checkMemberId(
    userId: string,
  ): Promise<CheckMemberIdResponse> {
    try {
      return await apiClient.get<CheckMemberIdResponse>(
        API_ENDPOINTS.ARMUSER_USER.USER_ID_CHECK(userId),
      );
    } catch (error) {
      console.error("아이디 중복확인 실패:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "아이디 중복 확인 중 오류가 발생했습니다.");
    }
  }
}
