import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import type { ArmchilChildDTO } from "../api";

/**
 * 자녀 연동 목록을 엑셀 파일로 다운로드
 * @param items 자녀 목록 배열
 * @param fileName 파일명 (확장자 제외)
 */
export async function downloadArmchilChildrenExcel(
  items: ArmchilChildDTO[],
  fileName: string = "자녀연동목록",
): Promise<void> {
  const headers = ["번호", "학생명", "연락처", "성별", "생년월일"];
  const dataRows = items.map((item, index) => [
    item.rnum ?? index + 1,
    item.userNm ?? "",
    item.mbtlnum ?? "",
    item.sexdstnCodeNm ?? "",
    item.brthdy ?? "",
  ]);

  await downloadAdminListExcelFile("자녀 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 14, 16, 8, 12],
  });
}
