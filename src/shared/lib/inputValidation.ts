/**
 * 입력값 검증 유틸리티
 */

/**
 * 한글 제거 (영문, 숫자, 특수문자만 허용)
 * @param value 입력값
 * @returns 한글이 제거된 문자열
 */
export const removeKorean = (value: string): string => {
  return value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
};

/**
 * 영문과 숫자만 허용
 * @param value 입력값
 * @returns 영문과 숫자만 포함된 문자열
 */
export const alphanumericOnly = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9]/g, '');
};

/**
 * 숫자만 허용
 * @param value 입력값
 * @returns 숫자만 포함된 문자열
 */
export const numericOnly = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

/**
 * 영문만 허용
 * @param value 입력값
 * @returns 영문만 포함된 문자열
 */
export const alphabetOnly = (value: string): string => {
  return value.replace(/[^a-zA-Z]/g, '');
};

/**
 * 이메일 형식 검증
 * @param email 이메일 주소
 * @returns 유효한 이메일 형식 여부
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 전화번호 형식 검증 (한국)
 * @param phone 전화번호
 * @returns 유효한 전화번호 형식 여부
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^01[016789]-?\d{3,4}-?\d{4}$/;
  return phoneRegex.test(phone);
};

/**
 * 전화번호 하이픈 포맷 (한국: 휴대폰/유선 모두 대응)
 * - 입력값에서 숫자만 남긴 뒤, 길이/국번(02) 기준으로 하이픈을 삽입합니다.
 * - 표시용 포맷이며, 저장/전송용 값은 numericOnly로 별도 처리하세요.
 */
export const formatPhoneWithHyphen = (value: string): string => {
  const digits = numericOnly(value);
  if (!digits) return "";

  // 서울(02)
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  // 그 외 지역번호/휴대폰 (0xx...)
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
};

/**
 * 사업자등록번호 하이픈 포맷 (한국: 10자리 → 000-00-00000)
 * - 입력값에서 숫자만 남긴 뒤 3-2-5 자리로 하이픈 삽입.
 * - 표시용 포맷이며, 저장/전송 시에는 replace(/\D/g, '')로 숫자만 보내세요.
 */
export const formatBizRegNo = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

/**
 * 비밀번호 강도 검증
 * @param password 비밀번호
 * @returns 최소 8자, 영문, 숫자, 특수문자 포함 여부
 */
export const isStrongPassword = (password: string): boolean => {
  const minLength = password.length >= 8;
  const hasAlphabet = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return minLength && hasAlphabet && hasNumber && hasSpecial;
};
