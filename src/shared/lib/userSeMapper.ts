/**
 * 사용자 타입을 백엔드 userSe 코드로 매핑하는 유틸리티
 */

export type UserType = "학생" | "학부모" | "학원" | "멘토";

/**
 * 사용자 타입을 백엔드 userSe 코드로 변환
 * @param userType 사용자 타입
 * @returns 백엔드 userSe 코드
 */
export function getUserSeFromUserType(userType: UserType): string {
  const mapping: Record<UserType, string> = {
    "학생": "SNR",
    "학부모": "PNR",
    "학원": "ANR",
    "멘토": "MNR",
  };
  return mapping[userType];
}

/**
 * 사용자 타입에 따른 리다이렉트 경로 반환
 * @param userType 사용자 타입
 * @returns 리다이렉트 경로
 */
export function getRedirectPathFromUserType(userType: UserType): string {
  const mapping: Record<UserType, string> = {
    "학생": "/userWeb/student",
    "학부모": "/userWeb/parent",
    "학원": "/userWeb/academy",
    "멘토": "/userWeb/mentor",
  };
  return mapping[userType];
}
