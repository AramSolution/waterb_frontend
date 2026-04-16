/**
 * 담당부서(PRO_DEPA) 공통코드 소분류 그룹 ID.
 * 홍보·샘플업무·스터디 등록/수정에서 동일하게 사용.
 */
export const SUPPORT_CHARGE_DEPT_CODE_ID =
  process.env.NEXT_PUBLIC_SUPPORT_CHARGE_DEPT_CODE_ID ??
  process.env.NEXT_PUBLIC_PROMOTION_CHARGE_DEPT_CODE_ID ??
  "EDR007";
