import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { Academy } from "../api";

/**
 * 학원 목록을 엑셀 파일로 다운로드
 */
export async function downloadAcademiesExcel(
  academies: Academy[],
  fileName: string = "학원관리",
): Promise<void> {
  const headers = [
    "번호",
    "상태",
    "학원ID",
    "학원명",
    "주소",
    "취급과목",
  ];
  const dataRows = academies.map((academy, index) => [
    academy.rnum || index + 1,
    academy.statusNm || academy.status || "",
    academy.academyId || "",
    academy.academyName || "",
    academy.address || "",
    academy.subject || "",
  ]);

  await downloadAdminListExcelFile("학원 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 12, 15, 25, 35, 25],
  });
}
