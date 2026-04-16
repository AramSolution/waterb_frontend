import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import type { ArmuserDTO } from "../api";

/**
 * ARMUSER(통합회원) 목록을 엑셀 파일로 다운로드
 */
export async function downloadArmuserExcel(
  list: ArmuserDTO[],
  fileName: string = "회원목록",
  nameColumnLabel: string = "이름",
): Promise<void> {
  const headers = [
    "번호",
    "상태",
    "아이디",
    nameColumnLabel,
    "연락처",
    "주소",
    "가입일",
    "탈퇴일",
    "잠금여부",
  ];
  const dataRows = list.map((item, index) => [
    index + 1,
    item.mberSttusNm ?? "",
    item.userId ?? "",
    item.userNm ?? "",
    item.mbtlnum || item.usrTelno || "",
    [item.adres, item.detailAdres].filter(Boolean).join(" ").trim() || "",
    item.sbscrbDe ?? "",
    item.secsnDe ?? "",
    item.lockAt ?? "",
  ]);

  await downloadAdminListExcelFile("목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 10, 15, 12, 18, 30, 12, 12, 10],
  });
}
