import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { Franchise } from "../api";

/**
 * 가맹학원(희망사업 신청) 목록 엑셀 다운로드
 */
export async function downloadFranchiseExcel(
  items: Franchise[],
  fileName: string = "가맹목록",
): Promise<void> {
  const headers = [
    "번호",
    "상태",
    "학원명",
    "대표자",
    "연락처",
    "주소",
    "희망사업",
    "취급과목",
  ];
  const dataRows = items.map((item, index) => [
    item.rnum ?? index + 1,
    item.status || "",
    item.academyName || "",
    item.representative || "",
    item.contact || "",
    item.address || "",
    item.desiredBusiness || "",
    item.subject || "",
  ]);

  await downloadAdminListExcelFile("가맹목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 10, 20, 12, 15, 30, 20, 25],
  });
}
