import { API_CONFIG } from "@/shared/config/api";

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API 에러 클래스
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// API 클라이언트
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    // BASE_URL이 절대 URL인지 확인
    let baseURL = API_CONFIG.BASE_URL;

    // BASE_URL이 없거나 상대 경로인 경우 에러
    if (
      !baseURL ||
      (!baseURL.startsWith("http://") && !baseURL.startsWith("https://"))
    ) {
      const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      console.error("⚠️ BASE_URL이 올바르지 않습니다.");
      console.error("  환경 변수 NEXT_PUBLIC_API_BASE_URL:", envUrl);
      console.error(
        "  .env.local 파일에 NEXT_PUBLIC_API_BASE_URL을 설정하세요.",
      );
      throw new Error(
        "API BASE_URL이 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_API_BASE_URL을 설정하세요.",
      );
    }

    this.baseURL = baseURL;
    this.timeout = API_CONFIG.TIMEOUT;

    // 생성 시점에 BASE_URL 확인 (주석 처리)
    // console.log("🔧 ApiClient 초기화:");
    // console.log("  BASE_URL:", this.baseURL);
    // console.log("  TIMEOUT:", this.timeout);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // endpoint가 절대 URL이면 그대로 사용, 아니면 baseURL과 결합
    const isAbsoluteEndpoint =
      endpoint.startsWith("http://") || endpoint.startsWith("https://");
    const url = isAbsoluteEndpoint ? endpoint : `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // 디버깅: BASE_URL과 최종 URL 확인
      /*
      console.group('🌐 API 요청 정보');
      console.log('BASE_URL:', this.baseURL);
      console.log('Endpoint:', endpoint);
      console.log('최종 URL:', url);
      console.groupEnd();
      */
      // 기본 헤더 설정
      // FormData인 경우 Content-Type을 설정하지 않음 (브라우저가 자동으로 multipart/form-data 설정)
      const isFormData = options.body instanceof FormData;
      const headers: HeadersInit = {
        ...(!isFormData && { "Content-Type": "application/json" }),
        ...(options.headers as Record<string, string>),
      };

      // 토큰이 있으면 헤더에 추가
      const token = sessionStorage.getItem("accessToken");

      if (token) {
        headers["Authorization"] = `${token}`;
        // console.log(
        //   "🔑 Authorization 헤더:",
        //   `Bearer ${token.substring(0, 30)}...`
        // );
      } else {
        // console.warn(
        //   "⚠️ 토큰이 없습니다. Authorization 헤더가 추가되지 않았습니다."
        // );
      }
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 응답 처리
      if (!response.ok) {
        // 응답이 JSON이 아닐 수 있으므로 텍스트로 먼저 읽기
        let errorData: any = {};
        const contentType = response.headers.get("content-type");

        try {
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            errorData = { message: text || response.statusText };
          }
        } catch (parseError) {
          errorData = { message: response.statusText || "알 수 없는 오류" };
        }

        // 401 에러 상세 로그 (주석 처리)
        // if (response.status === 401) {
        //   console.group("❌ 401 Unauthorized 에러 상세");
        //   console.error("상태 코드:", response.status);
        //   console.error("상태 텍스트:", response.statusText);
        //   console.error("에러 데이터:", errorData);
        //   console.error("요청 URL:", url);
        //   console.error("요청 메소드:", options.method || "GET");
        //   console.error("요청 헤더:", headers);

        //   // 응답 헤더 확인
        //   console.log("응답 헤더:");
        //   response.headers.forEach((value, key) => {
        //     console.log(`  ${key}: ${value}`);
        //   });

        //   // 토큰 정보 확인
        //   if (token) {
        //     console.log("전송된 토큰:", token.substring(0, 50) + "...");
        //     console.log("토큰 전체 길이:", token.length);

        //     // JWT 파싱 시도
        //     try {
        //       const parts = token.split(".");
        //       if (parts.length === 3) {
        //         const payload = JSON.parse(
        //           atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        //         );
        //         console.log("토큰 Payload:", payload);

        //         if (payload.exp) {
        //           const now = Math.floor(Date.now() / 1000);
        //           const isExpired = now >= payload.exp;
        //           console.log(
        //             "토큰 만료 여부:",
        //             isExpired ? "만료됨" : "유효함"
        //           );
        //           console.log(
        //             "만료 시간:",
        //             new Date(payload.exp * 1000).toLocaleString()
        //           );
        //           console.log(
        //             "현재 시간:",
        //             new Date(now * 1000).toLocaleString()
        //           );
        //         }
        //       }
        //     } catch (e) {
        //       console.error("토큰 파싱 실패:", e);
        //     }
        //   } else {
        //     console.error("토큰이 sessionStorage에 없습니다!");
        //   }

        //   console.groupEnd();
        // }

        const method = options.method || "GET";
        const hasStructuredError = Boolean(errorData?.resultCode);

        // resultCode/resultMessage 형태는 백엔드의 의도된 오류 응답이므로 요약만 출력
        if (hasStructuredError) {
          console.warn(
            `[API ${response.status}] ${method} ${url} - ${errorData.resultCode}: ${
              errorData.resultMessage ||
              errorData.message ||
              response.statusText
            }`,
          );
        } else {
          console.group("❌ API 에러 응답");
          console.error("상태 코드:", response.status);
          console.error("상태 텍스트:", response.statusText);
          console.error("에러 데이터:", errorData);
          console.error("요청 URL:", url);
          console.error("요청 메소드:", method);

          // "No static resource" 에러인 경우 특별 처리
          if (
            errorData.message &&
            errorData.message.includes("No static resource")
          ) {
            console.error("⚠️ Next.js가 이 경로를 정적 파일로 인식했습니다.");
            console.error("→ BASE_URL이 올바르게 설정되었는지 확인하세요.");
            console.error("→ 현재 BASE_URL:", this.baseURL);
            console.error("→ 전체 URL:", url);
          }
          console.groupEnd();
        }

        const errorMessage =
          errorData?.resultMessage ||
          errorData?.message ||
          response.statusText ||
          "요청 처리 중 오류가 발생했습니다.";

        throw new ApiError(response.status, errorMessage, errorData);
      }

      // 204 No Content: body 없음
      if (response.status === 204) {
        return undefined as T;
      }

      // JSON 응답 파싱
      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new ApiError(408, "요청 시간이 초과되었습니다.");
        }
        throw new ApiError(0, error.message);
      }

      throw new ApiError(0, "알 수 없는 오류가 발생했습니다.");
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    // FormData인 경우 Content-Type을 설정하지 않음 (브라우저가 자동 설정)
    const isFormData = data instanceof FormData;
    const headers: HeadersInit = isFormData
      ? {}
      : { "Content-Type": "application/json" };

    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      headers: {
        ...headers,
        ...((options?.headers as Record<string, string>) || {}),
      },
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...((options?.headers as Record<string, string>) || {}),
      },
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

// API 클라이언트 인스턴스 생성 및 내보내기
export const apiClient = new ApiClient();

// 토큰 유틸리티 함수
export const TokenUtils = {
  /**
   * 토큰 존재 여부 확인
   */
  hasToken(): boolean {
    const token = sessionStorage.getItem("accessToken");
    return !!token;
  },

  /**
   * 토큰 가져오기
   */
  getToken(): string | null {
    return sessionStorage.getItem("accessToken");
  },

  /**
   * 토큰 정보 파싱 (JWT)
   */
  parseToken(token?: string): any {
    const accessToken = token || sessionStorage.getItem("accessToken");
    if (!accessToken) {
      console.error("토큰이 없습니다.");
      return null;
    }

    try {
      // JWT는 header.payload.signature 형식
      const parts = accessToken.split(".");
      if (parts.length !== 3) {
        // console.error("유효하지 않은 JWT 형식입니다.");
        return null;
      }

      // payload 부분을 base64 디코딩
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(decoded);

      // console.log("📝 토큰 정보:", parsed);
      return parsed;
    } catch (error) {
      console.error("토큰 파싱 실패:", error);
      return null;
    }
  },

  /**
   * 토큰 만료 여부 확인
   */
  isTokenExpired(token?: string): boolean {
    const parsed = this.parseToken(token);
    if (!parsed || !parsed.exp) {
      // console.warn("토큰에 만료 시간(exp)이 없습니다.");
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = now >= parsed.exp;

    // if (isExpired) {
    //   console.error("❌ 토큰이 만료되었습니다.");
    //   console.log("만료 시간:", new Date(parsed.exp * 1000).toLocaleString());
    //   console.log("현재 시간:", new Date(now * 1000).toLocaleString());
    // } else {
    //   const remainingSeconds = parsed.exp - now;
    //   const remainingMinutes = Math.floor(remainingSeconds / 60);
    //   console.log(
    //     `✅ 토큰 유효 (남은 시간: ${remainingMinutes}분 ${
    //       remainingSeconds % 60
    //     }초)`
    //   );
    // }

    return isExpired;
  },

  /**
   * 토큰 정보 출력 (디버깅용)
   */
  debugToken(): void {
    // console.group("🔐 토큰 디버그 정보");
    // const token = this.getToken();
    // console.log("토큰 존재:", this.hasToken());
    // if (token) {
    //   console.log("토큰 값:", token.substring(0, 50) + "...");
    //   const parsed = this.parseToken();
    //   if (parsed) {
    //     console.log("사용자 ID:", parsed.sub || parsed.userId || parsed.id);
    //     console.log("사용자 구분:", parsed.userSe);
    //     console.log(
    //       "발급 시간:",
    //       parsed.iat ? new Date(parsed.iat * 1000).toLocaleString() : "N/A"
    //     );
    //     console.log(
    //       "만료 시간:",
    //       parsed.exp ? new Date(parsed.exp * 1000).toLocaleString() : "N/A"
    //     );
    //     console.log(
    //       "만료 여부:",
    //       this.isTokenExpired() ? "❌ 만료됨" : "✅ 유효함"
    //     );
    //   }
    // } else {
    //   console.warn("저장된 토큰이 없습니다.");
    // }
    // console.groupEnd();
  },

  /**
   * 토큰 유효성 검증 (만료 + 형식)
   */
  isTokenValid(): boolean {
    if (!this.hasToken()) {
      // console.error("토큰이 존재하지 않습니다.");
      return false;
    }

    if (this.isTokenExpired()) {
      // console.error("토큰이 만료되었습니다.");
      return false;
    }

    // console.log("✅ 토큰이 유효합니다.");
    return true;
  },

  /**
   * 401 에러 원인 진단
   */
  diagnose401Error(): void {
    // console.group("🔬 401 에러 원인 진단");
    // const token = this.getToken();
    // // 1. 토큰 존재 여부
    // console.log("1️⃣ 토큰 존재 여부:", this.hasToken() ? "✅ 존재" : "❌ 없음");
    // if (!token) {
    //   console.error("→ 원인: 토큰이 sessionStorage에 없습니다.");
    //   console.log("→ 해결: 로그인을 다시 시도하세요.");
    //   console.groupEnd();
    //   return;
    // }
    // // 2. 토큰 형식 확인
    // const parts = token.split(".");
    // console.log(
    //   "2️⃣ JWT 형식 확인:",
    //   parts.length === 3 ? "✅ 올바름" : "❌ 잘못됨"
    // );
    // if (parts.length !== 3) {
    //   console.error("→ 원인: JWT 형식이 올바르지 않습니다.");
    //   console.log("→ 현재 형식:", `${parts.length} parts (정상: 3 parts)`);
    //   console.groupEnd();
    //   return;
    // }
    // // 3. 토큰 만료 확인
    // const parsed = this.parseToken();
    // if (parsed && parsed.exp) {
    //   const now = Math.floor(Date.now() / 1000);
    //   const isExpired = now >= parsed.exp;
    //   console.log("3️⃣ 토큰 만료 여부:", isExpired ? "❌ 만료됨" : "✅ 유효함");
    //   if (isExpired) {
    //     console.error("→ 원인: 토큰이 만료되었습니다.");
    //     console.log(
    //       "→ 만료 시간:",
    //       new Date(parsed.exp * 1000).toLocaleString()
    //     );
    //     console.log("→ 현재 시간:", new Date(now * 1000).toLocaleString());
    //     console.log("→ 해결: 로그인을 다시 시도하세요.");
    //     console.groupEnd();
    //     return;
    //   }
    // }
    // // 4. Authorization 헤더 형식 확인
    // console.log("4️⃣ Authorization 헤더 형식:");
    // console.log("  - 사용 중인 형식:", `Bearer ${token.substring(0, 20)}...`);
    // console.log("  - 올바른 형식:", "Bearer <token>");
    // // 5. 백엔드 요구사항 확인
    // console.log("5️⃣ 백엔드 확인 사항:");
    // console.log("  ⚠️ 다음 사항을 백엔드에서 확인하세요:");
    // console.log("  - JWT 서명(signature) 검증이 올바른가?");
    // console.log("  - 토큰 발급자(issuer)가 일치하는가?");
    // console.log("  - 토큰의 비밀키(secret key)가 일치하는가?");
    // console.log(
    //   "  - Authorization 헤더를 올바르게 파싱하는가? (Bearer prefix 제거)"
    // );
    // console.log("  - CORS 설정이 올바른가? (헤더 허용)");
    // console.log("  - 토큰에 포함된 사용자 정보가 DB에 존재하는가?");
    // // 6. 가능한 원인 목록
    // console.log("6️⃣ 401 에러 가능한 원인:");
    // console.log("  1. 백엔드 JWT 서명 검증 실패 (비밀키 불일치)");
    // console.log("  2. 백엔드에서 Authorization 헤더 파싱 오류");
    // console.log('  3. 백엔드에서 "Bearer " prefix를 제거하지 않음');
    // console.log("  4. 백엔드 CORS 설정 문제 (Authorization 헤더 차단)");
    // console.log("  5. 토큰의 사용자 정보가 DB에 없음");
    // console.log("  6. 백엔드 Security Filter 설정 오류");
    // console.log("  7. 토큰의 claims(payload) 형식이 백엔드 요구사항과 불일치");
    // console.groupEnd();
  },

  /**
   * 백엔드 연동 체크리스트 출력
   */
  printBackendChecklist(): void {
    // console.group("📋 백엔드 연동 체크리스트");
    // console.log("✅ 프론트엔드 (현재 설정):");
    // console.log("  - Authorization 헤더: Bearer <token>");
    // console.log("  - Content-Type: application/json");
    // console.log("  - 토큰 저장 위치: sessionStorage.accessToken");
    // console.log("\n❓ 백엔드에서 확인해야 할 사항:");
    // console.log("\n1. JWT 검증 설정:");
    // console.log("   - JWT 비밀키(secret key)가 토큰 발급 시와 동일한가?");
    // console.log("   - JWT 알고리즘(algorithm)이 일치하는가? (예: HS256)");
    // console.log("   - JWT issuer, audience 등이 일치하는가?");
    // console.log("\n2. Security Filter 설정:");
    // console.log('   - Authorization 헤더에서 "Bearer " prefix를 제거하는가?');
    // console.log("   - 토큰 파싱 로직이 올바른가?");
    // console.log("   - /api/v1/memberList 경로가 인증 필터에 포함되는가?");
    // console.log("\n3. CORS 설정:");
    // console.log(
    //   "   - Access-Control-Allow-Headers에 Authorization이 포함되는가?"
    // );
    // console.log("   - Access-Control-Allow-Origin이 올바른가?");
    // console.log("   - preflight 요청(OPTIONS)을 허용하는가?");
    // console.log("\n4. 데이터베이스:");
    // console.log("   - 토큰의 사용자 정보(sub, userId 등)가 DB에 존재하는가?");
    // console.log("   - 사용자 상태가 활성(active)인가?");
    // console.log("\n5. 로그 확인:");
    // console.log("   - 백엔드 콘솔 로그를 확인하세요.");
    // console.log("   - JWT 검증 실패 로그가 있는지 확인하세요.");
    // console.log("   - Security Filter의 로그를 확인하세요.");
    // console.groupEnd();
  },
};
