/**
 * Bizsiren 본인인증 관련 타입 정의
 */

// 본인인증 결과
export interface CertificationResult {
  name: string;           // 이름
  birthDate: string;      // 생년월일 (YYYYMMDD)
  gender: 'M' | 'F';      // 성별 (M: 남성, F: 여성)
  phoneNumber: string;    // 휴대폰번호 (하이픈 포함)
  carrier: string;        // 통신사 (SKT, KT, LGU+, MVNO 등)
  ci: string;             // CI (연결정보) - 개인 고유 식별값
  di: string;             // DI (중복가입확인정보) - 서비스별 고유값
}

// 본인인증 에러
export interface CertificationError {
  type: 'CERT_ERROR';
  message: string;
}

// 본인인증 성공 메시지
export interface CertificationSuccess {
  type: 'CERT_SUCCESS';
  result: CertificationResult;
}

// 본인인증 메시지 타입
export type CertificationMessage = CertificationSuccess | CertificationError;

// Bizsiren API 응답 - 토큰
export interface BizsirenTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

// Bizsiren API 응답 - 사용자 정보
export interface BizsirenUserInfo {
  name: string;
  birthdate: string;
  gender: string;
  phone: string;
  carrier: string;
  ci: string;
  di: string;
}
