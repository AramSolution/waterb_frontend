import { AuthService } from "@/entities/auth/api";

/**
 * 진로상담 접수현황 달력 `type` 쿼리 값.
 * URL에 명시된 type이 최우선, 그다음 로그인 구분(SNR/PNR), 비로그인 시 reqGbPosition(1=학생, 2=학부모).
 */
export function getCareerConsultCalendarType(searchParams: {
  get: (key: string) => string | null;
}): string {
  const explicit = searchParams.get("type");
  if (explicit) return explicit;
  const userSe = AuthService.getUserSe();
  if (userSe === "SNR") return "student";
  if (userSe === "PNR") return "parent";
  const reqGb = searchParams.get("reqGbPosition");
  if (reqGb === "1") return "student";
  if (reqGb === "2") return "parent";
  return "parent";
}
