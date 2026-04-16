import ExcelJS from "exceljs";

export const adminExcelThinBlackBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
};

export async function writeWorkbookToXlsxDownload(
  workbook: ExcelJS.Workbook,
  fileNameWithoutExt: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileNameWithoutExt}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type AdminListSheetOptions = {
  title: string;
  headers: string[];
  dataRows: (string | number | null | undefined)[][];
  columnWidths: number[];
  /** 데이터 행에서 가로·세로 가운데 정렬할 열 인덱스(0부터) */
  centerDataColumnIndices?: number[];
};

/** 관리자 목록 엑셀: 1행 병합 타이틀, 2행 헤더 밴드, 데이터 테두리 */
export function addAdminStyledListSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  options: AdminListSheetOptions,
): ExcelJS.Worksheet {
  const safeName = sheetName.slice(0, 31) || "Sheet1";
  const ws = workbook.addWorksheet(safeName);
  const colCount = options.headers.length;
  if (colCount === 0) {
    return ws;
  }

  ws.mergeCells(1, 1, 1, colCount);
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = options.title;
  for (let c = 1; c <= colCount; c++) {
    const cell = titleRow.getCell(c);
    cell.font = { bold: true, size: 11, color: { argb: "FF000000" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    cell.border = adminExcelThinBlackBorder;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }

  const headerRow = ws.getRow(2);
  options.headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF365F91" },
    };
    cell.border = adminExcelThinBlackBorder;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const centerSet = new Set(options.centerDataColumnIndices ?? []);
  options.dataRows.forEach((row, ri) => {
    const excelRow = ws.getRow(3 + ri);
    for (let ci = 0; ci < colCount; ci++) {
      const cell = excelRow.getCell(ci + 1);
      const v = row[ci];
      cell.value = v == null || v === "" ? "" : v;
      cell.border = adminExcelThinBlackBorder;
      if (centerSet.has(ci)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    }
  });

  options.columnWidths.forEach((w, i) => {
    if (i < colCount && w > 0) {
      ws.getColumn(i + 1).width = w;
    }
  });

  return ws;
}

export async function downloadAdminListExcelFile(
  sheetName: string,
  fileNameWithoutExt: string,
  options: AdminListSheetOptions,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  addAdminStyledListSheet(wb, sheetName, options);
  await writeWorkbookToXlsxDownload(wb, fileNameWithoutExt);
}

function cellValueToPlain(value: ExcelJS.CellValue): unknown {
  if (value == null || value === "") return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object" && value !== null) {
    const f = value as ExcelJS.CellFormulaValue;
    if ("result" in f && f.result != null) {
      return f.result;
    }
    const rt = value as ExcelJS.CellRichTextValue;
    if ("richText" in rt && Array.isArray(rt.richText)) {
      return rt.richText.map((t) => t.text).join("");
    }
    const hl = value as ExcelJS.CellHyperlinkValue;
    if ("hyperlink" in hl) {
      return String(hl.text ?? "");
    }
  }
  return "";
}

/** 첫 시트를 2차원 배열로 (빈 셀은 빈 문자열, 헤더:1 스타일 파싱용) */
export function worksheetToMatrix(sheet: ExcelJS.Worksheet): unknown[][] {
  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    let maxCol = 0;
    row.eachCell({ includeEmpty: true }, (_cell, colNumber) => {
      if (colNumber > maxCol) maxCol = colNumber;
    });
    const r: unknown[] = [];
    for (let c = 1; c <= maxCol; c++) {
      r.push(cellValueToPlain(row.getCell(c).value));
    }
    matrix.push(r);
  });
  return matrix;
}

export async function loadXlsxFirstSheetMatrix(
  buffer: ArrayBuffer,
): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) {
    return [];
  }
  return worksheetToMatrix(sheet);
}
