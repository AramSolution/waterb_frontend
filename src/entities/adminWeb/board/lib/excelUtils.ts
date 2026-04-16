import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { Board } from "../api";

/**
 * 게시판 목록을 엑셀 파일로 다운로드
 */
export async function downloadBoardsExcel(
  boards: Board[],
  fileName: string = "게시판목록",
): Promise<void> {
  const headers = ["번호", "게시판명", "게시판설명", "게시판유형"];
  const dataRows = boards.map((board, index) => [
    index + 1,
    board.bbsNm || "",
    board.bbsDe || "",
    board.bbsSeNm || "",
  ]);

  await downloadAdminListExcelFile("게시판 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 20, 30, 15],
  });
}
