import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { Program } from "../api";

/**
 * 프로그램 목록을 엑셀 파일로 다운로드
 */
export async function downloadProgramsExcel(
  programs: Program[],
  fileName: string = "프로그램목록",
): Promise<void> {
  const headers = [
    "번호",
    "프로그램명",
    "저장경로",
    "한글명",
    "프로그램설명",
    "URL",
  ];
  const dataRows = programs.map((program, index) => [
    index + 1,
    program.progrmFileNm || "",
    program.progrmStrePath || "",
    program.progrmKoreanNm || "",
    program.progrmDc || "",
    program.url || "",
  ]);

  await downloadAdminListExcelFile("프로그램 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 20, 30, 20, 30, 30],
  });
}
