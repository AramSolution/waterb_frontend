import { AuthGroup, AdminMemberDetail } from "@/entities/adminWeb/member/api";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";

/**
 * 다양한 응답 구조에서 AuthGroup 배열을 추출하는 유틸 함수
 * @param authResponse API 응답 객체
 * @returns AuthGroup 배열
 */
export function parseAuthGroups(authResponse: any): AuthGroup[] {
  let authGroups: AuthGroup[] = [];

  if (Array.isArray(authResponse)) {
    authGroups = authResponse;
  } else if (authResponse && typeof authResponse === "object") {
    const responseAny = authResponse as any;
    const authListData =
      responseAny.authList ||
      responseAny.data?.authList ||
      responseAny.data ||
      responseAny.Array ||
      responseAny.list ||
      responseAny.content ||
      [];

    if (Array.isArray(authListData)) {
      authGroups = authListData;
    } else if (authListData && typeof authListData === "object") {
      const values = Object.values(authListData);
      const arrayValue = values.find((v) => Array.isArray(v));
      if (arrayValue) {
        authGroups = arrayValue as AuthGroup[];
      }
    }
  }

  return authGroups;
}

/**
 * 다양한 응답 구조에서 AdminMemberDetail을 추출하는 유틸 함수
 * @param detailResponse API 응답 객체
 * @returns AdminMemberDetail 또는 null
 */
export function parseAdminMemberDetail(
  detailResponse: any
): AdminMemberDetail | null {
  let adminInfo: AdminMemberDetail | null = null;

  if (detailResponse) {
    // 응답 구조에 따라 adminInfo 추출 (여러 가능성 체크)
    if (detailResponse.adminInfo && detailResponse.adminInfo !== null) {
      adminInfo = detailResponse.adminInfo;
    } else if (detailResponse.data?.adminInfo) {
      adminInfo = detailResponse.data.adminInfo;
    } else if (
      detailResponse.data &&
      typeof detailResponse.data === "object" &&
      !Array.isArray(detailResponse.data)
    ) {
      // data가 직접 adminInfo인 경우 (객체이고 배열이 아닌 경우)
      const dataKeys = Object.keys(detailResponse.data);
      if (dataKeys.length > 0 && detailResponse.data.userId) {
        adminInfo = detailResponse.data as AdminMemberDetail;
      }
    } else if (
      typeof detailResponse === "object" &&
      !Array.isArray(detailResponse)
    ) {
      // 응답 자체가 adminInfo인 경우 (adminInfo 필드가 없고 직접 객체인 경우)
      const responseKeys = Object.keys(detailResponse);
      if (responseKeys.length > 0 && (detailResponse as any).userId) {
        adminInfo = detailResponse as any;
      }
    }
  }

  return adminInfo;
}

/**
 * AdminMemberDetail을 MemberDetailFormData로 변환하는 유틸 함수
 * @param adminInfo AdminMemberDetail 객체
 * @returns MemberDetailFormData 객체
 */
export function convertToFormData(adminInfo: AdminMemberDetail) {
  // groupId는 adminInfo.groupId가 있으면 그대로 사용, 없으면 빈 문자열
  // 기본값을 사용하면 안 됨 (DB에 실제 값이 있을 수 있음)
  const finalGroupId =
    adminInfo.groupId && adminInfo.groupId.trim() !== ""
      ? adminInfo.groupId
      : "";

  return {
    userId: adminInfo.userId || "",
    password: "",
    passwordConfirm: "",
    userNm: adminInfo.userNm || "",
    usrTelno: formatPhoneWithHyphen(adminInfo.usrTelno || ""),
    mbtlnum: formatPhoneWithHyphen(adminInfo.mbtlnum || ""),
    emailAdres: adminInfo.emailAdres || "",
    mberSttus: adminInfo.mberSttus || "P",
    sbscrbDe: adminInfo.sbscrbDe || "",
    secsnDe: adminInfo.secsnDe || "",
    lockAt: adminInfo.lockAt || "N",
    lockLastPnttm: adminInfo.lockLastPnttm || "",
    groupId: finalGroupId,
  };
}
