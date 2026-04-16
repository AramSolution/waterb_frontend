import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { Article } from "../api";

/**
 * 게시글 목록을 엑셀 파일로 다운로드
 */
export async function downloadArticlesExcel(
  articles: Article[],
  fileName: string = "게시글목록",
): Promise<void> {
  const headers = [
    "번호",
    "제목",
    "게시자명",
    "게시일시",
    "조회수",
    "상태",
  ];
  const dataRows = articles.map((article, index) => [
    index + 1,
    article.nttSj || "",
    article.ntcrNm || "",
    article.ntcrDt || "",
    article.rdcnt || "0",
    article.sttusCodeNm || "",
  ]);

  await downloadAdminListExcelFile("게시글 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 40, 15, 18, 10, 12],
  });
}
