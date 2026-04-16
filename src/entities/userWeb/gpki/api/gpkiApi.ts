import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiUser";

interface ResideInsttCnfirmResultData {
  serviceResult?: string;
  hangkikCd?: string;
  hangkiCd?: string;
  id?: string;
  name?: string;
  [key: string]: unknown;
}

interface ResideInsttCnfirmResponse {
  resultCode?: string;
  resultData?: ResideInsttCnfirmResultData;
}

interface ReductionYnResultData {
  serviceResult?: string;
  [key: string]: unknown;
}

interface ReductionYnResponse {
  resultCode?: string;
  resultData?: ReductionYnResultData;
}

export interface CitizenCheckResult {
  isCitizen: boolean;
  hangkiCd: string;
  reason: "citizen" | "not_gunsan" | "service_unavailable";
  message: string;
  raw: ResideInsttCnfirmResponse;
}

export interface ReductionCheckResult {
  isEligible: boolean;
  reason: "eligible" | "not_eligible" | "service_unavailable";
  message: string;
  raw: ReductionYnResponse;
}

function toYnValue(value: unknown): "Y" | "N" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "Y") return "Y";
  if (normalized === "N") return "N";
  return null;
}

function extractYnFromResultData(data: Record<string, unknown> | undefined): "Y" | "N" | null {
  if (!data) return null;

  for (const [key, value] of Object.entries(data)) {
    if (!/yn/i.test(key) && key !== "serviceResult") continue;
    const yn = toYnValue(value);
    if (yn) return yn;
  }

  return null;
}

export class UserGpkiService {
  private static async checkReductionYn(
    endpoint: string,
    id: string,
    name: string,
    labels: { target: string },
  ): Promise<ReductionCheckResult> {
    try {
      const response = await apiClient.post<ReductionYnResponse>(endpoint, {
        id,
        name,
      });

      if (response?.resultCode !== "0000") {
        return {
          isEligible: false,
          reason: "service_unavailable",
          message: `${labels.target} 조회 서비스 응답이 원활하지 않습니다. 잠시 후 다시 시도해주세요.`,
          raw: response ?? {},
        };
      }

      const yn = extractYnFromResultData(response?.resultData);
      if (!yn) {
        return {
          isEligible: false,
          reason: "service_unavailable",
          message: `${labels.target} 조회 결과를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.`,
          raw: response,
        };
      }

      const isEligible = yn === "Y";
      return {
        isEligible,
        reason: isEligible ? "eligible" : "not_eligible",
        message: isEligible ? `${labels.target} 해당` : "해당안함",
        raw: response,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          isEligible: false,
          reason: "service_unavailable",
          message: `${labels.target} 조회 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`,
          raw: {
            resultCode: String(error.status || "ERROR"),
            resultData: error.data,
          },
        };
      }
      return {
        isEligible: false,
        reason: "service_unavailable",
        message: `${labels.target} 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`,
        raw: {},
      };
    }
  }

  static async checkCitizenByResideCode(
    id: string,
    name: string,
  ): Promise<CitizenCheckResult> {
    try {
      const response = await apiClient.post<ResideInsttCnfirmResponse>(
        API_ENDPOINTS.USER_GPKI.RESIDE_INSTT_CNFRIM,
        { id, name },
      );

      if (response?.resultCode !== "0000") {
        return {
          isCitizen: false,
          hangkiCd: "",
          reason: "service_unavailable",
          message:
            "시민인증 서비스 응답이 원활하지 않습니다. 잠시 후 다시 시도해주세요.",
          raw: response ?? {},
        };
      }

      const codeRaw =
        String(response?.resultData?.hangkiCd ?? "").trim() ||
        String(response?.resultData?.hangkikCd ?? "").trim();
      const isCitizen = codeRaw.startsWith("5213");

      return {
        isCitizen,
        hangkiCd: codeRaw,
        reason: isCitizen ? "citizen" : "not_gunsan",
        message: isCitizen
          ? "군산 시민으로 확인되었습니다."
          : "해당안함",
        raw: response,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          isCitizen: false,
          hangkiCd: "",
          reason: "service_unavailable",
          message: "시민인증 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          raw: {
            resultCode: String(error.status || "ERROR"),
            resultData: error.data,
          },
        };
      }
      return {
        isCitizen: false,
        hangkiCd: "",
        reason: "service_unavailable",
        message: "시민인증 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        raw: {},
      };
    }
  }

  static async checkBasicLivelihoodYn(
    id: string,
    name: string,
  ): Promise<ReductionCheckResult> {
    return this.checkReductionYn(
      API_ENDPOINTS.USER_GPKI.REDUCTION_BSC_LIV_YN,
      id,
      name,
      { target: "기초생활수급자" },
    );
  }

  static async checkPoorYn(
    id: string,
    name: string,
  ): Promise<ReductionCheckResult> {
    return this.checkReductionYn(
      API_ENDPOINTS.USER_GPKI.REDUCTION_POOR_YN,
      id,
      name,
      { target: "차상위계층" },
    );
  }

  static async checkSingleParentYn(
    id: string,
    name: string,
  ): Promise<ReductionCheckResult> {
    return this.checkReductionYn(
      API_ENDPOINTS.USER_GPKI.REDUCTION_SINGLE_PARENT_YN,
      id,
      name,
      { target: "한부모가족" },
    );
  }
}
