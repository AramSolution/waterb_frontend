import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";
import { Support, SupportDetailItem } from "../api";
import { getRunStaLabel } from "./runStaAdmin";

export type DownloadSupportsExcelOptions = {
  /** 지원사업 홍보 등 상태 컬럼을 제외 */
  omitStatusColumn?: boolean;
};

/**
 * 지원사업 목록을 엑셀 파일로 다운로드
 */
export async function downloadSupportsExcel(
  supports: Support[],
  fileName: string = "지원사업목록",
  options?: DownloadSupportsExcelOptions,
): Promise<void> {
  const omitStatus = options?.omitStatusColumn === true;

  const headers = omitStatus
    ? ["번호", "사업ID", "사업명", "모집대상", "모집기간", "모집인원수"]
    : ["번호", "상태", "사업ID", "사업명", "모집대상", "모집기간", "모집인원수"];

  const dataRows = supports.map((support, index) => {
    const recruitPeriod =
      support.recruitStartDate && support.recruitEndDate
        ? `${support.recruitStartDate} ~ ${support.recruitEndDate}`
        : "";
    return omitStatus
      ? [
          index + 1,
          support.businessId || "",
          support.businessNm || "",
          support.recruitTarget || "",
          recruitPeriod,
          support.recruitYear || "",
        ]
      : [
          index + 1,
          getRunStaLabel(support.status || ""),
          support.businessId || "",
          support.businessNm || "",
          support.recruitTarget || "",
          recruitPeriod,
          support.recruitYear || "",
        ];
  });

  const columnWidths = omitStatus
    ? [8, 15, 25, 20, 25, 12]
    : [8, 12, 15, 25, 20, 25, 12];

  await downloadAdminListExcelFile("지원사업 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths,
  });
}

function getSupportDetailStatusLabel(status: string): string {
  switch (status) {
    case "01":
      return "임시저장";
    case "02":
      return "신청";
    case "03":
      return "승인";
    case "04":
      return "반려";
    case "05":
      return "중단";
    case "99":
      return "취소";
    case "RECEIVE":
      return "접수";
    case "APPROVE":
      return "승인";
    case "REJECT":
      return "거절";
    case "CANCEL":
      return "취소";
    case "COMPLETE":
      return "완료";
    default:
      return status;
  }
}

function getResultGbLabel(resultGb: string): string {
  const v = String(resultGb || "")
    .trim()
    .toUpperCase();
  if (v === "Y") return "선정";
  if (v === "R") return "예비";
  if (v === "N") return "미선정";
  return "";
}

/**
 * 신청목록 상세 리스트를 엑셀 파일로 다운로드
 */
export async function downloadSupportDetailListExcel(
  items: SupportDetailItem[],
  fileName: string = "신청목록상세",
  businessNm: string = "",
  includeSelectionStatus: boolean = false,
): Promise<void> {
  const headers = includeSelectionStatus
    ? [
        "번호",
        "상태",
        "선정여부",
        "보호자명",
        "보호자연락처",
        "학교명",
        "학년정보",
        "학생명",
        "학생연락처",
        "주소",
      ]
    : [
        "번호",
        "상태",
        "보호자명",
        "보호자연락처",
        "학교명",
        "학년정보",
        "학생명",
        "학생연락처",
        "주소",
      ];

  const dataRows = items.map((item, index) => {
    const resultGb =
      (item as { resultGb?: string }).resultGb ??
      (item as { RESULT_GB?: string }).RESULT_GB ??
      "";
    return includeSelectionStatus
      ? [
          index + 1,
          getSupportDetailStatusLabel(item.status || ""),
          getResultGbLabel(resultGb),
          item.parentNm || "",
          item.parentPhone || "",
          item.schoolNm || "",
          item.gradeInfo || "",
          item.studentNm || "",
          item.studentPhone || "",
          item.address || "",
        ]
      : [
          index + 1,
          getSupportDetailStatusLabel(item.status || ""),
          item.parentNm || "",
          item.parentPhone || "",
          item.schoolNm || "",
          item.gradeInfo || "",
          item.studentNm || "",
          item.studentPhone || "",
          item.address || "",
        ];
  });

  const columnWidths = includeSelectionStatus
    ? [8, 10, 10, 15, 15, 20, 12, 15, 15, 30]
    : [8, 10, 15, 15, 20, 12, 15, 15, 30];

  const titleText = businessNm ? `${businessNm} - ${fileName}` : fileName;

  await downloadAdminListExcelFile("신청목록 상세", fileName, {
    title: titleText,
    headers,
    dataRows,
    columnWidths,
  });
}

function getRegionalStatusLabel(status: string): string {
  switch (status) {
    case "01":
      return "임시저장";
    case "02":
      return "신청";
    case "03":
      return "승인";
    case "04":
      return "완료";
    case "11":
      return "반려";
    case "12":
      return "중단";
    case "99":
      return "취소";
    default:
      return status || "";
  }
}

/**
 * 지역연계 진로체험 활동 신청목록 엑셀 다운로드
 */
export async function downloadRegionalCareerActivityDetailListExcel(
  items: SupportDetailItem[],
  fileName: string = "지역연계 진로체험 활동 신청목록",
  businessNm: string = "",
): Promise<void> {
  const headers = [
    "번호",
    "상태",
    "학생명",
    "학교명",
    "학년정보",
    "연락처",
    "신청일시",
    "신청분야",
  ];

  const dataRows = items.map((item, index) => {
    const ext = item as Record<string, unknown>;
    const datePart = ext.workDate ?? ext.WORK_DATE ?? ext.reqDt;
    const timePart = ext.startTime ?? ext.START_TIME ?? "";
    const dateStr =
      datePart && String(datePart).trim() !== "" ? String(datePart).trim() : "";
    const timeStr =
      timePart && String(timePart).trim() !== "" ? String(timePart).trim() : "";
    let workDateStr =
      dateStr && timeStr ? `${dateStr} ${timeStr}` : dateStr || timeStr || "";
    if (workDateStr) {
      const parts = workDateStr.split(":");
      if (parts.length >= 3) {
        workDateStr = parts.slice(0, 2).join(":");
      }
    }
    const item1 = ext.item1 ?? ext.ITEM1 ?? ext.reqPart;

    return [
      item.rnum ?? index + 1,
      getRegionalStatusLabel(item.status || ""),
      item.studentNm || "",
      item.schoolNm || "",
      item.gradeInfo || "",
      item.studentPhone || "",
      workDateStr,
      item1 && String(item1).trim() !== "" ? String(item1) : "",
    ];
  });

  const titleText = businessNm ? `${businessNm} - ${fileName}` : fileName;

  await downloadAdminListExcelFile("신청목록(지역연계)", fileName, {
    title: titleText,
    headers,
    dataRows,
    columnWidths: [8, 10, 15, 20, 12, 15, 22, 22],
  });
}

/**
 * 글로벌 문화탐방 신청목록 엑셀 다운로드
 */
export async function downloadGlobalCultureTourDetailListExcel(
  items: SupportDetailItem[],
  fileName: string = "글로벌 문화탐방 신청목록",
  businessNm: string = "",
): Promise<void> {
  const headers = [
    "번호",
    "상태",
    "선정여부",
    "학생명",
    "학교명",
    "학년정보",
    "연락처",
    "국가",
    "일정",
  ];

  const dataRows = items.map((item, index) => {
    const ext = item as Record<string, unknown>;
    const country =
      ext.item1 ?? ext.ITEM1 ?? ext.reqPart ?? "";
    const schedule = ext.item4 ?? ext.ITEM4 ?? "";
    const resultGb = ext.resultGb ?? ext.RESULT_GB ?? "";

    return [
      item.rnum ?? index + 1,
      getRegionalStatusLabel(item.status || ""),
      getResultGbLabel(String(resultGb)),
      item.studentNm || "",
      item.schoolNm || "",
      item.gradeInfo || "",
      item.studentPhone || "",
      country && String(country).trim() !== "" ? String(country) : "",
      schedule && String(schedule).trim() !== "" ? String(schedule) : "",
    ];
  });

  const titleText = businessNm ? `${businessNm} - ${fileName}` : fileName;

  await downloadAdminListExcelFile("신청목록(글로벌문화탐방)", fileName, {
    title: titleText,
    headers,
    dataRows,
    columnWidths: [8, 10, 10, 15, 20, 12, 15, 22, 22],
  });
}

/**
 * 공부의 명수 신청목록 엑셀 다운로드
 */
export async function downloadGstudyDetailListExcel(
  items: SupportDetailItem[],
  fileName: string = "공부의 명수 신청목록",
  businessNm: string = "",
): Promise<void> {
  const headers = [
    "번호",
    "상태",
    "학생명",
    "학교명",
    "학년정보",
    "연락처",
    "구분",
    "신청과목",
    "참여횟수",
    "기존참여",
  ];

  const dataRows = items.map((item, index) => {
    const ext = item as Record<string, unknown>;
    const statusDisplay =
      (typeof ext.sttusCodeNm === "string" && ext.sttusCodeNm.trim() !== ""
        ? ext.sttusCodeNm
        : getRegionalStatusLabel(item.status || "")) || "";
    const gbn =
      ext.proGbn != null && String(ext.proGbn).trim() !== ""
        ? String(ext.proGbn)
        : String(
            (ext.item1 as string) ??
              (ext.ITEM1 as string) ??
              (ext.reqPart as string) ??
              "",
          );
    const reqSub =
      ext.reqSub != null && String(ext.reqSub).trim() !== ""
        ? String(ext.reqSub)
        : String((ext.reqPart as string) ?? "");
    const joinCnt =
      ext.joinCnt != null && String(ext.joinCnt).trim() !== ""
        ? String(ext.joinCnt)
        : "";
    const befJoin =
      ext.befJoin != null && String(ext.befJoin).trim() !== ""
        ? String(ext.befJoin)
        : "";

    return [
      item.rnum ?? index + 1,
      statusDisplay,
      item.studentNm || "",
      item.schoolNm || "",
      item.gradeInfo || "",
      item.studentPhone || "",
      gbn && String(gbn).trim() !== "" ? String(gbn) : "",
      reqSub && String(reqSub).trim() !== "" ? String(reqSub) : "",
      joinCnt && String(joinCnt).trim() !== "" ? String(joinCnt) : "",
      befJoin && String(befJoin).trim() !== "" ? String(befJoin) : "",
    ];
  });

  const titleText = businessNm ? `${businessNm} - ${fileName}` : fileName;

  await downloadAdminListExcelFile("신청목록(공부의명수)", fileName, {
    title: titleText,
    headers,
    dataRows,
    columnWidths: [8, 10, 15, 20, 12, 15, 18, 18, 12, 12],
  });
}

/** 멘토신청관리 사업별 신청목록 엑셀 1행 (상세 목록 테이블과 동일 컬럼) */
export interface MentorApplicationDetailExcelRow {
  rnum?: string;
  businessNm?: string;
  mentorNm?: string;
  phone?: string;
  applyMotivation?: string;
  careerInfo?: string;
}

/**
 * 멘토신청관리 신청목록(사업별) 엑셀 다운로드
 */
export async function downloadMentorApplicationDetailListExcel(
  items: MentorApplicationDetailExcelRow[],
  fileName: string = "멘토신청목록",
  businessNm: string = "",
): Promise<void> {
  const headers = [
    "순번",
    "사업명",
    "멘토명",
    "연락처",
    "신청동기",
    "경력정보",
  ];

  const dataRows = items.map((item, index) => [
    item.rnum ?? index + 1,
    item.businessNm ?? "",
    item.mentorNm ?? "",
    item.phone ?? "",
    item.applyMotivation ?? "",
    item.careerInfo ?? "",
  ]);

  const titleText = businessNm ? `${businessNm} - ${fileName}` : fileName;

  await downloadAdminListExcelFile("멘토신청목록", fileName, {
    title: titleText,
    headers,
    dataRows,
    columnWidths: [8, 28, 14, 18, 36, 36],
  });
}

/** 수강확인 리스트 한 행 (엑셀용) */
export interface StudyCertificateExcelRow {
  rnum?: string;
  content: string;
  date: string;
}

/**
 * 수강확인 리스트를 엑셀 파일로 다운로드
 */
export async function downloadStudyCertificateExcel(
  items: StudyCertificateExcelRow[],
  fileName: string = "수강확인리스트",
  businessNm: string = "",
): Promise<void> {
  const headers = ["번호", "내용", "일자"];
  const dataRows = items.map((item, index) => [
    item.rnum ?? index + 1,
    item.content ?? "",
    item.date ?? "",
  ]);

  const titleText = businessNm ? `${businessNm} - ${fileName}` : fileName;

  await downloadAdminListExcelFile("수강확인 리스트", fileName, {
    title: titleText,
    headers,
    dataRows,
    columnWidths: [8, 40, 12],
  });
}
