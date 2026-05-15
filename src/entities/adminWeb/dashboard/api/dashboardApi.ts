import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

export interface PaymentMoMRequest {
  baseMonth: string;
}

export interface PaymentMoMData {
  baseMonth?: string;
  compareMonth?: string;
  currPayCount?: number;
  prevPayCount?: number;
  payCountChangePercent?: number;
  currPayAmount?: number;
  prevPayAmount?: number;
  payAmountChangePercent?: number;
  currUnpaidCount?: number;
  prevUnpaidCount?: number;
  unpaidCountChangePercent?: number;
  currUnpaidAmount?: number;
  prevUnpaidAmount?: number;
  unpaidAmountChangePercent?: number;
}

export interface PaymentMoMResponse {
  result?: string;
  message?: string;
  data?: PaymentMoMData;
}

export class DashboardService {
  static async getPaymentMonthOverMonth(
    params: PaymentMoMRequest,
  ): Promise<PaymentMoMResponse> {
    try {
      return await apiClient.post<PaymentMoMResponse>(
        API_ENDPOINTS.DASHBOARD.PAYMENT_MOM,
        params,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error
          ? error.message
          : "납부 월별 비교 조회에 실패했습니다.",
      );
    }
  }
}
