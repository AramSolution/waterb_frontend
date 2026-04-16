import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { AdminMember } from "../api";

/**
 * 관리자 회원 목록을 엑셀 파일로 다운로드
 */
export async function downloadAdminMembersExcel(
  members: AdminMember[],
  fileName: string = "관리자회원",
): Promise<void> {
  const headers = [
    "번호",
    "아이디",
    "이름",
    "이메일",
    "연락처",
    "상태",
    "가입일",
    "탈퇴일",
    "잠금여부",
  ];
  const dataRows = members.map((member, index) => [
    index + 1,
    member.userId || "",
    member.userNm || "",
    member.emailAdres || "",
    member.mbtlnum || member.usrTelNo || "",
    member.mberSttusNm || "",
    member.sbscrbDe || "",
    member.secsnDe || "",
    member.lockAt || "",
  ]);

  await downloadAdminListExcelFile("관리자회원 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 15, 12, 30, 18, 12, 12, 12, 12],
  });
}
