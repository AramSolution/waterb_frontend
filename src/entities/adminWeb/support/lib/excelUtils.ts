import { decodeDisplayText } from "@/shared/lib";
import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import type { Support } from "../api/supportTypes";
import { isFeePayerListRowPaid } from "../api/feePayerManageApi";
import {
  type DrainageEquipListRow,
  isDrainageEquipListRowPaid,
} from "../api/drainageEquipManageApi";

/**
 * 오수 원인자부담금 관리 목록 엑셀 (목록 화면과 동일한 표시 컬럼; 내부 식별자 제외)
 */
export async function downloadFeePayerListExcel(
  supports: Support[],
  fileName: string = "오수원인자부담금목록",
): Promise<void> {
  const headers = [
    "순번",
    "상태",
    "성명",
    "주소",
    "통지일",
    "부과액(원)",
    "납부일",
    "납부액(원)",
  ];
  const fmtNum = (v: unknown): string | number => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(String(v).replace(/,/g, ""));
    if (Number.isNaN(n)) return String(v);
    return n;
  };
  const dataRows = supports.map((row, index) => {
    const rowAny = row as Record<string, unknown>;
    const paid = isFeePayerListRowPaid(row);
    const levy = rowAny.levyAmt ?? rowAny.waterCost;
    const payAmt = rowAny.payAmt ?? rowAny.waterPay ?? rowAny.pay;
    return [
      index + 1,
      paid ? "납부" : "미납",
      row.applicantNm ?? "",
      String(rowAny.addr ?? ""),
      String(rowAny.notifyDd ?? rowAny.reqDate ?? row.recruitStartDate ?? ""),
      fmtNum(levy),
      String(rowAny.payDd ?? "").trim(),
      fmtNum(payAmt),
    ];
  });
  await downloadAdminListExcelFile("오수 원인자부담금 관리", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 10, 12, 32, 12, 14, 12, 14],
  });
}

/**
 * 배수설비 관리 목록 엑셀 (목록 화면과 동일한 표시 컬럼)
 */
export async function downloadDrainageEquipListExcel(
  rows: DrainageEquipListRow[],
  fileName: string = "배수설비관리목록",
): Promise<void> {
  const headers = [
    "번호",
    "상태",
    "성명",
    "주소",
    "등록일",
    "부과액(원)",
    "납부일",
    "납부액(원)",
  ];
  const fmtNum = (v: unknown): string | number => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(String(v).replace(/,/g, ""));
    if (Number.isNaN(n)) return String(v);
    return n;
  };
  const dataRows = rows.map((row, index) => {
    const paid = isDrainageEquipListRowPaid(row);
    return [
      index + 1,
      paid ? "납부" : "미납",
      decodeDisplayText(String(row.userNm ?? "")),
      decodeDisplayText(String(row.addr ?? "")),
      row.reqDate ?? "",
      fmtNum(row.equipCost),
      row.payDay ?? "",
      fmtNum(row.payAmt),
    ];
  });
  await downloadAdminListExcelFile("배수설비 관리", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 10, 12, 32, 12, 14, 12, 14],
  });
}
