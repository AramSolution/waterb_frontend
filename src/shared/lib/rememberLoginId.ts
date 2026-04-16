/**
 * 로그인 모달「아이디 저장」: userSe(회원 구분)별로 로그인 아이디를 쿠키에 보관.
 * Max-Age 7일이며, 저장된 상태로 로그인 성공 시마다 다시 설정하여 기한이 연장됨.
 */

const REMEMBER_DAYS = 7;
const SECONDS_PER_DAY = 86400;
export const REMEMBER_LOGIN_MAX_AGE_SEC = REMEMBER_DAYS * SECONDS_PER_DAY;

function cookieBaseName(userSe: string): string {
  return `edream_remember_login_id_${userSe}`;
}

function buildCookie(
  name: string,
  value: string,
  maxAgeSec: number,
): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  let c = `${name}=${value}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
  if (secure) c += "; Secure";
  return c;
}

/** 로그인 성공 후 호출: 7일 유효, 이후 같은 옵션으로 로그인할 때마다 연장 */
export function saveRememberLoginId(userSe: string, userId: string): void {
  if (typeof document === "undefined") return;
  const id = (userId || "").trim();
  if (!id) return;
  const name = cookieBaseName(userSe);
  const value = encodeURIComponent(id);
  document.cookie = buildCookie(name, value, REMEMBER_LOGIN_MAX_AGE_SEC);
}

export function clearRememberLoginId(userSe: string): void {
  if (typeof document === "undefined") return;
  const name = cookieBaseName(userSe);
  document.cookie = buildCookie(name, "", 0);
}

export function readRememberLoginId(userSe: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${cookieBaseName(userSe)}=`;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      const raw = p.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}
