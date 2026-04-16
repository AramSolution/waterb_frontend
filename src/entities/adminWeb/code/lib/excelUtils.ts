import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { CmmCode, CmmDetailCode } from "../api";

/**
 * 대분류코드 목록을 엑셀 파일로 다운로드
 */
export async function downloadCmmCodesExcel(
  codes: CmmCode[],
  fileName: string = "대분류코드목록",
): Promise<void> {
  const headers = [
    "번호",
    "코드ID",
    "코드명",
    "코드설명",
    "분류코드명",
    "사용여부",
  ];
  const dataRows = codes.map((code, index) => [
    index + 1,
    code.codeId || "",
    code.codeIdNm || "",
    code.codeIdDc || "",
    code.clCodeNm || "",
    code.useAt === "Y" ? "사용" : "미사용",
  ]);

  await downloadAdminListExcelFile("대분류코드 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 15, 20, 30, 15, 12],
  });
}

/**
 * 소분류코드 목록을 엑셀 파일로 다운로드
 */
export async function downloadCmmDetailCodesExcel(
  codes: CmmDetailCode[],
  fileName: string = "소분류코드목록",
): Promise<void> {
  const headers = [
    "번호",
    "코드ID",
    "상세코드",
    "상세코드명",
    "상세코드설명",
    "순서",
    "사용여부",
  ];
  const dataRows = codes.map((code, index) => [
    index + 1,
    code.codeId || "",
    code.code || "",
    code.codeNm || "",
    code.codeDc || "",
    code.orderBy || "",
    code.useAt === "Y" ? "사용" : "미사용",
  ]);

  await downloadAdminListExcelFile("소분류코드 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 15, 15, 20, 30, 10, 12],
  });
}
