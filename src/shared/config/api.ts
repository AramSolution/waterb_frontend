/**
 * Servlet context-path(`/water`)·`next.config.js` rewrites·`nginx` location과 경로를 맞출 것.
 *
 * NEXT_PUBLIC_API_BASE_URL: origin만(권장) 또는 이미 /water 포함 — 중복 슬래시 방지
 */
function resolveWaterApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (!raw) return "";
  if (raw.endsWith("/water")) return raw;
  return `${raw}/water`;
}

const resolvedBaseUrl = resolveWaterApiBaseUrl();

// API 기본 설정 (공통 - 관리자/사용자 웹 공용)
export const API_CONFIG = {
  BASE_URL: resolvedBaseUrl,
  TIMEOUT: 10000,
};

/**
 * Bizsiren 본인인증 API URL.
 * `NEXT_PUBLIC_API_BASE_URL`이 있으면 다른 user API와 동일하게 절대 URL(`…/water/api/cert/siren/...`).
 * 없을 때만 상대 `/water/...`(Next rewrite 프록시).
 */
export const WATER_CERT_SIREN = {
  TOKEN_AUTH: resolvedBaseUrl
    ? `${resolvedBaseUrl}/api/cert/siren/tokenAuth`
    : "/water/api/cert/siren/tokenAuth",
  CREATE_TOKEN: resolvedBaseUrl
    ? `${resolvedBaseUrl}/api/cert/siren/createToken`
    : "/water/api/cert/siren/createToken",
  RESULT_DATA: resolvedBaseUrl
    ? `${resolvedBaseUrl}/api/cert/siren/resultData`
    : "/water/api/cert/siren/resultData",
} as const;

// 디버깅: 환경 변수 확인
if (typeof window !== "undefined") {
  console.log(" API 설정 확인:");
  console.log(
    "  NEXT_PUBLIC_API_BASE_URL:",
    process.env.NEXT_PUBLIC_API_BASE_URL,
  );
  console.log("  사용 중인 BASE_URL:", API_CONFIG.BASE_URL);
}

// 공통 API 엔드포인트 (인증, 소분류코드, 파일 - 관리자/사용자 웹 모두 사용)
export const AUTH = {
  LOGIN: "/auth/login-jwt",
  FIND_USER_ID: "/auth/find-user-id",
  /** 본인인증 완료 후 recoveryToken으로 마스킹 아이디 조회 */
  ACCOUNT_RECOVERY_FIND_USER_ID: "/auth/account-recovery/find-user-id",
  /** 비밀번호 재설정 안내 요청(백엔드 구현 시 경로 맞출 것) */
  PASSWORD_RESET_REQUEST: "/auth/password-reset/request",
  LOGOUT: "/auth/logout",
  REFRESH: "/auth/refresh",
  OAUTH_URL: "/auth/oauth", // OAuth 로그인 URL 조회
  OAUTH_CALLBACK: "/auth/oauth", // OAuth 콜백 처리
  OAUTH_LINK_CONFIRM: "/api/userWeb/oauth-link/confirm",
  OAUTH_LINK_UNLINK: "/api/userWeb/oauth-link/unlink",
};

/** GET /api/cont/code/{codeId}/details - 소분류 코드 목록 조회 (사업대상, 은행코드 등) */
export const CODE = {
  DETAIL_LIST_BASE: "/api/cont/code",
};

/** 공통 - 파일 조회(다운로드/보기) */
export const FILES = {
  VIEW: "/api/v1/files/view",
  /** Content-Disposition: attachment (한글 파일명 RFC 5987) */
  DOWNLOAD: "/api/v1/files/download",
};
