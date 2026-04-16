import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { AUTH, API_CONFIG } from "@/shared/config/api";
import { SessionManager } from "@/shared/lib/sessionManager";
import { DuplicateLoginManager } from "@/shared/lib/duplicateLoginManager";

// 로그인 요청 타입
export interface LoginRequest {
  id: string;
  password: string;
  remember?: boolean;
  userSe: string;
  forceLogin?: boolean; // 강제 로그인 여부
}

// 로그인 응답 타입
export interface LoginResponse {
  accessToken?: string;
  token?: string; // 일부 백엔드는 token 필드 사용
  refreshToken?: string;
  resultVO?: {
    userSe: string;
    id: string;
    username?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  // 백엔드가 직접 유저 정보를 루트에 포함하는 경우
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  // 중복 로그인 관련
  duplicateLogin?: boolean; // 중복 로그인 여부
  existingSessionId?: string; // 기존 세션 ID
}

export interface OAuthLinkConfirmResponse {
  accessToken: string;
  state?: string;
  userSe?: string;
  uniqId?: string;
}

export interface FindUserIdRequest {
  userSe: string;
  /** 이름·이메일 방식 아이디 찾기 */
  userNm?: string;
  emailAdres?: string;
  /** 본인인증 DI(개인식별코드)로 아이디 찾기 — 회원가입 시 CRTFC_DN_VALUE와 동일 값 */
  crtfcDnValue?: string;
}

export interface FindUserIdResponse {
  resultCode?: string;
  resultMessage?: string;
  /** 본인인증 기반 아이디 찾기: 전체 로그인 아이디 */
  userId?: string | null;
  maskedUserId?: string | null;
}

export interface FindUserIdByRecoveryTokenRequest {
  recoveryToken: string;
}

/** POST /auth/password-reset/request — 본인인증 기반 비밀번호 재설정 */
export interface PasswordResetRequestBody {
  userSe: string;
  /** 평문 새 비밀번호(서버에서 로그인 ID 기준 암호화 저장) */
  newPassword: string;
  userId?: string;
  emailAdres?: string;
  recoveryToken?: string;
  crtfcDnValue?: string;
}

export interface PasswordResetRequestResponse {
  resultCode?: string;
  resultMessage?: string;
}

// 인증 서비스
export class AuthService {
  /**
   * JWT(accessToken)을 기반으로 sessionStorage(userSe/user/userId/username)를 동기화.
   * - 일반로그인/간편로그인 공통으로 "MY PAGE 테마/폼"이 정확히 나오도록 보장.
   */
  static applyAccessToken(accessToken: string): void {
    if (typeof window === "undefined") return;
    const token = (accessToken || "").trim();
    if (!token) return;

    sessionStorage.setItem("accessToken", token);
    sessionStorage.setItem("isLoggedIn", "true");

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "=",
      );
      const payload = JSON.parse(atob(padded)) as {
        id?: string;
        name?: string;
        userSe?: string;
        uniqId?: string;
        orgnztId?: string;
        groupNm?: string;
      };

      if (payload?.userSe) sessionStorage.setItem("userSe", payload.userSe);
      if (payload?.id) sessionStorage.setItem("userId", payload.id);
      if (payload?.name) sessionStorage.setItem("username", payload.name);

      const userInfo = {
        userSe: payload?.userSe,
        id: payload?.id,
        name: payload?.name,
        uniqId: payload?.uniqId,
        esntlId: payload?.uniqId,
        orgnztId: payload?.orgnztId,
        role: payload?.groupNm,
      };
      sessionStorage.setItem("user", JSON.stringify(userInfo));
    } catch {
      // 파싱 실패 시에도 accessToken/isLoggedIn은 유지 (API 호출은 가능)
    }
  }

  /**
   * 로그인
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<any>(AUTH.LOGIN, {
        id: credentials.id,
        password: credentials.password,
        userSe: credentials.userSe,
        forceLogin: credentials.forceLogin || false,
      });

      // 로그인 실패 체크 (resultCode가 "300"인 경우)
      if (response.resultCode === "300" || response.resultCode === 300) {
        throw new ApiError(
          401,
          response.resultMessage || "로그인에 실패했습니다.",
        );
      }

      // 토큰 추출 (accessToken 또는 token 필드)
      const token = response.accessToken || response.token;

      if (token) {
        // 토큰 기반으로 세션 동기화(특히 uniqId/userSe)
        this.applyAccessToken(token);

        // refreshToken 저장
        if (response.refreshToken) {
          sessionStorage.setItem("refreshToken", response.refreshToken);
        }

        // 사용자 정보 처리
        let userInfo;

        if (response.resultVO) {
          // user 객체가 있는 경우
          userInfo = response.resultVO;
        } else {
          // 루트 레벨에 사용자 정보가 있는 경우
          userInfo = {
            id: response.id || credentials.id,
            name: response.name || credentials.id,
            email: response.email,
            role: response.role,
          };
        }

        // 사용자 정보 저장(백엔드가 userSe를 내려주면 우선)
        if (userInfo) {
          if (userInfo.userSe)
            sessionStorage.setItem("userSe", userInfo.userSe);
          else if (credentials.userSe)
            sessionStorage.setItem("userSe", credentials.userSe);
          sessionStorage.setItem("userId", userInfo.id || credentials.id);
          sessionStorage.setItem("username", userInfo.name || credentials.id);
          sessionStorage.setItem("user", JSON.stringify(userInfo));
        }

        // 세션 시작 (기본 30분)
        const sessionId = SessionManager.startSession(30);

        // 활성 세션 등록
        DuplicateLoginManager.setActiveSession(credentials.id, sessionId);
      } else {
        throw new ApiError(500, "토큰을 받지 못했습니다.");
      }

      return response;
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "로그인 중 오류가 발생했습니다.");
    }
  }

  /**
   * 아이디 찾기 (이름·이메일·회원유형)
   */
  static async findUserId(
    body: FindUserIdRequest,
  ): Promise<FindUserIdResponse> {
    return apiClient.post<FindUserIdResponse>(AUTH.FIND_USER_ID, body);
  }

  /**
   * 아이디 찾기 — 본인인증으로 받은 DI(crtfcDnValue) + 회원 유형(userSe)로 로그인 아이디 조회
   */
  static async findUserIdByCrtfcDn(body: {
    userSe: string;
    crtfcDnValue: string;
  }): Promise<FindUserIdResponse> {
    const v = (body.crtfcDnValue || "").trim();
    if (!v) {
      throw new ApiError(400, "본인인증 정보(DI)가 없습니다.");
    }
    return apiClient.post<FindUserIdResponse>(AUTH.FIND_USER_ID, {
      userSe: body.userSe,
      crtfcDnValue: v,
    });
  }

  /**
   * 아이디 찾기 — 본인인증 완료 후 발급된 recoveryToken으로 마스킹 아이디 조회
   */
  static async findUserIdByRecoveryToken(
    body: FindUserIdByRecoveryTokenRequest,
  ): Promise<FindUserIdResponse> {
    return apiClient.post<FindUserIdResponse>(
      AUTH.ACCOUNT_RECOVERY_FIND_USER_ID,
      body,
    );
  }

  /**
   * 비밀번호 재설정 — recoveryToken 또는 crtfcDnValue + userSe + newPassword.
   */
  static async requestPasswordReset(
    body: PasswordResetRequestBody,
  ): Promise<PasswordResetRequestResponse> {
    return apiClient.post<PasswordResetRequestResponse>(
      AUTH.PASSWORD_RESET_REQUEST,
      body,
    );
  }

  /**
   * 로그아웃
   */
  static async logout(): Promise<void> {
    try {
      // 서버에 로그아웃 요청 (백엔드는 GET 메서드 사용)
      await apiClient.get(AUTH.LOGOUT);
    } catch (error) {
      // 로그아웃 API 실패해도 로컬 정보는 삭제
      // 405 에러는 무시 (백엔드 호환성 문제)
      if (error instanceof ApiError && error.status !== 405) {
        console.error("Logout API failed:", error);
      }
    } finally {
      // 로컬 저장소에서 인증 정보 제거
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("userSe");

      // 세션 정보 제거
      SessionManager.clearSession();

      // 활성 세션 정보 제거
      DuplicateLoginManager.clearActiveSession();

      // 중복 로그인 체크 중지
      DuplicateLoginManager.stopDuplicateLoginCheck();
    }
  }

  /**
   * 토큰 갱신
   */
  static async refreshToken(): Promise<LoginResponse> {
    const refreshToken = sessionStorage.getItem("refreshToken");

    if (!refreshToken) {
      throw new ApiError(401, "리프레시 토큰이 없습니다.");
    }

    try {
      const response = await apiClient.post<LoginResponse>(AUTH.REFRESH, {
        refreshToken,
      });

      // 새 토큰 저장
      if (response.accessToken) {
        sessionStorage.setItem("accessToken", response.accessToken);

        if (response.refreshToken) {
          sessionStorage.setItem("refreshToken", response.refreshToken);
        }
      }

      return response;
    } catch (error) {
      // 토큰 갱신 실패 시 로그아웃 처리
      await this.logout();
      throw error;
    }
  }

  static async confirmOAuthLink(
    linkToken: string,
  ): Promise<OAuthLinkConfirmResponse> {
    if (!linkToken || linkToken.trim() === "") {
      throw new ApiError(400, "linkToken이 필요합니다.");
    }
    const response = await apiClient.post<OAuthLinkConfirmResponse>(
      AUTH.OAUTH_LINK_CONFIRM,
      {
        linkToken,
      },
    );
    return response;
  }

  /**
   * OAuth 연동 해지 (MY PAGE)
   */
  static async unlinkOAuthLink(oauthService: "naver" | "kakao"): Promise<void> {
    await apiClient.post<void>(AUTH.OAUTH_LINK_UNLINK, {
      oauthService,
    });
  }

  /**
   * 인증 확인 (SSR 시 sessionStorage 없음 → false)
   */
  static isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");
    const accessToken = sessionStorage.getItem("accessToken");
    return isLoggedIn === "true" && !!accessToken;
  }

  /**
   * 현재 사용자 정보 가져오기 (SSR 시 sessionStorage 없음 → null)
   */
  static getCurrentUser() {
    if (typeof window === "undefined") return null;
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * 현재 사용자의 esntlId (고유ID) 반환. ARMUSER 상세 조회 등에 사용.
   * SSR 시 sessionStorage 없음 → null.
   */
  static getEsntlId(): string | null {
    const user = this.getCurrentUser();
    if (!user) return null;
    return (user.esntlId ?? user.uniqId ?? null) || null;
  }

  /**
   * 사용자 구분 (SNR: 학생, PNR: 학부모, ANR: 학원, MNR: 멘토). userWeb 테마/배지용.
   * SSR 시 sessionStorage 없음 → null.
   */
  static getUserSe(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("userSe");
  }

  /**
   * 현재 사용자의 역할 가져오기
   */
  static getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  /**
   * 특정 역할을 가지고 있는지 확인
   */
  static hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  /**
   * OAuth 로그인 URL 조회
   * @param oauthService - naver | kakao
   * @param state - 로그인 유형 (student | parent | academy | mentor), 콜백 시 해당 유형 페이지/회원가입으로 이동
   */
  static async getOAuthUrl(
    oauthService: "naver" | "kakao",
    state?: "student" | "parent" | "academy" | "mentor" | null,
    options?: { mode?: "mypage_link" },
  ): Promise<string> {
    try {
      const params = new URLSearchParams();
      if (state) params.set("state", state);
      if (options?.mode === "mypage_link") params.set("mode", "mypage_link");
      const query = params.toString();
      const url = `${AUTH.OAUTH_URL}/${oauthService}/url${query ? `?${query}` : ""}`;
      const response = await apiClient.get<{
        resultCode: string;
        resultMessage: string;
        oauthUrl: string;
      }>(url);

      if (response.resultCode === "200" && response.oauthUrl) {
        return response.oauthUrl;
      }
      if (response.resultCode === "401") {
        throw new ApiError(
          401,
          response.resultMessage || "로그인이 필요합니다.",
        );
      }
      if (response.resultCode === "403") {
        throw new ApiError(
          403,
          response.resultMessage || "요청을 수행할 수 없습니다.",
        );
      }
      throw new ApiError(
        400,
        response.resultMessage || "OAuth URL을 가져오는데 실패했습니다.",
      );
    } catch (error) {
      console.error("OAuth URL 조회 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "OAuth URL을 가져오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * OAuth 콜백 처리
   */
  static async handleOAuthCallback(
    oauthService: "naver" | "kakao",
    code: string,
  ): Promise<{
    serviceName: string;
    userId: string;
    userName: string;
    email: string;
    phoneNumber: string;
    profileImage: string;
    nickName: string;
    certCi: string;
  }> {
    try {
      // URL에 code 파라미터 추가
      const endpoint = `${AUTH.OAUTH_CALLBACK}/${oauthService}/callback?code=${encodeURIComponent(code)}`;

      const response = await apiClient.get<{
        resultCode: string;
        resultMessage: string;
        serviceName: string;
        userId: string;
        userName: string;
        email: string;
        phoneNumber: string;
        profileImage: string;
        nickName: string;
        certCi: string;
      }>(endpoint);

      if (response.resultCode === "200") {
        return {
          serviceName: response.serviceName,
          userId: response.userId,
          userName: response.userName,
          email: response.email,
          phoneNumber: response.phoneNumber,
          profileImage: response.profileImage,
          nickName: response.nickName,
          certCi: response.certCi,
        };
      } else {
        throw new ApiError(
          400,
          response.resultMessage || "OAuth 콜백 처리에 실패했습니다.",
        );
      }
    } catch (error) {
      console.error("OAuth 콜백 처리 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "OAuth 콜백 처리 중 오류가 발생했습니다.");
    }
  }
}
