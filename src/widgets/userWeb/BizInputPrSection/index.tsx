"use client";

import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiClient,
  downloadWaterbAttachmentOrOpenView,
  getCareerConsultCalendarType,
} from "@/shared/lib";
import { API_CONFIG, API_ENDPOINTS } from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import SchoolSearchModal, {
  type SchoolItem,
} from "@/widgets/userWeb/SchoolSearchModal";
import type { ScheduleWithApplyItem } from "@/widgets/userWeb/BizInfoRcSection";

const IMG = "/images/userWeb";
const ICON = "/images/userWeb/icon";

const BANK_CODE_ID = "ARM002";
/** 학교구분(초/중/고 등) — NEIS schulKndScNm 매핑용 */
const SCHOOL_GB_CODE_ID = "EDR002";

/** "1반", "11반" 등에서 숫자만 추출 (학급 반 번호) */
function parseClassNumber(classNm: string): number {
  const digits = (classNm || "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** 반 표시: "2" → "2반", "2반" → "2반" (학년과 동일하게 N반 형식으로 통일) */
function formatClassLabel(classNm: string): string {
  const s = (classNm ?? "").trim();
  if (!s) return "";
  return /반\s*$/.test(s) ? s : `${s}반`;
}

/** 확장자로 파일 타입 클래스 반환 (.file.hwp, .file.pdf 등) */
function getFileTypeClass(filename: string): string {
  if (!filename) return "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["hwp", "hwpx"].includes(ext)) return "hwp";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return "img";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  return "";
}

/** 강연 회차 마감 여부 판단: "9/9" 형태 또는 applyCnt/recCnt 숫자 비교 */
function isLectureRoundClosed(item: ScheduleWithApplyItem): boolean {
  const applyCntStr = String(item.applyCntStr ?? "").trim();
  const pairMatch = applyCntStr.match(/(\d+)\s*\/\s*(\d+)/);
  if (pairMatch) {
    const applied = Number(pairMatch[1]);
    const capacity = Number(pairMatch[2]);
    if (!Number.isNaN(applied) && !Number.isNaN(capacity) && capacity > 0) {
      return applied >= capacity;
    }
  }
  const appliedNum = Number(item.applyCnt);
  const capacityNum = Number(item.recCnt);
  if (
    !Number.isNaN(appliedNum) &&
    !Number.isNaN(capacityNum) &&
    capacityNum > 0
  ) {
    return appliedNum >= capacityNum;
  }
  return false;
}

interface BankCodeItem {
  code?: string;
  codeNm?: string;
}

/** 학부모 연동 자녀 목록 항목 (USER_ARMCHIL) */
interface ArmchilChildItem {
  esntlId?: string;
  userNm?: string;
}

/** 첨부파일 행: 신청서~통장사본, seq 1~5 고정 (백엔드 저장 시 프론트에서 seq 전달) */
const FILE_ATTACH_ITEMS = [
  {
    id: "fileApp",
    label: "신청서",
    ariaLabel: "신청서 파일 첨부하기",
    seq: 1 as const,
  },
  {
    id: "filePrivacy",
    label: "개인정보수집 동의서",
    ariaLabel: "개인정보수집 동의서 파일 첨부하기",
    labelStyle: { letterSpacing: "-0.15rem" },
    seq: 2 as const,
  },
  {
    id: "fileScore",
    label: "신청자 점수 산정표",
    ariaLabel: "신청자 점수 산정표 파일 첨부하기",
    labelStyle: { letterSpacing: "-0.15rem" },
    seq: 3 as const,
  },
  {
    id: "fileIdCard",
    label: "신분증",
    ariaLabel: "신분증 파일 첨부하기",
    seq: 4 as const,
  },
  {
    id: "fileBankbook",
    label: "통장사본",
    ariaLabel: "통장사본 파일 첨부하기",
    seq: 5 as const,
  },
] as const;

type MypageTab = "applyInfo" | "cert";

interface BizInputPrSectionProps {
  proId?: string;
  /** 사업구분(ARTPROM.PRO_GB). 02=사전지원(bizInputPr)일 때 첨부파일 FILE_DESC 저장 */
  proGb?: string;
  /** MY PAGE 신청현황에서 진입 시 true. 상태 01(임시저장)일 때만 임시저장/신청하기 허용. gunsan apply_pr처럼 신청정보/수강확인증 탭 표시 */
  fromMypage?: boolean;
  /** 멘토업무(멘토일지)에서 진입 시 true. 학부모/학생/학교/상담정보/멘토지정은 읽기 전용, 멘토정보만 편집 가능, 하단 반려/저장/닫기 */
  fromMentorWork?: boolean;
  /** MY PAGE 신청현황에서 특정 신청 건 클릭 시 전달. 해당 자녀(REQ_ESNTL_ID)로 초기 선택해 해당 신청 폼 로드 */
  initialReqEsntlId?: string;
  /** 멘토일지에서 진입 시 전달. 해당 신청 건(REQ_ID)으로 상세 로드·멘토정보 블록 노출 */
  initialReqId?: string;
}

/**
 * 주민번호 화면 표시용 마스킹 (앞 7자리(970929-1)만 노출, 뒷자리 ******)
 * 저장/제출 시에는 state 원본 값(전체) 사용
 */
function maskIhidnum(val: string): string {
  if (!val || typeof val !== "string") return "";
  const digits = val.replace(/\D/g, "");
  if (digits.length <= 7) return val;
  return digits.slice(0, 6) + "-" + digits[6] + "******";
}

/** YYYYMMDD → YYYY-MM-DD (date input용) */
function formatBrthdyForInput(brthdy: string | undefined): string {
  if (!brthdy || brthdy.length < 8) return "";
  const d = brthdy.replace(/\D/g, "").slice(0, 8);
  if (d.length < 8) return "";
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** 변경이력 날짜 표시: yyyy-MM-dd HH:mm:ss → yyyy.MM.dd */
function formatChangeListDate(chgDt: string): string {
  if (!chgDt || typeof chgDt !== "string") return "";
  const s = chgDt.trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  return s;
}

/**
 * bizInput_pr.html 본문 구조 유지 (클래스명·id·접근성·DOM·이미지 원본 그대로)
 * 원본: source/gunsan/bizInput_pr.html
 * proId 있으면 학생 선택 시 BY_STUDENT로 기존 신청 데이터·첨부파일 로드 (bizInput과 동일)
 */
/** 오늘 날짜 YYYY-MM-DD (03 상담일자 기본값용) */
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 멘토정보 상담시간: 시/분 select용 옵션 (일정관리 운영시간과 동일) */
const MENTOR_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MENTOR_MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];

/** advFrom/advTo(yyyy-MM-ddThh:mm 또는 HH:mm, HH:mm:ss)에서 시 추출 → "00"~"23" */
function getMentorAdvHour(str: string): string {
  if (!str || typeof str !== "string") return "09";
  let t: string;
  if (str.includes("T")) t = str.split("T")[1];
  else if (/^\d{1,2}:\d{2}/.test(str))
    t = str.slice(0, 5); // HH:mm 또는 HH:mm:ss
  else t = str.slice(11, 16);
  if (!t || !t.includes(":")) return "09";
  const h = parseInt(t.slice(0, 2), 10);
  return Number.isNaN(h)
    ? "09"
    : String(Math.max(0, Math.min(23, h))).padStart(2, "0");
}

/** advFrom/advTo에서 분 추출 → 10분 단위로 반올림 "00"|"10"|...|"50" */
function getMentorAdvMin(str: string): string {
  if (!str || typeof str !== "string") return "00";
  let t: string;
  if (str.includes("T")) t = str.split("T")[1];
  else if (/^\d{1,2}:\d{2}/.test(str)) t = str.slice(0, 5);
  else t = str.slice(11, 16);
  if (!t || !t.includes(":")) return "00";
  const m = parseInt(t.slice(3, 5), 10);
  if (Number.isNaN(m)) return "00";
  const r = Math.round(m / 10) * 10;
  const v = r >= 60 ? 50 : r;
  return String(v).padStart(2, "0");
}

/** 날짜(YYYY-MM-DD) + 시/분으로 advFrom·advTo용 문자열 생성 (yyyy-MM-ddThh:mm) */
function buildMentorAdvDateTime(
  baseStr: string,
  dateFallback: string,
  hour: string,
  min: string,
): string {
  const datePart = /^\d{4}-\d{2}-\d{2}/.test(baseStr ?? "")
    ? (baseStr ?? "").slice(0, 10)
    : dateFallback || getTodayString();
  return `${datePart}T${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
}

/** 03 공공형 진로진학 컨설팅: 상담분야 옵션 (관리자 페이지와 동일: 01/02/03, 기본 첫번째) */
const CONSULT_FIELD_OPTIONS = [
  { value: "01", label: "상담1" },
  { value: "02", label: "상담2" },
  { value: "03", label: "상담3" },
];
/** API 응답: 상담일자별 장소/시간 (space_data=텍스트, pro_seq=value) */
interface ScheduleOptionItem {
  spaceData?: string;
  space_data?: string;
  proSeq?: number;
  pro_seq?: number;
}

const BizInputPrSection: React.FC<BizInputPrSectionProps> = ({
  proId,
  proGb,
  fromMypage = false,
  fromMentorWork = false,
  initialReqEsntlId,
  initialReqId: initialReqIdProp,
}) => {
  const auth = useUserWebAuthOptional();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterAlertCloseRef = useRef<(() => void) | null>(null);

  const isProGb03 = proGb === "03";
  /** 05 지역연계 진로체험 / 07 글로벌 문화탐방: 학부모정보 → 학생정보 → 학교정보 순서, 학부모는 보호자명/연락처/생년월일/관계만 */
  const isProGb07 = proGb === "07";
  const isProGb05Or07 = proGb === "05" || proGb === "07";
  /** 학부모/학생/학교/상담정보/멘토지정 읽기 전용: 멘토일지 진입 시에만 적용 */
  const isReadOnlyForm = fromMentorWork;
  /** MY PAGE에서 기존 신청 건 열람 시 학생(자녀) 변경 불가 — bizInput(proGb 01)과 동일 */
  const studentSelectLocked = isReadOnlyForm || fromMypage;

  const [bankOptions, setBankOptions] = useState<BankCodeItem[]>([]);
  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [guardianId, setGuardianId] = useState("");
  const [payBankCode, setPayBankCode] = useState("");
  const [holderNm, setHolderNm] = useState("");
  const [payBank, setPayBank] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [children, setChildren] = useState<ArmchilChildItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentBirth, setStudentBirth] = useState("");
  const [studentContact, setStudentContact] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentZip, setStudentZip] = useState("");
  const [studentAdres, setStudentAdres] = useState("");
  const [studentDetailAdres, setStudentDetailAdres] = useState("");
  const [schoolNm, setSchoolNm] = useState("");
  const [schoolLvl, setSchoolLvl] = useState("");
  const [schoolNo, setSchoolNo] = useState("");
  /** 학교구분(EDR002 코드: 초등 E, 중등 J, 고등 H 등) — 학교 선택 시 schulKndScNm으로 매핑 */
  const [schoolGb, setSchoolGb] = useState("");
  /** EDR002 코드명(초등학교 등) → 코드(E 등) 매핑 — 학교 선택 시 schoolGb 설정용 */
  const [schoolGbMapping, setSchoolGbMapping] = useState<Map<string, string>>(
    () => new Map(),
  );
  /** 다자녀 가구 여부: Y=해당, N=해당없음 (기본값 해당없음) */
  const [multiChildYn, setMultiChildYn] = useState<"Y" | "N">("N");
  /** 다자녀 가구 여부 오른쪽 입력란 (자녀 수 등) */
  const [multiChildText, setMultiChildText] = useState("");
  /** 03 공공형 진로진학 컨설팅 전용: 보호자 생년월일 */
  const [guardianBirth, setGuardianBirth] = useState("");
  /** 학부모 관계 표시명 (API RELATION_GB_NM, 05 회차관리 등에서 사용) */
  const [guardianRelationNm, setGuardianRelationNm] = useState("");
  /** 03 전용: 학생 성별 (공공형 진로진학은 기본 남). 05에서도 학생정보에 표시 */
  const [studentGender, setStudentGender] = useState<"M" | "F" | "">(
    proGb === "03" ? "M" : "",
  );
  /** 03 전용: 상담분야(기본 첫번째), 상담일자(디폴트 오늘), 장소+시간, 요청사항 */
  const [consultField, setConsultField] = useState(proGb === "03" ? "01" : "");
  const [consultDate, setConsultDate] = useState(() => getTodayString());
  const [consultPlaceTime, setConsultPlaceTime] = useState("");
  /** 03 전용: 상담일자별 장소/시간 옵션 (API schedule-options 연동, space_data=label, pro_seq=value) */
  const [consultPlaceTimeOptions, setConsultPlaceTimeOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "", label: "선택해주세요" }]);
  const [requestDesc, setRequestDesc] = useState("");
  /** 기존 첨부파일 목록 (BY_STUDENT fileList) */
  const [existingFiles, setExistingFiles] = useState<
    { fileId: string; seq: number; orgfNm?: string }[]
  >([]);
  /** 학생·사업별 기존 신청 건 로드 시 보관 (reqId: REQ_ID 단일 PK, PRO_SEQ 변경에 안전) */
  const [loadedReqId, setLoadedReqId] = useState("");
  const [loadedProSeq, setLoadedProSeq] = useState("");
  const [loadedSttusCode, setLoadedSttusCode] = useState("");
  /** 행별 새로 선택한 파일 (seq 1~5 고정, 저장 시 백엔드에 seq 전달) */
  const [pendingFilesBySeq, setPendingFilesBySeq] = useState<
    Partial<Record<number, File>>
  >({});
  /** 03 공공형 진로진학 전용: 요청사항 아래 첨부파일(여러 개) */
  const [pendingAttachFilesCt, setPendingAttachFilesCt] = useState<File[]>([]);
  /** 05 지역연계 진로체험 전용: 한 칸에 여러 파일 첨부 (01/bizInput 방식) */
  const [pendingAttachFiles05, setPendingAttachFiles05] = useState<
    { id: string; file: File }[]
  >([]);
  const fileInput05Ref = useRef<HTMLInputElement>(null);
  const fileInput05Id = useId();
  /** 첨부파일 삭제 확인 모달 (기존 파일만, fileId+seq 전달) */
  const [showDeleteFileConfirm, setShowDeleteFileConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string;
    seq: number;
  } | null>(null);
  /** MY PAGE + 03: BY_STUDENT detail.reaDesc(ARTAPPM.REA_DESC) — 멘토정보 섹션 '사유' 표시용 */
  const [loadedReaDesc, setLoadedReaDesc] = useState("");
  /** 멘토일지: 멘토정보 편집용 로컬 state (mentorInfo/loadedReaDesc와 동기화) */
  const [mentorAdvSpace, setMentorAdvSpace] = useState("");
  const [mentorAdvFrom, setMentorAdvFrom] = useState("");
  const [mentorAdvTo, setMentorAdvTo] = useState("");
  const [mentorAdvDesc, setMentorAdvDesc] = useState("");
  const [mentorReaDesc, setMentorReaDesc] = useState("");
  /** 멘토일지 진입 시 mentor-diary-detail로 로드한 학생 1명(표시용). 자녀 목록이 비어 있을 때 select 옵션으로 사용 */
  const [mentorDisplayStudent, setMentorDisplayStudent] = useState<{
    esntlId: string;
    userNm: string;
  } | null>(null);
  /** 05 학생 로그인 시: 본인 1명만 학생 선택 옵션으로 사용 */
  const [studentSelfOption, setStudentSelfOption] =
    useState<ArmchilChildItem | null>(null);
  /** 05 학생 로그인 시: 보호자 목록 (GET /api/user/armchil/parents) */
  const [parentList, setParentList] = useState<ArmchilChildItem[]>([]);
  /** 05 학생 로그인 시: 선택한 보호자 esntlId (저장 시 pEsntlId로 전송) */
  const [selectedParentId, setSelectedParentId] = useState("");
  /** 학생(SNR) 로그인 시 미연동 안내 다이얼로그 1회 */
  const snParentLinkAlertShownRef = useRef(false);
  /** 05 강연정보: 회차 목록(일정+신청인원) 및 선택 회차 PRO_SEQ (저장 시 artappm proSeq로 전송) */
  const [scheduleList05, setScheduleList05] = useState<ScheduleWithApplyItem[]>(
    [],
  );
  const [scheduleList05Loading, setScheduleList05Loading] = useState(false);
  const [selectedProSeq05, setSelectedProSeq05] = useState("");
  useEffect(() => {
    if (!fromMentorWork) setMentorDisplayStudent(null);
  }, [fromMentorWork]);
  /** MY PAGE + 03: mentor-info API 응답(멘토지정·상담장소·시간·내용·첨부파일). 조회 전용 */
  const [mentorInfo, setMentorInfo] = useState<{
    advEsntlNm?: string;
    mbtlnum?: string;
    profileDesc?: string;
    advSpace?: string;
    advFrom?: string;
    advTo?: string;
    advDesc?: string;
    files?: { fileId?: number; seq?: number; orgfNm?: string }[];
  } | null>(null);
  /** 멘토정보 첨부파일 - 아직 서버에 올리지 않은, 이번 저장/완료 때 함께 업로드할 파일들 */
  const [pendingMentorFiles, setPendingMentorFiles] = useState<File[]>([]);
  /** 수강확인증 목록(사용자, fromMypage 시 study-cert-list API) */
  const [studyCertList, setStudyCertList] = useState<
    {
      rnum?: string;
      proId?: string;
      proSeq?: string;
      reqEsntlId?: string;
      fileId?: number;
      seq?: number;
      uploadDttm?: string;
      fileDesc?: string;
    }[]
  >([]);
  /** 알림 모달 (삭제 실패 등) */
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");

  useEffect(() => {
    const endpoint = `${API_ENDPOINTS.CODE.DETAIL_LIST_BASE}/${BANK_CODE_ID}/details`;
    apiClient
      .get<BankCodeItem[]>(endpoint)
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setBankOptions(arr);
      })
      .catch(() => {
        setBankOptions([]);
      });
  }, []);

  /** 학교구분(EDR002) 코드 조회 — schulKndScNm(학교종류명) → 코드 매핑 (관리자 진로진학 신청과 동일) */
  useEffect(() => {
    let cancelled = false;
    const endpoint = `${API_ENDPOINTS.CODE.DETAIL_LIST_BASE}/${SCHOOL_GB_CODE_ID}/details`;
    apiClient
      .get<{ code?: string; codeNm?: string }[]>(endpoint)
      .then((list) => {
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        const mapping = new Map<string, string>();
        arr.forEach((item) => {
          if (item.codeNm != null && item.code != null)
            mapping.set(item.codeNm, item.code);
        });
        setSchoolGbMapping(mapping);
      })
      .catch(() => {
        if (!cancelled) setSchoolGbMapping(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 로그인 사용자 정보 로드: 학부모(PNR)면 보호자 필드 채움, 학생(SNR)이면 학생 필드 채움 및 본인을 학생 선택 옵션으로 설정(보호자는 PARENTS API). 멘토일지 진입 시에는 하지 않음. */
  useEffect(() => {
    if (fromMentorWork) return;
    if (!AuthService.isAuthenticated()) return;
    const esntlId = AuthService.getEsntlId();
    if (!esntlId) return;
    const userSe = AuthService.getUserSe();
    const isStudentApplicant = userSe === "SNR";
    UserArmuserService.getDetail(esntlId)
      .then((res) => {
        const d = res.detail;
        if (!d) return;
        if (isStudentApplicant) {
          setStudentContact(d.mbtlnum ?? "");
          setStudentId(d.ihidnum ?? "");
          setStudentBirth(formatBrthdyForInput(d.brthdy ?? ""));
          setStudentGender(
            ((d as Record<string, unknown>).sexdstnCode ?? "M") === "F"
              ? "F"
              : "M",
          );
          setStudentZip((d as Record<string, unknown>).zip as string);
          setStudentAdres((d as Record<string, unknown>).adres as string);
          setStudentDetailAdres(
            (d as Record<string, unknown>).detailAdres as string,
          );
          setSelectedStudentId(esntlId);
          setStudentSelfOption({
            esntlId,
            userNm: d.userNm ?? "",
          });
        } else {
          setGuardianName(d.userNm ?? "");
          setGuardianContact(d.mbtlnum ?? "");
          setGuardianId(d.ihidnum ?? "");
          setGuardianBirth(formatBrthdyForInput(d.brthdy ?? ""));
          setGuardianRelationNm(
            String(
              (d as Record<string, unknown>).relationGbNm ??
                (d as Record<string, unknown>).RELATION_GB_NM ??
                "",
            ).trim(),
          );
          setPayBankCode(d.payBankCode ?? "");
          setHolderNm(d.holderNm ?? "");
          setPayBank(d.payBank ?? "");
        }
      })
      .catch(() => {});
  }, [fromMentorWork]);

  /** 인증이 준비된 뒤 자녀 목록 조회 (학부모용). 학생(SNR)일 때는 스킵(본인 신청 + PARENTS로 보호자). 멘토일지 진입 시에는 자녀가 없어도 선택 해제하지 않음 */
  useEffect(() => {
    if (!isAuthenticated) return;
    if (AuthService.getUserSe() === "SNR") return;
    apiClient
      .get<{ data?: ArmchilChildItem[] }>(API_ENDPOINTS.USER_ARMCHIL.CHILDREN)
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setChildren(arr);
        if (arr.length === 0 && !fromMentorWork) setSelectedStudentId("");
      })
      .catch(() => setChildren([]));
  }, [isAuthenticated, fromMentorWork]);

  /** 학생(SNR) 로그인 시: 매칭 보호자 목록 (GET /api/user/armchil/parents), 1명만 사용 */
  useEffect(() => {
    if (!isAuthenticated || AuthService.getUserSe() !== "SNR") return;
    apiClient
      .get<{ data?: ArmchilChildItem[] }>(API_ENDPOINTS.USER_ARMCHIL.PARENTS)
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setParentList(arr);
        if (arr.length === 0) {
          setSelectedParentId("");
          setGuardianName("");
          setGuardianContact("");
          setGuardianBirth("");
          setGuardianId("");
          setGuardianRelationNm("");
          if (
            !snParentLinkAlertShownRef.current &&
            !fromMentorWork &&
            !fromMypage
          ) {
            snParentLinkAlertShownRef.current = true;
            setAlertTitle("자녀 연동이 필요합니다");
            setAlertMessage(
              "학부모님이 마이페이지에서 자녀 연동을 완료한 뒤 다시 신청해 주세요.",
            );
            setAlertType("danger");
            setShowAlertModal(true);
          }
          return;
        }
        const firstParentId = (arr[0]?.esntlId ?? "").trim();
        setSelectedParentId(firstParentId);
      })
      .catch(() => setParentList([]));
  }, [isAuthenticated, fromMentorWork, fromMypage]);

  /** 학생(SNR): 선택한 보호자 상세로 학부모 필드 채움 */
  useEffect(() => {
    if (AuthService.getUserSe() !== "SNR" || !selectedParentId) return;
    UserArmuserService.getDetail(selectedParentId)
      .then((res) => {
        const d = res.detail;
        if (!d) return;
        setGuardianName(d.userNm ?? "");
        setGuardianContact(d.mbtlnum ?? "");
        setGuardianId(d.ihidnum ?? "");
        setGuardianBirth(formatBrthdyForInput(d.brthdy ?? ""));
        setGuardianRelationNm(
          String(
            (d as Record<string, unknown>).relationGbNm ??
              (d as Record<string, unknown>).RELATION_GB_NM ??
              "",
          ).trim(),
        );
      })
      .catch(() => {});
  }, [selectedParentId]);

  /** 05 지역연계 진로체험: 강연(회차) 목록 조회 - ArtpromUserController GET schedule-with-apply (selectArtprodListWithApplyCnt) */
  useEffect(() => {
    if (!isProGb05Or07 || !proId?.trim()) {
      setScheduleList05([]);
      return;
    }
    setScheduleList05Loading(true);
    apiClient
      .get<{ data?: ScheduleWithApplyItem[]; result?: string }>(
        API_ENDPOINTS.USER_ARTPROM.SCHEDULE_WITH_APPLY(proId),
      )
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setScheduleList05(list);
      })
      .catch(() => setScheduleList05([]))
      .finally(() => setScheduleList05Loading(false));
  }, [isProGb05Or07, proId]);

  /** MY PAGE 신청현황에서 특정 신청 건으로 진입 시(initialReqEsntlId) 해당 자녀로 초기 선택 (1회만) */
  const initialReqEsntlIdAppliedRef = useRef(false);
  useEffect(() => {
    if (initialReqEsntlIdAppliedRef.current || !initialReqEsntlId) return;
    /** 멘토일지 진입: 자녀 목록과 무관하게 reqEsntlId로 학생 선택 */
    if (fromMentorWork) {
      setSelectedStudentId(initialReqEsntlId);
      initialReqEsntlIdAppliedRef.current = true;
      return;
    }
    /** 학생(SNR) MY PAGE 진입: 본인 신청 건이면 자녀 목록 없이도 학생 선택 (BY_REQ_ID 로드 가능하도록) */
    if (
      AuthService.getUserSe() === "SNR" &&
      AuthService.getEsntlId() === initialReqEsntlId.trim()
    ) {
      setSelectedStudentId(initialReqEsntlId);
      initialReqEsntlIdAppliedRef.current = true;
      return;
    }
    if (children.length === 0) return;
    if (children.some((c) => c.esntlId === initialReqEsntlId)) {
      setSelectedStudentId(initialReqEsntlId);
      initialReqEsntlIdAppliedRef.current = true;
    }
  }, [initialReqEsntlId, children, fromMentorWork]);

  /** 멘토일지 진입 시 reqId로 신청 건 상세 로드 — 보호자(해당 신청 건)·학생·학교·상담정보 채움. 로그인한 멘토가 아닌 신청 건의 보호자 정보 표시 */
  const initialReqId = (initialReqIdProp ?? "").trim();
  const mentorDiaryDetailAppliedRef = useRef(false);
  useEffect(() => {
    if (!fromMentorWork || !initialReqId || mentorDiaryDetailAppliedRef.current)
      return;
    mentorDiaryDetailAppliedRef.current = true;
    apiClient
      .get<{
        detail?: Record<string, unknown>;
        fileList?: { fileId: string; seq: number; orgfNm?: string }[];
      }>(API_ENDPOINTS.USER_ARTAPPM.MENTOR_DIARY_DETAIL(initialReqId))
      .then((res) => {
        const d = res.detail;
        if (!d) return;
        const studentEsntlId = String(
          (d as { cEsntlId?: string }).cEsntlId ?? d.reqEsntlId ?? "",
        ).trim();
        const studentNm = (d.userNm as string) ?? "";
        setSelectedStudentId(studentEsntlId);
        setMentorDisplayStudent(
          studentEsntlId
            ? { esntlId: studentEsntlId, userNm: studentNm }
            : null,
        );
        setLoadedReqId(initialReqId);
        setLoadedProSeq((d.proSeq as string) ?? "0");
        setLoadedSttusCode((d.sttusCode as string) ?? "");
        setGuardianName(
          (d.headNm as string)?.trim() || (d.pUserNm as string)?.trim() || "",
        );
        setGuardianContact((d.mbtlnum as string) ?? "");
        setGuardianBirth(formatBrthdyForInput((d.brthdy as string) ?? ""));
        setHouseholdName((d.headNm as string) ?? (d.pUserNm as string) ?? "");
        setMultiChildYn((d.mchilYn as string) === "Y" ? "Y" : "N");
        setMultiChildText((d.mchilNm as string) ?? "");
        setStudentZip((d.zip as string) ?? "");
        setStudentAdres((d.adres as string) ?? "");
        setStudentDetailAdres((d.detailAdres as string) ?? "");
        setSchoolNm((d.schoolNm as string) ?? "");
        setSchoolLvl(String(d.schoolLvl ?? ""));
        setSchoolNo(String(d.schoolNo ?? ""));
        setSchoolId((d.schoolId as string) ?? "");
        setSchoolGb((d.schoolGb as string) ?? "");
        fetchGradeOptionsBySchoolName((d.schoolNm as string) ?? "");
        setStudentBirth(formatBrthdyForInput((d.cBrthdy as string) ?? ""));
        setStudentContact((d.cMbtlnum as string) ?? "");
        setStudentId((d.cIhidnum as string) ?? "");
        setStudentGender(
          ((d.cSexdstnCode as string) ?? "M") === "F" ? "F" : "M",
        );
        setExistingFiles(Array.isArray(res.fileList) ? res.fileList : []);
        if (isProGb03) {
          setLoadedReaDesc(
            String((d as { reaDesc?: string }).reaDesc ?? "").trim(),
          );
          const workDtVal = (d.workDt as string) ?? "";
          const proSeqVal = d.proSeq != null ? String(d.proSeq) : "";
          const rawReqDesc =
            d.reqDesc != null && typeof d.reqDesc === "string"
              ? d.reqDesc.trim()
              : "";
          setConsultField(
            (d.proType as string) &&
              ["01", "02", "03"].includes(d.proType as string)
              ? (d.proType as string)
              : "01",
          );
          if (workDtVal) {
            const s = workDtVal.replace(/\D/g, "").slice(0, 8);
            setConsultDate(
              s.length === 8
                ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
                : workDtVal.length >= 10
                  ? workDtVal.slice(0, 10)
                  : getTodayString(),
            );
          } else {
            setConsultDate(getTodayString());
          }
          setConsultPlaceTime(proSeqVal);
          setRequestDesc(rawReqDesc);
          if (rawReqDesc !== "" && rawReqDesc.startsWith("{")) {
            try {
              const parsed = JSON.parse(rawReqDesc) as {
                consultField?: string;
                consultDate?: string;
                consultPlaceTime?: string;
                requestDesc?: string;
                guardianBirth?: string;
                studentGender?: string;
              };
              if (
                parsed.consultField &&
                ["01", "02", "03"].includes(parsed.consultField)
              ) {
                setConsultField(parsed.consultField);
              }
              if (parsed.consultDate) {
                const cd =
                  parsed.consultDate.length === 8 &&
                  /^\d{8}$/.test(parsed.consultDate)
                    ? `${parsed.consultDate.slice(0, 4)}-${parsed.consultDate.slice(4, 6)}-${parsed.consultDate.slice(6, 8)}`
                    : parsed.consultDate;
                setConsultDate(cd);
              }
              if (parsed.consultPlaceTime != null)
                setConsultPlaceTime(String(parsed.consultPlaceTime));
              if (parsed.requestDesc != null)
                setRequestDesc(parsed.requestDesc);
              if (parsed.guardianBirth) {
                const gb =
                  parsed.guardianBirth.length === 8 &&
                  /^\d{8}$/.test(parsed.guardianBirth)
                    ? `${parsed.guardianBirth.slice(0, 4)}-${parsed.guardianBirth.slice(4, 6)}-${parsed.guardianBirth.slice(6, 8)}`
                    : parsed.guardianBirth;
                setGuardianBirth(gb);
              }
              if (
                parsed.studentGender === "F" ||
                parsed.studentGender === "M"
              ) {
                setStudentGender(parsed.studentGender);
              }
            } catch {
              /* reqDesc 평문 유지 */
            }
          }
        }
      })
      .catch(() => {
        mentorDiaryDetailAppliedRef.current = false;
      });
  }, [fromMentorWork, initialReqId, isProGb03]);

  /** 03 전용: 상담일자 변경 시 장소/시간 옵션 API 연동 (space_data=label, pro_seq=value). 기존 선택값(로드된 proSeq)이 옵션에 있으면 유지 */
  useEffect(() => {
    if (!isProGb03 || !proId || !consultDate) {
      setConsultPlaceTimeOptions([{ value: "", label: "선택해주세요" }]);
      setConsultPlaceTime("");
      return;
    }
    const url = API_ENDPOINTS.USER_ARTPROM.SCHEDULE_OPTIONS(proId, consultDate);
    apiClient
      .get<ScheduleOptionItem[]>(url)
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        if (arr.length === 0) {
          setConsultPlaceTimeOptions([{ value: "", label: "선택해주세요" }]);
          setConsultPlaceTime("");
          return;
        }
        const options: { value: string; label: string }[] = arr.map((item) => ({
          value: String(item.proSeq ?? item.pro_seq ?? ""),
          label: item.spaceData ?? item.space_data ?? "",
        }));
        setConsultPlaceTimeOptions(options);
        setConsultPlaceTime((prev) => {
          const inList = options.some(
            (o) => o.value === prev && o.value !== "",
          );
          return inList ? prev : options[0].value;
        });
      })
      .catch(() => {
        setConsultPlaceTimeOptions([{ value: "", label: "선택해주세요" }]);
        setConsultPlaceTime("");
      });
  }, [isProGb03, proId, consultDate]);

  /** 학생 선택 시: proId 있으면 BY_STUDENT로 기존 신청 데이터·첨부파일 로드, 없으면 학생 정보만 로드 (bizInput과 동일) */
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentBirth("");
      setStudentContact("");
      setStudentId("");
      setStudentGender(isProGb03 ? "M" : "");
      setStudentZip("");
      setStudentAdres("");
      setStudentDetailAdres("");
      setSchoolNm("");
      setSchoolLvl("");
      setSchoolNo("");
      setSchoolId("");
      setSchoolGb("");
      setClassListForSchool([]);
      setGradeOptions([]);
      setClassOptions([]);
      setHouseholdName("");
      setMultiChildYn("N");
      setMultiChildText("");
      setExistingFiles([]);
      setLoadedReqId("");
      setLoadedProSeq("");
      setLoadedSttusCode("");
      return;
    }
    /** 멘토일지 진입: mentor-diary-detail로 이미 로드함. BY_STUDENT는 학부모 전용이라 호출하지 않음 */
    if (fromMentorWork && initialReqId) return;
    /** 공고 진입: 기존 신청 데이터는 로드하지 않고, 해당 학생 기본 정보만 로드 (저장/신청은 최초 1회만 가능) */
    if (!fromMypage && !fromMentorWork) {
      setLoadedReqId("");
      setLoadedProSeq("0");
      setLoadedSttusCode("");
      setHouseholdName("");
      setMultiChildYn("N");
      setMultiChildText("");
      setExistingFiles([]);
      UserArmuserService.getDetail(selectedStudentId)
        .then((r) => {
          const u = r.detail;
          if (!u) return;
          setStudentBirth(formatBrthdyForInput(u.brthdy ?? ""));
          setStudentContact(u.mbtlnum ?? "");
          setStudentId(u.ihidnum ?? "");
          setStudentGender((u.sexdstnCode ?? "M") === "F" ? "F" : "M");
          setStudentZip(u.zip ?? "");
          setStudentAdres(u.adres ?? "");
          setStudentDetailAdres(u.detailAdres ?? "");
          setSchoolNm(u.schoolNm ?? "");
          setSchoolLvl(String(u.schoolLvl ?? ""));
          setSchoolNo(String(u.schoolNo ?? ""));
          setSchoolId(u.schoolId ?? "");
          setSchoolGb(u.schoolGb ?? "");
          setClassListForSchool([]);
          setGradeOptions([]);
          setClassOptions([]);
          fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
        })
        .catch(() => {});
      return;
    }
    if (proId) {
      const params = new URLSearchParams({
        proId,
        reqEsntlId: effectiveReqEsntlId,
      });
      const useReqId =
        fromMypage &&
        initialReqId !== "" &&
        (initialReqEsntlId ?? "").trim() !== "" &&
        effectiveReqEsntlId === (initialReqEsntlId ?? "").trim();
      const url = useReqId
        ? API_ENDPOINTS.USER_ARTAPPM.BY_REQ_ID(initialReqId)
        : `${API_ENDPOINTS.USER_ARTAPPM.BY_STUDENT}?${params}`;
      apiClient
        .get<{
          detail?: Record<string, unknown>;
          fileList?: { fileId: string; seq: number; orgfNm?: string }[];
        }>(url)
        .then((res) => {
          const d = res.detail;
          if (d) {
            setLoadedReqId((d.reqId as string) ?? "");
            setLoadedProSeq((d.proSeq as string) ?? "0");
            setLoadedSttusCode((d.sttusCode as string) ?? "");
            setHouseholdName(
              (d.headNm as string) ?? (d.pUserNm as string) ?? "",
            );
            setGuardianRelationNm(
              String(
                (d as Record<string, unknown>).relationGbNm ??
                  (d as Record<string, unknown>).RELATION_GB_NM ??
                  "",
              ).trim(),
            );
            setMultiChildYn((d.mchilYn as string) === "Y" ? "Y" : "N");
            setMultiChildText((d.mchilNm as string) ?? "");
            setStudentZip((d.zip as string) ?? "");
            setStudentAdres((d.adres as string) ?? "");
            setStudentDetailAdres((d.detailAdres as string) ?? "");
            setSchoolNm((d.schoolNm as string) ?? "");
            setSchoolLvl(String(d.schoolLvl ?? ""));
            setSchoolNo(String(d.schoolNo ?? ""));
            setSchoolId((d.schoolId as string) ?? "");
            setSchoolGb(String(d.schoolGb ?? ""));
            setClassListForSchool([]);
            setGradeOptions([]);
            setClassOptions([]);
            fetchGradeOptionsBySchoolName((d.schoolNm as string) ?? "");
            setStudentBirth(formatBrthdyForInput((d.brthdy as string) ?? ""));
            setStudentContact((d.mbtlnum as string) ?? "");
            setStudentId((d.cIhidnum as string) ?? "");
            setStudentGender(
              ((d.cSexdstnCode as string) ?? "M") === "F" ? "F" : "M",
            );
            setExistingFiles(Array.isArray(res.fileList) ? res.fileList : []);
            /** 학생(SNR) 신청 건 로드 시: 보호자 선택 복원 */
            if (AuthService.getUserSe() === "SNR" && (d.pEsntlId as string)) {
              setSelectedParentId(String(d.pEsntlId));
            }
            /** 05 신청 건 로드 시: 선택 회차 복원 */
            if (isProGb05Or07 && d.proSeq != null) {
              setSelectedProSeq05(String(d.proSeq));
            }
            /** 03 공공형 진로진학: 상담정보 — BY_STUDENT 응답(proType, workDt, proSeq, reqDesc)로 채움. bizInputCt는 proGb=03 고정이므로 isProGb03 기준 */
            if (isProGb03) {
              setLoadedReaDesc(
                String((d as { reaDesc?: string }).reaDesc ?? "").trim(),
              );
              const proTypeVal = (d.proType as string) ?? "";
              const workDtVal = (d.workDt as string) ?? "";
              const proSeqVal = d.proSeq != null ? String(d.proSeq) : "";
              const rawReqDesc =
                d.reqDesc != null && typeof d.reqDesc === "string"
                  ? d.reqDesc.trim()
                  : "";
              setConsultField(
                proTypeVal && ["01", "02", "03"].includes(proTypeVal)
                  ? proTypeVal
                  : "01",
              );
              if (workDtVal) {
                const s = workDtVal.replace(/\D/g, "").slice(0, 8);
                setConsultDate(
                  s.length === 8
                    ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
                    : workDtVal.length >= 10
                      ? workDtVal.slice(0, 10)
                      : getTodayString(),
                );
              } else {
                setConsultDate(getTodayString());
              }
              setConsultPlaceTime(proSeqVal);
              setRequestDesc(rawReqDesc);
              if (rawReqDesc !== "" && rawReqDesc.startsWith("{")) {
                try {
                  const parsed = JSON.parse(rawReqDesc) as {
                    consultField?: string;
                    consultDate?: string;
                    consultPlaceTime?: string;
                    requestDesc?: string;
                    guardianBirth?: string;
                    studentGender?: string;
                  };
                  if (
                    parsed.consultField &&
                    ["01", "02", "03"].includes(parsed.consultField)
                  ) {
                    setConsultField(parsed.consultField);
                  }
                  if (parsed.consultDate) {
                    const cd =
                      parsed.consultDate.length === 8 &&
                      /^\d{8}$/.test(parsed.consultDate)
                        ? `${parsed.consultDate.slice(0, 4)}-${parsed.consultDate.slice(4, 6)}-${parsed.consultDate.slice(6, 8)}`
                        : parsed.consultDate;
                    setConsultDate(cd);
                  }
                  if (parsed.consultPlaceTime != null)
                    setConsultPlaceTime(String(parsed.consultPlaceTime));
                  if (parsed.requestDesc != null)
                    setRequestDesc(parsed.requestDesc);
                  if (parsed.guardianBirth) {
                    const gb =
                      parsed.guardianBirth.length === 8 &&
                      /^\d{8}$/.test(parsed.guardianBirth)
                        ? `${parsed.guardianBirth.slice(0, 4)}-${parsed.guardianBirth.slice(4, 6)}-${parsed.guardianBirth.slice(6, 8)}`
                        : parsed.guardianBirth;
                    setGuardianBirth(gb);
                  }
                  if (
                    parsed.studentGender === "F" ||
                    parsed.studentGender === "M"
                  ) {
                    setStudentGender(parsed.studentGender);
                  }
                } catch {
                  /* reqDesc 평문으로 유지 */
                }
              }
            }
          } else {
            setLoadedReqId("");
            setLoadedProSeq("0");
            setLoadedSttusCode("");
            setLoadedReaDesc("");
            setMentorInfo(null);
            setHouseholdName("");
            setMultiChildYn("N");
            setMultiChildText("");
            setExistingFiles([]);
            UserArmuserService.getDetail(selectedStudentId)
              .then((r) => {
                const u = r.detail;
                if (!u) return;
                setStudentBirth(formatBrthdyForInput(u.brthdy ?? ""));
                setStudentContact(u.mbtlnum ?? "");
                setStudentId(u.ihidnum ?? "");
                setStudentGender((u.sexdstnCode ?? "M") === "F" ? "F" : "M");
                setStudentZip(u.zip ?? "");
                setStudentAdres(u.adres ?? "");
                setStudentDetailAdres(u.detailAdres ?? "");
                setSchoolNm(u.schoolNm ?? "");
                setSchoolLvl(String(u.schoolLvl ?? ""));
                setSchoolNo(String(u.schoolNo ?? ""));
                setSchoolId(u.schoolId ?? "");
                setSchoolGb(u.schoolGb ?? "");
                setClassListForSchool([]);
                setGradeOptions([]);
                setClassOptions([]);
                fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          setLoadedReqId("");
          setLoadedProSeq("0");
          setLoadedSttusCode("");
          setLoadedReaDesc("");
          setMentorInfo(null);
          setHouseholdName("");
          setMultiChildYn("N");
          setMultiChildText("");
          setExistingFiles([]);
          UserArmuserService.getDetail(selectedStudentId)
            .then((r) => {
              const u = r.detail;
              if (!u) return;
              setStudentBirth(formatBrthdyForInput(u.brthdy ?? ""));
              setStudentContact(u.mbtlnum ?? "");
              setStudentId(u.ihidnum ?? "");
              setStudentGender((u.sexdstnCode ?? "M") === "F" ? "F" : "M");
              setStudentZip(u.zip ?? "");
              setStudentAdres(u.adres ?? "");
              setStudentDetailAdres(u.detailAdres ?? "");
              setSchoolNm(u.schoolNm ?? "");
              setSchoolLvl(String(u.schoolLvl ?? ""));
              setSchoolNo(String(u.schoolNo ?? ""));
              setSchoolId(u.schoolId ?? "");
              setSchoolGb(u.schoolGb ?? "");
              setClassListForSchool([]);
              setGradeOptions([]);
              setClassOptions([]);
              fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
            })
            .catch(() => {});
        });
    } else {
      setLoadedReqId("");
      setLoadedProSeq("0");
      setLoadedSttusCode("");
      setLoadedReaDesc("");
      setMentorInfo(null);
      setHouseholdName("");
      setMultiChildYn("N");
      setMultiChildText("");
      setExistingFiles([]);
      UserArmuserService.getDetail(selectedStudentId)
        .then((r) => {
          const u = r.detail;
          if (!u) return;
          setStudentBirth(formatBrthdyForInput(u.brthdy ?? ""));
          setStudentContact(u.mbtlnum ?? "");
          setStudentId(u.ihidnum ?? "");
          setStudentZip(u.zip ?? "");
          setStudentAdres(u.adres ?? "");
          setStudentDetailAdres(u.detailAdres ?? "");
          setSchoolNm(u.schoolNm ?? "");
          setSchoolLvl(String(u.schoolLvl ?? ""));
          setSchoolNo(String(u.schoolNo ?? ""));
          setSchoolId(u.schoolId ?? "");
          setSchoolGb(u.schoolGb ?? "");
          setClassListForSchool([]);
          setGradeOptions([]);
          setClassOptions([]);
          fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
        })
        .catch(() => {});
    }
  }, [selectedStudentId, proId, fromMypage, fromMentorWork]);

  /** 멘토일지 진입 시 URL의 reqId로도 멘토정보 블록 노출·API 호출 (loadedReqId는 mentor-diary-detail 로드 후 세팅됨) */
  const effectiveReqId =
    loadedReqId || (fromMentorWork && initialReqId ? initialReqId : "");

  /** 학생 select 옵션: 학생(SNR)이면 본인 1명, 멘토일지면 로드한 학생 1명, 아니면 자녀 목록 */
  const studentSelectOptions: ArmchilChildItem[] =
    AuthService.getUserSe() === "SNR"
      ? studentSelfOption
        ? [studentSelfOption]
        : []
      : fromMentorWork && mentorDisplayStudent
        ? [
            {
              esntlId: mentorDisplayStudent.esntlId,
              userNm: mentorDisplayStudent.userNm,
            },
          ]
        : children;

  /** API/저장 시 사용할 신청자(학생) ID: 학생(SNR)이면 본인, 아니면 선택한 자녀 */
  const effectiveReqEsntlId =
    AuthService.getUserSe() === "SNR"
      ? (AuthService.getEsntlId() ?? "")
      : selectedStudentId;

  /** 03 + MY PAGE 또는 멘토일지: effectiveReqId 있을 때 멘토정보(ARTADVI) API 호출 */
  useEffect(() => {
    if (!isProGb03 || (!fromMypage && !fromMentorWork) || !effectiveReqId) {
      setMentorInfo(null);
      return;
    }
    const url = API_ENDPOINTS.USER_ARTAPPM.MENTOR_INFO(effectiveReqId);
    apiClient
      .get<{
        advEsntlNm?: string;
        mbtlnum?: string;
        profileDesc?: string;
        advSpace?: string;
        advFrom?: string;
        advTo?: string;
        advDesc?: string;
        files?: { fileId?: number; seq?: number; orgfNm?: string }[];
      } | null>(url)
      .then((res) => setMentorInfo(res ?? null))
      .catch(() => setMentorInfo(null));
  }, [isProGb03, fromMypage, fromMentorWork, effectiveReqId]);

  /** 멘토일지: mentorInfo/loadedReaDesc 변경 시 편집 state 동기화. 상담시간은 시/분 select용으로 yyyy-MM-ddThh:mm 형식 유지 */
  useEffect(() => {
    if (mentorInfo) {
      setMentorAdvSpace(mentorInfo.advSpace ?? "");
      const fromRaw = (mentorInfo.advFrom ?? "").trim();
      const toRaw = (mentorInfo.advTo ?? "").trim();
      const toAdvDt = (raw: string): string => {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16);
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw))
          return raw.slice(0, 10) + "T" + raw.slice(11, 16);
        if (raw.length >= 10) return raw.slice(0, 10) + "T00:00";
        // API가 시간만 내려줄 때(예: 10:00:00, 11:00:00) → 오늘 날짜 + HH:mm
        const timeOnly = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (timeOnly)
          return `${getTodayString()}T${timeOnly[1].padStart(2, "0")}:${timeOnly[2]}`;
        return raw;
      };
      setMentorAdvFrom(toAdvDt(fromRaw));
      setMentorAdvTo(toAdvDt(toRaw));
      setMentorAdvDesc(mentorInfo.advDesc ?? "");
    }
    setMentorReaDesc(loadedReaDesc);
  }, [mentorInfo, loadedReaDesc]);

  /** 멘토정보(ARTADVI) 재조회 — 업로드/삭제 후 목록 갱신용 */
  const refetchMentorInfo = useCallback((reqId: string) => {
    if (!reqId) return;
    const url = API_ENDPOINTS.USER_ARTAPPM.MENTOR_INFO(reqId);
    apiClient
      .get<{
        advEsntlNm?: string;
        mbtlnum?: string;
        profileDesc?: string;
        advSpace?: string;
        advFrom?: string;
        advTo?: string;
        advDesc?: string;
        files?: { fileId?: number; seq?: number; orgfNm?: string }[];
      } | null>(url)
      .then((res) => setMentorInfo(res ?? null))
      .catch(() => setMentorInfo(null));
  }, []);

  /** 멘토정보 첨부파일 선택 (멘토일지, effectiveReqId 사용). 여러 파일 동시 선택 가능, 실제 업로드는 저장/완료 시점에 수행 */
  const handleMentorInfoFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (!files.length) return;
      setPendingMentorFiles((prev) => [...prev, ...files]);
      e.target.value = "";
    },
    [],
  );

  /** 멘토정보 첨부파일 1건 삭제 */
  const handleMentorInfoFileDelete = useCallback(
    async (fileId: number, seq: number) => {
      if (!effectiveReqId) return;
      const key = `${fileId}-${seq}`;
      setMentorInfoDeletingKey(key);
      try {
        const url = API_ENDPOINTS.USER_ARTAPPM.MENTOR_INFO_DELETE_FILE(
          effectiveReqId,
          String(fileId),
          seq,
        );
        const res = await apiClient.delete<{
          result?: string;
          message?: string;
        }>(url);
        if (res?.result === "00") {
          refetchMentorInfo(effectiveReqId);
          setAlertTitle("완료");
          setAlertMessage("첨부파일이 삭제되었습니다.");
          setAlertType("success");
          setShowAlertModal(true);
        } else {
          setAlertTitle("안내");
          setAlertMessage(res?.message ?? "첨부파일 삭제에 실패했습니다.");
          setAlertType("danger");
          setShowAlertModal(true);
        }
      } catch {
        setAlertTitle("안내");
        setAlertMessage("첨부파일 삭제 중 오류가 발생했습니다.");
        setAlertType("danger");
        setShowAlertModal(true);
      } finally {
        setMentorInfoDeletingKey(null);
      }
    },
    [effectiveReqId, refetchMentorInfo],
  );

  /** 멘토일지: 멘토정보 완료 처리(ARTADVI + ARTAPPM 상태 04). '완료' 버튼 클릭 시 호출 */
  const [mentorInfoSaveLoading, setMentorInfoSaveLoading] = useState(false);
  const handleSaveMentorInfo = useCallback(async () => {
    if (!effectiveReqId) {
      showAlert("알림", "신청 정보가 없습니다.", "danger");
      return;
    }
    /** DB ADV_FROM/ADV_TO는 TIME(HH:mm:ss). yyyy-MM-ddThh:mm 또는 hh:mm → HH:mm:ss 로 변환 */
    const toTimeOnly = (value: string | undefined): string | undefined => {
      const s = (value ?? "").trim();
      if (!s) return undefined;
      if (s.includes("T")) {
        const part = s.split("T")[1]?.slice(0, 5);
        return part ? `${part}:00` : undefined;
      }
      const timeMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (timeMatch)
        return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2].padStart(2, "0")}:${(timeMatch[3] ?? "00").padStart(2, "0")}`;
      return undefined;
    };
    setMentorInfoSaveLoading(true);
    try {
      // 1) 아직 업로드되지 않은 첨부파일이 있으면 먼저 업로드
      if (pendingMentorFiles.length > 0) {
        const url =
          API_ENDPOINTS.USER_ARTAPPM.MENTOR_INFO_UPLOAD(effectiveReqId);
        for (const file of pendingMentorFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await apiClient.put<{
            result?: string;
            message?: string;
          }>(url, formData);
          if (res?.result !== "00") {
            throw new Error(res?.message ?? "첨부파일 등록에 실패했습니다.");
          }
        }
      }
      const fileId =
        (mentorInfo as { fileId?: string } | undefined)?.fileId ??
        (mentorInfo?.files?.[0] != null
          ? String(mentorInfo.files[0].fileId)
          : "");
      const body = {
        reqId: effectiveReqId,
        // mentorAdvFrom/mentorAdvTo가 ""(state 미초기화)여도 화면에서 선택된 값(기본값 포함)이 저장되도록 보정
        advFrom: toTimeOnly(
          mentorAdvFrom
            ? mentorAdvFrom
            : buildMentorAdvDateTime(
                mentorAdvFrom,
                consultDate || getTodayString(),
                getMentorAdvHour(mentorAdvFrom),
                getMentorAdvMin(mentorAdvFrom),
              ),
        ),
        advTo: toTimeOnly(
          mentorAdvTo
            ? mentorAdvTo
            : buildMentorAdvDateTime(
                mentorAdvTo,
                consultDate || getTodayString(),
                getMentorAdvHour(mentorAdvTo),
                getMentorAdvMin(mentorAdvTo),
              ),
        ),
        advDt: consultDate?.trim() ? consultDate.trim() : undefined,
        advSpace: mentorAdvSpace || undefined,
        advDesc: mentorAdvDesc || undefined,
        fileId: fileId || undefined,
        tempSave: false,
      };
      const res = await apiClient.put<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTAPPM.MENTOR_INFO_SAVE,
        body,
      );
      if (res?.result === "00") {
        setPendingMentorFiles([]);
        setLoadedSttusCode("04");
        refetchMentorInfo(effectiveReqId);
        showAlert("완료", res?.message ?? "완료되었습니다.", "success");
      } else {
        showAlert(
          "저장 실패",
          res?.message ?? "저장에 실패했습니다.",
          "danger",
        );
      }
    } catch (e) {
      showAlert(
        "알림",
        e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.",
        "danger",
      );
    } finally {
      setMentorInfoSaveLoading(false);
    }
  }, [
    effectiveReqId,
    mentorAdvFrom,
    mentorAdvTo,
    mentorAdvSpace,
    mentorAdvDesc,
    mentorInfo,
    pendingMentorFiles,
    refetchMentorInfo,
  ]);

  /** 멘토일지: 저장(ARTADVI만 저장, 상태 변경 없음). 버튼 순서: 저장 | 완료 | 반려 */
  const handleSaveMentorInfoTemp = useCallback(async () => {
    if (!effectiveReqId) {
      showAlert("알림", "신청 정보가 없습니다.", "danger");
      return;
    }
    const toTimeOnly = (value: string | undefined): string | undefined => {
      const s = (value ?? "").trim();
      if (!s) return undefined;
      if (s.includes("T")) {
        const part = s.split("T")[1]?.slice(0, 5);
        return part ? `${part}:00` : undefined;
      }
      const timeMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (timeMatch)
        return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2].padStart(2, "0")}:${(timeMatch[3] ?? "00").padStart(2, "0")}`;
      return undefined;
    };
    setMentorInfoSaveLoading(true);
    try {
      // 1) 아직 업로드되지 않은 첨부파일이 있으면 먼저 업로드
      if (pendingMentorFiles.length > 0) {
        const url =
          API_ENDPOINTS.USER_ARTAPPM.MENTOR_INFO_UPLOAD(effectiveReqId);
        for (const file of pendingMentorFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await apiClient.put<{
            result?: string;
            message?: string;
          }>(url, formData);
          if (res?.result !== "00") {
            throw new Error(res?.message ?? "첨부파일 등록에 실패했습니다.");
          }
        }
      }
      const fileId =
        (mentorInfo as { fileId?: string } | undefined)?.fileId ??
        (mentorInfo?.files?.[0] != null
          ? String(mentorInfo.files[0].fileId)
          : "");
      const body = {
        reqId: effectiveReqId,
        // mentorAdvFrom/mentorAdvTo가 ""(state 미초기화)여도 화면에서 선택된 값(기본값 포함)이 저장되도록 보정
        advFrom: toTimeOnly(
          mentorAdvFrom
            ? mentorAdvFrom
            : buildMentorAdvDateTime(
                mentorAdvFrom,
                consultDate || getTodayString(),
                getMentorAdvHour(mentorAdvFrom),
                getMentorAdvMin(mentorAdvFrom),
              ),
        ),
        advTo: toTimeOnly(
          mentorAdvTo
            ? mentorAdvTo
            : buildMentorAdvDateTime(
                mentorAdvTo,
                consultDate || getTodayString(),
                getMentorAdvHour(mentorAdvTo),
                getMentorAdvMin(mentorAdvTo),
              ),
        ),
        advDt: consultDate?.trim() ? consultDate.trim() : undefined,
        advSpace: mentorAdvSpace || undefined,
        advDesc: mentorAdvDesc || undefined,
        fileId: fileId || undefined,
        tempSave: true,
      };
      const res = await apiClient.put<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTAPPM.MENTOR_INFO_SAVE,
        body,
      );
      if (res?.result === "00") {
        setPendingMentorFiles([]);
        refetchMentorInfo(effectiveReqId);
        showAlert("저장", res?.message ?? "저장되었습니다.", "success");
      } else {
        showAlert(
          "저장 실패",
          res?.message ?? "저장에 실패했습니다.",
          "danger",
        );
      }
    } catch (e) {
      showAlert(
        "알림",
        e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.",
        "danger",
      );
    } finally {
      setMentorInfoSaveLoading(false);
    }
  }, [
    effectiveReqId,
    mentorAdvFrom,
    mentorAdvTo,
    mentorAdvSpace,
    mentorAdvDesc,
    mentorInfo,
    pendingMentorFiles,
    refetchMentorInfo,
  ]);

  /** 초기화: 05 지역연계(공고·!mypage): 강연(회차) 선택·첨부만 초기화(학생·학교·보호자 등 유지). 그 외: 세대주명·학생 해제 등 기존 동작. fromMypage면 학생 유지. 03은 상담/멘토 블록까지 초기화 */
  const handleReset = () => {
    if (proGb === "05" && !fromMypage && !fromMentorWork) {
      setSelectedProSeq05("");
      setLoadedProSeq("");
      setPendingAttachFiles05([]);
      setExistingFiles([]);
      if (fileInput05Ref.current) fileInput05Ref.current.value = "";
      return;
    }
    setHouseholdName("");
    if (!fromMypage && !fromMentorWork) setSelectedStudentId("");
    setMultiChildYn("N");
    setMultiChildText("");
    setExistingFiles([]);
    setLoadedReqId("");
    setLoadedProSeq("");
    setLoadedSttusCode("");
    setPendingFilesBySeq({});
    if (isProGb03) {
      setConsultField("01");
      setConsultDate(getTodayString());
      setConsultPlaceTime("");
      setRequestDesc("");
      setLoadedReaDesc("");
      setMentorInfo(null);
      setPendingAttachFilesCt([]);
    }
  };

  /** 행별(seq) 파일 선택: 저장 시 백엔드에 seq 1~5 고정 전달 */
  const handleFileSelectBySeq = (seq: number, file: File | null) => {
    setPendingFilesBySeq((prev) => {
      const next = { ...prev };
      if (file) next[seq] = file;
      else delete next[seq];
      return next;
    });
  };

  /** 05 지역연계 진로체험: 한 칸 여러 파일 첨부 (01/bizInput 방식) */
  const handleFileSelect05 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: `pending-05-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
    }));
    setPendingAttachFiles05((prev) => [...prev, ...next]);
    e.target.value = "";
    fileInput05Ref.current && (fileInput05Ref.current.value = "");
  };

  /** 저장·신청 가능: 데이터 없음("")이면 항상 가능. 01(임시저장)이면 MY PAGE 진입(fromMypage)일 때만 가능. 02/03/04/05/99는 불가 */
  const canSaveOrApply =
    loadedSttusCode === "" || (loadedSttusCode === "01" && fromMypage);
  const showAlert = (
    title: string,
    message: string,
    type: AlertModalType = "success",
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  /** 학교검색 모달에서 학교 선택 시: 학교명·학교구분 반영 후 해당 학교 학년/반 옵션 조회 (관리자 진로진학 신청과 동일) */
  const handleSchoolSelect = (school: SchoolItem) => {
    const code = school.sdSchulCode ?? "";
    const schoolTypeName = school.schulKndScNm ?? "";
    const schoolGbCode = schoolGbMapping.get(schoolTypeName) ?? "";
    setSchoolNm(school.schulNm ?? "");
    setSchoolId(code);
    setSchoolGb(schoolGbCode);
    setSchoolLvl("");
    setSchoolNo("");
    setShowSchoolModal(false);
    if (!code) {
      setGradeOptions([]);
      setClassOptions([]);
      setClassListForSchool([]);
      return;
    }
    setClassLoading(true);
    apiClient
      .get<
        | { grade?: string; classNm?: string }[]
        | { content?: { grade?: string; classNm?: string }[] }
      >(
        `${API_ENDPOINTS.NEIS.CLASS_INFO}?sdSchulCode=${encodeURIComponent(code)}`,
      )
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { content?: unknown[] })?.content)
            ? (res as { content: { grade?: string; classNm?: string }[] })
                .content
            : [];
        setClassListForSchool(list);
        const gradeSet = new Set<string>();
        list.forEach((item) => {
          if (item.grade) gradeSet.add(item.grade);
        });
        const grades = Array.from(gradeSet).sort((a, b) => {
          const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
          const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
          return na - nb;
        });
        setGradeOptions(
          grades.map((g) => ({
            value: String(parseInt(g.replace(/\D/g, ""), 10) || 0),
            label: `${g}학년`,
          })),
        );
        setClassOptions([]);
      })
      .catch(() => {
        setClassListForSchool([]);
        setGradeOptions([]);
        setClassOptions([]);
      })
      .finally(() => setClassLoading(false));
  };

  /** 학생 상세 로드 시 저장된 학교명으로 NEIS 학교 조회 후 해당 학교 학년/반 옵션 설정 (중학교 3학년 등 실제 학년만 노출) */
  const fetchGradeOptionsBySchoolName = (name: string) => {
    const schoolNm = (name ?? "").trim();
    if (!schoolNm) return;
    setClassLoading(true);
    apiClient
      .get<{ content?: SchoolItem[] }>(
        `${API_ENDPOINTS.NEIS.GUNSAN_SCHOOLS}?page=0&size=20&text=${encodeURIComponent(schoolNm)}`,
      )
      .then((res) => {
        const content = Array.isArray(res?.content) ? res.content : [];
        const school = content.find(
          (s) => (s.schulNm ?? "").trim() === schoolNm,
        );
        const code = school?.sdSchulCode ?? "";
        if (!code) {
          setClassLoading(false);
          return;
        }
        setSchoolId(code);
        const schoolTypeName = school?.schulKndScNm ?? "";
        setSchoolGb(schoolGbMapping.get(schoolTypeName) ?? "");
        return apiClient.get<
          | { grade?: string; classNm?: string }[]
          | { content?: { grade?: string; classNm?: string }[] }
        >(
          `${API_ENDPOINTS.NEIS.CLASS_INFO}?sdSchulCode=${encodeURIComponent(code)}`,
        );
      })
      .then((classRes) => {
        if (!classRes) return;
        const list = Array.isArray(classRes)
          ? classRes
          : Array.isArray((classRes as { content?: unknown[] })?.content)
            ? (classRes as { content: { grade?: string; classNm?: string }[] })
                .content
            : [];
        setClassListForSchool(list);
        const gradeSet = new Set<string>();
        list.forEach((item) => {
          if (item.grade) gradeSet.add(item.grade);
        });
        const grades = Array.from(gradeSet).sort((a, b) => {
          const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
          const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
          return na - nb;
        });
        setGradeOptions(
          grades.map((g) => ({
            value: String(parseInt(g.replace(/\D/g, ""), 10) || 0),
            label: `${g}학년`,
          })),
        );
        setClassOptions([]);
      })
      .catch(() => {
        setClassListForSchool([]);
        setGradeOptions([]);
        setClassOptions([]);
      })
      .finally(() => setClassLoading(false));
  };

  /** 기존 첨부파일 삭제 (reqId + fileId + seq, by-req-id 전용) */
  const removeExistingFile = (fileId: string, seq: number) => {
    if (!canSaveOrApply) {
      showAlert(
        "알림",
        fromMypage
          ? "이미 신청 완료된 지원사업은 수정할 수 없습니다."
          : "수정은 MY PAGE에서만 가능합니다.\n이미 신청 완료된 지원사업은 수정할 수 없습니다.",
        "danger",
      );
      return;
    }
    if (!loadedReqId) {
      showAlert(
        "알림",
        "삭제를 진행할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.",
        "danger",
      );
      return;
    }
    const url = API_ENDPOINTS.USER_ARTAPPM.DELETE_FILE_BY_REQ_ID(
      loadedReqId,
      fileId,
      seq,
    );
    apiClient
      .delete<{ result?: string; message?: string }>(url)
      .then((res) => {
        if (res?.result === "00") {
          setExistingFiles((prev) =>
            prev.filter((f) => !(f.fileId === fileId && f.seq === seq)),
          );
        } else {
          showAlert(
            "알림",
            res?.message ?? "파일 삭제에 실패했습니다.",
            "danger",
          );
        }
      })
      .catch(() => {
        showAlert("알림", "파일 삭제 중 오류가 발생했습니다.", "danger");
      });
  };

  /** 임시저장(01) / 신청하기(02) — bizInput과 동일 API, data에 bizInputPr 필드(세대주명·다자녀·파일 seq 1~5) 반영 */
  const handleSubmitArtappm = (sttusCode: "01" | "02" | "03") => {
    if (!proId) {
      showAlert("알림", "지원사업을 선택하고 학생을 선택해주세요.", "danger");
      return;
    }
    if (!effectiveReqEsntlId) {
      showAlert("알림", "학생을 선택한 후 저장해 주세요.", "danger");
      return;
    }
    if (AuthService.getUserSe() === "SNR" && !selectedParentId) {
      showAlert("알림", "보호자를 선택해 주세요.", "danger");
      return;
    }
    if (isProGb05Or07 && (!selectedProSeq05 || selectedProSeq05 === "0")) {
      showAlert(
        "알림",
        isProGb07
          ? "탐방국가(일정)을 선택해 주세요."
          : "강연(회차)을 선택해 주세요.",
        "danger",
      );
      return;
    }
    /** 공고 진입: 저장/신청 전 해당 학생+proId 기존 신청 여부 확인. 있으면 막고 MY PAGE 안내 */
    if (!fromMypage) {
      // 다회 신청 가능 사업은 학생+proId만으로 선차단하면 안 됨(03은 상담일자+장소/시간, 05·07은 회차/탐방 슬롯으로 구분).
      // 중복 차단은 저장 시 백엔드에서 슬롯 기준으로 처리한다.
      if (isProGb03 || isProGb05Or07) {
        if (isProGb03) {
          if (!consultDate?.trim()) {
            consultFocusAfterAlertRef.current = "consultDate";
            showAlert(
              "안내",
              "해당 일자에 알맞은 장소 및 시간이 존재하지 않습니다.",
              "danger",
            );
            return;
          }
          if (!consultPlaceTime?.trim() || consultPlaceTime === "0") {
            consultFocusAfterAlertRef.current = "consultPlaceTime";
            showAlert(
              "안내",
              "해당 일자에 알맞은 장소 및 시간이 존재하지 않습니다.",
              "danger",
            );
            return;
          }
        }
        runInsert(sttusCode);
        return;
      }
      const params = new URLSearchParams({
        proId,
        reqEsntlId: effectiveReqEsntlId,
      });
      apiClient
        .get<{ detail?: Record<string, unknown> }>(
          `${API_ENDPOINTS.USER_ARTAPPM.BY_STUDENT}?${params}`,
        )
        .then((res) => {
          if (res.detail) {
            showAlert(
              "알림",
              "수정은 MY PAGE에서만 가능합니다.\n이미 신청 완료된 지원사업은 수정할 수 없습니다.",
              "danger",
            );
            return;
          }
          runInsert(sttusCode);
        })
        .catch(() => runInsert(sttusCode));
      return;
    }
    if (!canSaveOrApply) {
      showAlert(
        "알림",
        "이미 신청 완료된 지원사업은 수정할 수 없습니다.",
        "danger",
      );
      return;
    }
    /** 03 공공형: 상담일자·장소 및 시간 필수 (임시저장/신청 공통, proSeq 정상 전송 방지) */
    if (isProGb03) {
      if (!consultDate?.trim()) {
        consultFocusAfterAlertRef.current = "consultDate";
        showAlert(
          "안내",
          "해당 일자에 알맞은 장소 및 시간이 존재하지 않습니다.",
          "danger",
        );
        return;
      }
      if (!consultPlaceTime?.trim() || consultPlaceTime === "0") {
        consultFocusAfterAlertRef.current = "consultPlaceTime";
        showAlert(
          "안내",
          "해당 일자에 알맞은 장소 및 시간이 존재하지 않습니다.",
          "danger",
        );
        return;
      }
    }
    runInsert(sttusCode);
  };

  const runInsert = (sttusCode: "01" | "02" | "03" | "99") => {
    /** pEsntlId=보호자. REQ_ESNTL_ID(reqEsntlIdForInsert)는 로그인(신청) 주체 */
    const isStudentApplicant = AuthService.getUserSe() === "SNR";
    const pEsntlId = isStudentApplicant
      ? (selectedParentId ?? "")
      : (AuthService.getEsntlId() ?? "");
    /** REQ_ESNTL_ID = 실제 신청(로그인) 주체. 마이페이지 목록은 이 값으로 조회됨 */
    const reqEsntlIdForInsert = AuthService.getEsntlId() ?? "";
    /** 03 공공형: 장소/시간=선택 일정 PRO_SEQ. 05: 선택 회차 PRO_SEQ(임시저장/신청 시 artappm proSeq로 저장). 그 외: 기존 loadedProSeq */
    const proSeqRaw = isProGb03
      ? consultPlaceTime &&
        consultPlaceTime.trim() !== "" &&
        consultPlaceTime !== "0"
        ? consultPlaceTime.trim()
        : loadedProSeq && loadedProSeq !== ""
          ? loadedProSeq
          : consultPlaceTime || "0"
      : isProGb05Or07
        ? /** MY PAGE 수정 시에도 화면에서 선택한 회차(selectedProSeq05)를 우선 전송 (loadedProSeq만 쓰면 회차 변경이 서버까지 안 감) */
          selectedProSeq05 && selectedProSeq05 !== ""
          ? selectedProSeq05
          : loadedProSeq && loadedProSeq !== ""
            ? loadedProSeq
            : "0"
        : loadedProSeq && loadedProSeq !== ""
          ? loadedProSeq
          : "0";
    const proSeq = String(proSeqRaw);

    const fileId = existingFiles[0]?.fileId ?? "";

    /** 전송할 파일: 03/05는 가변 여러 개, 02는 seq 1~5 고정 */
    const pendingSeqs =
      isProGb03 || isProGb05Or07
        ? []
        : [1, 2, 3, 4, 5].filter((seq) => pendingFilesBySeq[seq] != null);
    const fileSeqs =
      !isProGb03 && !isProGb05Or07 && pendingSeqs.length > 0
        ? pendingSeqs
        : undefined;
    const filesToSend = isProGb03
      ? [...pendingAttachFilesCt]
      : isProGb05Or07
        ? pendingAttachFiles05.map((p) => p.file)
        : pendingSeqs.map((seq) => pendingFilesBySeq[seq]!);

    /** 03 공공형 진로진학: REQ_DESC에는 요청사항(목적/활동내용/기타처럼) 평문만 저장. 상담분야·일자·장소는 PRO_TYPE·WORK_DT·PRO_SEQ로 전달 */
    const reqDescValue = isProGb03 ? (requestDesc ?? "").trim() : "";

    /** 03 공공형: 상담분야(consultField 01/02/03) → PRO_TYPE, 상담일자(consultDate) → WORK_DT, RESULT_GB=N. 수정 시 reqId 포함(PRO_SEQ 변경에 안전). */
    const data: Record<string, unknown> = {
      ...(loadedReqId ? { reqId: loadedReqId } : {}),
      proId,
      proSeq,
      proGb: proGb ?? "",
      reqEsntlId: reqEsntlIdForInsert,
      cEsntlId: effectiveReqEsntlId,
      proType: isProGb03 ? consultField || "01" : "01",
      pEsntlId,
      headNm: isProGb03 ? "" : householdName,
      pUserNm: guardianName,
      mbtlnum: guardianContact?.replace(/\D/g, "") ?? "",
      brthdy: studentBirth ? studentBirth.replace(/-/g, "").slice(0, 8) : "",
      pIhidnum: guardianId?.replace(/\D/g, "") ?? "",
      cIhidnum: studentId?.replace(/\D/g, "") ?? "",
      certYn: "Y",
      schoolId: schoolId ?? "",
      schoolGb: schoolGb ?? "",
      schoolNm: schoolNm ?? "",
      schoolLvl: schoolLvl ? parseInt(schoolLvl, 10) : 0,
      schoolNo: schoolNo ? parseInt(schoolNo, 10) : 0,
      payBankCode: isProGb03 ? "" : payBankCode,
      payBank: isProGb03 ? "" : payBank,
      holderNm: isProGb03 ? "" : holderNm,
      reqPart: "",
      playPart: "",
      reqObj: "",
      reqPlay: "",
      reqPlan: "",
      mchilYn: isProGb03 ? "N" : multiChildYn,
      mchilNm: isProGb03 ? "" : multiChildText,
      reqDesc: reqDescValue,
      fileId,
      fileSeqs,
      resultGb: isProGb03 ? "N" : "",
      workDt:
        isProGb03 && consultDate
          ? consultDate.replace(/\D/g, "").slice(0, 8)
          : "",
      sttusCode,
    };

    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
      "data.json",
    );
    /** 03·05·07: PRO_SEQ JSON 누락/바인딩 이슈 시 보정용 별도 파트 */
    if ((isProGb03 || isProGb05Or07) && proSeq && proSeq !== "0") {
      formData.append("proSeq", proSeq);
    }
    filesToSend.forEach((file) => {
      formData.append("artappmFiles", file);
    });

    const isUpdate = fromMypage && loadedReqId && loadedReqId.trim() !== "";
    const submit = isUpdate
      ? apiClient.put<{ result?: string; message?: string }>(
          API_ENDPOINTS.USER_ARTAPPM.UPDATE_BY_REQ_ID(loadedReqId.trim()),
          formData,
        )
      : apiClient.post<{ result?: string; message?: string }>(
          API_ENDPOINTS.USER_ARTAPPM.INSERT,
          formData,
        );
    submit
      .then((res) => {
        const result = res?.result ?? "";
        if (result === "50") {
          showAlert(
            "알림",
            (res as { message?: string })?.message ??
              (isUpdate
                ? "수정은 MY PAGE에서만 가능합니다."
                : "동일한 지원사업 신청 건이 이미 존재합니다."),
            "danger",
          );
          /** 중복(50) 시 기존 건 상세를 다시 불러오지 않음 — BY_STUDENT/BY_REQ_ID 응답의 sttusCode를 쓰면 공고 폼의 loadedSttusCode가 덮여 임시저장·신청 버튼이 잘못 비활성화됨 */
          return;
        }
        if (result === "00") {
          if (sttusCode === "99") {
            showAlert("취소 완료", "신청이 취소되었습니다.", "success");
            setLoadedSttusCode("99");
            setShowCancelConfirm(false);
            if (fromMypage) {
              afterAlertCloseRef.current = () =>
                router.push("/userWeb/mypagePr");
            }
            return;
          }
          if (sttusCode === "02" || sttusCode === "03") {
            showAlert("신청 완료", "신청이 완료되었습니다.", "success");
            setLoadedSttusCode(sttusCode);
          } else {
            showAlert("임시저장", "임시저장되었습니다.", "success");
            setLoadedSttusCode("01");
          }
          setPendingFilesBySeq({});
          setPendingAttachFilesCt([]);
          setPendingAttachFiles05([]);
          /** 지원사업(공고) 경유 진입 시: 완료 모달 확인 후 메인으로 이동(쿼리 유지) */
          if (!fromMypage) {
            const reqGbPosition = searchParams.get("reqGbPosition");
            const typeParam = searchParams.get("type");
            const q = new URLSearchParams();
            if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
            if (typeParam === "parent") q.set("type", "parent");
            const mainUrl =
              "/userWeb/main" + (q.toString() ? "?" + q.toString() : "");
            afterAlertCloseRef.current = () => router.push(mainUrl);
            return;
          }
          afterAlertCloseRef.current = () => router.push("/userWeb/mypagePr");
          return;
        }
        showAlert(
          "알림",
          res?.message ?? "처리 중 오류가 발생했습니다.",
          "danger",
        );
      })
      .catch(() => {
        showAlert("알림", "저장 중 오류가 발생했습니다.", "danger");
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    /** 최종 신청 상태값 정책: 03/05만 승인(03), 07은 신청(02) */
    handleSubmitArtappm(isProGb03 || proGb === "05" ? "03" : "02");
  };

  /** fromMypage일 때 탭·모달 (gunsan apply_pr와 동일) */
  const [activeTab, setActiveTab] = useState<MypageTab>("applyInfo");
  /** 수강확인증 목록 조회: fromMypage + 수강확인증 탭. reqId 전용(searchReqId) */
  useEffect(() => {
    if (
      !fromMypage ||
      activeTab !== "cert" ||
      !API_ENDPOINTS.USER_ARTAPPM.STUDY_CERT_LIST
    ) {
      if (!fromMypage) setStudyCertList([]);
      return;
    }
    if (!loadedReqId) {
      setStudyCertList([]);
      return;
    }
    const body = { searchReqId: loadedReqId };
    apiClient
      .post<{
        result?: string;
        data?: typeof studyCertList;
        recordsTotal?: number;
      }>(API_ENDPOINTS.USER_ARTAPPM.STUDY_CERT_LIST, body)
      .then((res) => {
        if (res?.result === "00" && Array.isArray(res.data)) {
          setStudyCertList(res.data);
        } else {
          setStudyCertList([]);
        }
      })
      .catch(() => setStudyCertList([]));
  }, [fromMypage, activeTab, loadedReqId]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  /** 변경이력 목록 (API: f_changlist). 날짜·내용만 표시 */
  const [changeList, setChangeList] = useState<
    { chgDt?: string; chgDesc?: string }[]
  >([]);
  const [changeListLoading, setChangeListLoading] = useState(false);
  const [regCertModalOpen, setRegCertModalOpen] = useState(false);
  /** 반려 모달(멘토일지 fromMentorWork): 사유 textarea만 표시 */
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaveLoading, setRejectSaveLoading] = useState(false);
  /** 수강확인증 등록 모달: 일자(오늘 고정), 내용(FILE_DESC), 첨부파일 1개. null=등록 모드, 있음=상세/수정 모드 */
  const [studyCertDetailSeq, setStudyCertDetailSeq] = useState<number | null>(
    null,
  );
  /** 상세 모드일 때 기존 파일 정보 (보기 링크·파일명 표시) */
  const [detailFileInfo, setDetailFileInfo] = useState<{
    fileId: string;
    seq: number;
    orgfNm?: string;
  } | null>(null);
  const [certDate, setCertDate] = useState("");
  const [certFileDesc, setCertFileDesc] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [studyCertSubmitting, setStudyCertSubmitting] = useState(false);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  /** 멘토정보 첨부파일 업로드용 hidden input (멘토일지에서만 사용) */
  const mentorInfoFileInputRef = useRef<HTMLInputElement>(null);
  /** 멘토정보 첨부파일 업로드 중 */
  const [mentorInfoFileLoading, setMentorInfoFileLoading] = useState(false);
  /** 멘토정보 첨부파일 삭제 중인 항목 "fileId-seq" (해당 행 삭제 버튼 비활성화) */
  const [mentorInfoDeletingKey, setMentorInfoDeletingKey] = useState<
    string | null
  >(null);
  /** 수강확인증 유효성 알림 확인 후 포커스할 대상 */
  const studyCertFocusAfterAlertRef = useRef<"certText" | "certFile" | null>(
    null,
  );
  /** proGb=03 저장/신청 전 상담일자·장소 및 시간 검증 실패 시 포커스할 필드 */
  const consultFocusAfterAlertRef = useRef<
    "consultDate" | "consultPlaceTime" | null
  >(null);
  /** 수강확인증 삭제 확인 모달 (seq만 전달, DELETE study-cert API) */
  const [studyCertToDelete, setStudyCertToDelete] = useState<{
    seq: number;
  } | null>(null);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  /** 학교검색으로 선택한 학교 코드 → 해당 학교 학년/반 옵션 (관리자페이지와 동일) */
  const [schoolId, setSchoolId] = useState("");
  const [classListForSchool, setClassListForSchool] = useState<
    { grade?: string; classNm?: string }[]
  >([]);
  const [gradeOptions, setGradeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [classOptions, setClassOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [classLoading, setClassLoading] = useState(false);

  /** 학년 변경 시 해당 학년 반 목록으로 classOptions 갱신 */
  useEffect(() => {
    if (!schoolId || !schoolLvl || classListForSchool.length === 0) {
      if (!schoolId) setClassOptions([]);
      return;
    }
    const filtered = classListForSchool.filter(
      (item) =>
        String(parseInt((item.grade ?? "").replace(/\D/g, ""), 10) || 0) ===
        schoolLvl,
    );
    const opts = filtered.map((item) => ({
      value: String(parseClassNumber(item.classNm ?? "")),
      label: formatClassLabel(item.classNm ?? ""),
    }));
    setClassOptions(opts);
    setSchoolNo((prev) => {
      const values = new Set(opts.map((o) => o.value));
      return values.has(prev) ? prev : "";
    });
  }, [schoolId, schoolLvl, classListForSchool]);

  const openHistoryModal = useCallback(() => {
    setHistoryModalOpen(true);
    if (typeof document !== "undefined")
      document.body.style.overflow = "hidden";
    if (!loadedReqId && (!proId || !selectedStudentId)) {
      setChangeList([]);
      return;
    }
    setChangeListLoading(true);
    setChangeList([]);
    const url = loadedReqId
      ? API_ENDPOINTS.USER_ARTAPPM.CHANGE_LIST_BY_REQ_ID(loadedReqId)
      : `${API_ENDPOINTS.USER_ARTAPPM.CHANGE_LIST_BASE}/${encodeURIComponent(proId!)}/${encodeURIComponent(loadedProSeq ?? "0")}/${encodeURIComponent(selectedStudentId!)}/change-list`;
    apiClient
      .get<{ result?: string; data?: { chgDt?: string; chgDesc?: string }[] }>(
        url,
      )
      .then((res) => {
        if (res?.result === "00" && Array.isArray(res.data)) {
          setChangeList(res.data);
        } else {
          setChangeList([]);
        }
      })
      .catch(() => setChangeList([]))
      .finally(() => setChangeListLoading(false));
  }, [loadedReqId, proId, loadedProSeq, selectedStudentId]);
  const closeHistoryModal = () => {
    setHistoryModalOpen(false);
    if (typeof document !== "undefined") document.body.style.overflow = "";
  };
  const openRegCertModal = () => {
    setStudyCertDetailSeq(null);
    setDetailFileInfo(null);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setCertDate(`${yyyy}-${mm}-${dd}`);
    setCertFileDesc("");
    setCertFile(null);
    if (certFileInputRef.current) certFileInputRef.current.value = "";
    setRegCertModalOpen(true);
    if (typeof document !== "undefined")
      document.body.style.overflow = "hidden";
  };
  const closeRegCertModal = () => {
    setRegCertModalOpen(false);
    setStudyCertDetailSeq(null);
    setDetailFileInfo(null);
    if (typeof document !== "undefined") document.body.style.overflow = "";
  };
  const openRejectModal = () => {
    setRejectReason(mentorReaDesc ?? "");
    setRejectModalOpen(true);
    if (typeof document !== "undefined")
      document.body.style.overflow = "hidden";
  };
  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectReason("");
    if (typeof document !== "undefined") document.body.style.overflow = "";
  };
  /** 수강확인증 상세 조회 후 모달 열기 (reqId만 사용) */
  const openStudyCertDetailModal = async (
    row: (typeof studyCertList)[number],
  ) => {
    if (row.seq == null) return;
    if (!loadedReqId) {
      setAlertTitle("안내");
      setAlertMessage(
        "조회를 진행할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.",
      );
      setAlertType("danger");
      setShowAlertModal(true);
      return;
    }
    const url = API_ENDPOINTS.USER_ARTAPPM.STUDY_CERT_BY_REQ_ID(
      loadedReqId,
      row.seq,
    );
    try {
      const res = await apiClient.get<{
        result?: string;
        detail?: {
          uploadDttm?: string;
          fileDesc?: string;
          fileId?: string;
          seq?: number;
          orgfNm?: string;
        };
      }>(url);
      if (res?.result !== "00" || !res?.detail) {
        setAlertTitle("안내");
        setAlertMessage(
          res?.result === "40"
            ? "등록된 수강확인증이 없습니다."
            : "조회에 실패했습니다.",
        );
        setAlertType("danger");
        setShowAlertModal(true);
        return;
      }
      const d = res.detail;
      const ud = d.uploadDttm ? new Date(d.uploadDttm) : null;
      const dateStr = ud
        ? `${ud.getFullYear()}-${String(ud.getMonth() + 1).padStart(2, "0")}-${String(ud.getDate()).padStart(2, "0")}`
        : "";
      setCertDate(dateStr);
      setCertFileDesc(d.fileDesc ?? "");
      setCertFile(null);
      if (certFileInputRef.current) certFileInputRef.current.value = "";
      setDetailFileInfo(
        d.fileId != null && d.seq != null
          ? {
              fileId: String(d.fileId),
              seq: d.seq,
              orgfNm: d.orgfNm,
            }
          : null,
      );
      setStudyCertDetailSeq(row.seq);
      setRegCertModalOpen(true);
      if (typeof document !== "undefined")
        document.body.style.overflow = "hidden";
    } catch {
      setAlertTitle("안내");
      setAlertMessage("조회 중 오류가 발생했습니다.");
      setAlertType("danger");
      setShowAlertModal(true);
    }
  };
  /** 수강확인증 등록(신규) 또는 수정(상세) API. 내용·파일 필수. */
  const submitStudyCert = async () => {
    if (!proId || !selectedStudentId) return;
    const proSeqNorm = loadedProSeq || "0";
    const isEdit = studyCertDetailSeq != null;
    if (!certFileDesc?.trim()) {
      studyCertFocusAfterAlertRef.current = "certText";
      setAlertTitle("안내");
      setAlertMessage("내용을 입력해주세요.");
      setAlertType("danger");
      setShowAlertModal(true);
      return;
    }
    const hasFile = certFile != null && certFile.size > 0;
    const hasExistingFile = isEdit && detailFileInfo != null;
    if (!hasFile && !hasExistingFile) {
      studyCertFocusAfterAlertRef.current = "certFile";
      setAlertTitle("안내");
      setAlertMessage("수강확인증 파일을 선택해주세요.");
      setAlertType("danger");
      setShowAlertModal(true);
      return;
    }
    setStudyCertSubmitting(true);
    try {
      const formData = new FormData();
      const dataPayload: {
        fileDesc?: string;
        uploadDttm?: string;
        seq?: number;
      } = {
        fileDesc: certFileDesc || "",
        uploadDttm: certDate || undefined,
      };
      if (isEdit) dataPayload.seq = studyCertDetailSeq!;
      formData.append(
        "data",
        new Blob([JSON.stringify(dataPayload)], {
          type: "application/json",
        }),
      );
      if (certFile && certFile.size > 0) {
        formData.append("studyCertFile", certFile);
      }
      if (!loadedReqId) {
        setAlertTitle("안내");
        setAlertMessage(
          "등록·수정을 진행할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.",
        );
        setAlertType("danger");
        setShowAlertModal(true);
        setStudyCertSubmitting(false);
        return;
      }
      const url =
        API_ENDPOINTS.USER_ARTAPPM.STUDY_CERT_PUT_BY_REQ_ID(loadedReqId);
      const res = await apiClient.put<{ result?: string; message?: string }>(
        url,
        formData,
      );
      if (res?.result === "00") {
        setAlertTitle("완료");
        setAlertMessage(
          isEdit
            ? "수강확인증이 수정되었습니다."
            : "수강확인증이 등록되었습니다.",
        );
        setAlertType("success");
        setShowAlertModal(true);
        closeRegCertModal();
        setCertFile(null);
        if (certFileInputRef.current) certFileInputRef.current.value = "";
        const listBody = { searchReqId: loadedReqId! };
        const listRes = await apiClient.post<{
          result?: string;
          data?: typeof studyCertList;
        }>(API_ENDPOINTS.USER_ARTAPPM.STUDY_CERT_LIST, listBody);
        if (listRes?.result === "00" && Array.isArray(listRes.data)) {
          setStudyCertList(listRes.data);
        }
      } else {
        setAlertTitle("안내");
        setAlertMessage(
          res?.message ??
            (isEdit ? "수정에 실패했습니다." : "등록에 실패했습니다."),
        );
        setAlertType("danger");
        setShowAlertModal(true);
      }
    } catch {
      setAlertTitle("안내");
      setAlertMessage(
        studyCertDetailSeq != null
          ? "수정 중 오류가 발생했습니다."
          : "등록 중 오류가 발생했습니다.",
      );
      setAlertType("danger");
      setShowAlertModal(true);
    } finally {
      setStudyCertSubmitting(false);
    }
  };
  /** 수강확인증 1건 삭제 (reqId만 사용, POST by-req-id/study-cert/delete?seq=) */
  const deleteStudyCertOne = async () => {
    if (!studyCertToDelete) return;
    if (!loadedReqId) {
      setAlertTitle("안내");
      setAlertMessage(
        "삭제를 진행할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.",
      );
      setAlertType("danger");
      setShowAlertModal(true);
      setStudyCertToDelete(null);
      return;
    }
    const url = API_ENDPOINTS.USER_ARTAPPM.STUDY_CERT_DELETE_BY_REQ_ID(
      loadedReqId,
      studyCertToDelete.seq,
    );
    try {
      const res = await apiClient.post<{
        result?: string;
        message?: string;
      }>(url);
      if (res?.result === "00") {
        setAlertTitle("완료");
        setAlertMessage("수강확인증이 삭제되었습니다.");
        setAlertType("success");
        setShowAlertModal(true);
        setStudyCertToDelete(null);
        // 삭제 후 수강확인증 목록 API 재호출로 목록·번호(rnum) 갱신 (reqId 사용)
        try {
          const listRes = await apiClient.post<{
            result?: string;
            data?: typeof studyCertList;
          }>(API_ENDPOINTS.USER_ARTAPPM.STUDY_CERT_LIST, {
            searchReqId: loadedReqId,
          });
          if (listRes?.result === "00" && Array.isArray(listRes.data)) {
            setStudyCertList(listRes.data);
          } else {
            setAlertTitle("안내");
            setAlertMessage("목록을 갱신하지 못했습니다. 새로고침해 주세요.");
            setAlertType("danger");
            setShowAlertModal(true);
          }
        } catch {
          setAlertTitle("안내");
          setAlertMessage("목록을 갱신하지 못했습니다. 새로고침해 주세요.");
          setAlertType("danger");
          setShowAlertModal(true);
        }
      } else {
        setAlertTitle("안내");
        setAlertMessage(res?.message ?? "삭제에 실패했습니다.");
        setAlertType("danger");
        setShowAlertModal(true);
      }
    } catch {
      setAlertTitle("안내");
      setAlertMessage("삭제 중 오류가 발생했습니다.");
      setAlertType("danger");
      setShowAlertModal(true);
    } finally {
      setStudyCertToDelete(null);
    }
  };
  const handleOverlayClick = (
    e: React.MouseEvent<HTMLDivElement>,
    onClose: () => void,
  ) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <section className="inner">
      <div className="mainBg">
        {fromMypage && !isProGb03 && proGb === "02" && (
          <div
            className="tabWrapper"
            role="radiogroup"
            aria-label="마이페이지 메뉴 선택"
          >
            <label className="tabLabel">
              <input
                type="radio"
                name="mypageTab"
                value="applyInfo"
                className="tabInput"
                checked={activeTab === "applyInfo"}
                onChange={() => setActiveTab("applyInfo")}
              />
              <div className="tabButton">
                <span
                  className="iconCheck ico_radio_check_on"
                  aria-hidden="true"
                />
                <span>신청정보</span>
              </div>
            </label>
            <label className="tabLabel">
              <input
                type="radio"
                name="mypageTab"
                value="cert"
                className="tabInput"
                checked={activeTab === "cert"}
                onChange={() => setActiveTab("cert")}
              />
              <div className="tabButton">
                <span
                  className="iconCheck ico_radio_check_off"
                  aria-hidden="true"
                />
                <span>수강확인증</span>
              </div>
            </label>
          </div>
        )}

        <div
          id="content_applyInfo"
          className={
            fromMypage
              ? `tabContent ${activeTab === "applyInfo" ? "active" : ""}`
              : ""
          }
        >
          <div className="registrationContainer bizInput">
            <form className="mainForm" onSubmit={handleSubmit}>
              {isProGb05Or07 ? (
                <>
                  <section className="formSection">
                    <div className="sectionHeader">
                      <div className="sectionTitle">학부모정보</div>
                    </div>
                    <div className="formGrid">
                      <div className="formRow split">
                        <div className="fieldUnit">
                          <label
                            htmlFor="guardianNamePr05"
                            className="formLabel"
                          >
                            {AuthService.getUserSe() === "SNR" && (
                              <span className="requiredMark" aria-hidden="true">
                                *
                              </span>
                            )}
                            보호자명
                          </label>
                          <div className="formControl">
                            <input
                              type="text"
                              id="guardianNamePr05"
                              className="inputField bgGray"
                              value={guardianName}
                              readOnly
                              aria-label="보호자명"
                            />
                          </div>
                        </div>
                        <div className="fieldUnit">
                          <label
                            htmlFor="guardianContactPr05"
                            className="formLabel"
                          >
                            연락처
                          </label>
                          <div className="formControl">
                            <input
                              type="tel"
                              id="guardianContactPr05"
                              className="inputField bgGray"
                              value={guardianContact}
                              readOnly
                              aria-label="연락처"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="formRow split">
                        <div className="fieldUnit">
                          <label
                            htmlFor="guardianBirthPr05"
                            className="formLabel"
                          >
                            생년월일
                          </label>
                          <div className="formControl">
                            <input
                              type="date"
                              id="guardianBirthPr05"
                              className="inputField bgGray"
                              value={guardianBirth}
                              readOnly
                              aria-label="생년월일"
                            />
                          </div>
                        </div>
                        <div className="fieldUnit">
                          <label
                            htmlFor="guardianRelationPr05"
                            className="formLabel"
                          >
                            관계
                          </label>
                          <div className="formControl">
                            <input
                              type="text"
                              id="guardianRelationPr05"
                              className="inputField bgGray"
                              value={guardianRelationNm}
                              readOnly
                              aria-label="관계"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="formSection">
                    <div className="sectionHeader">
                      <div className="sectionTitle">학생정보</div>
                    </div>
                    <div className="formGrid">
                      <div className="formRow split">
                        <div className="fieldUnit">
                          <label
                            htmlFor="studentNamePr05"
                            className="formLabel"
                          >
                            <span className="requiredMark" aria-hidden="true">
                              *
                            </span>
                            학생명
                          </label>
                          <div className="formControl">
                            <input
                              type="text"
                              id="studentNamePr05"
                              className="inputField bgGray"
                              readOnly
                              aria-label="학생명"
                              value={
                                AuthService.getUserSe() === "SNR"
                                  ? (studentSelfOption?.userNm ?? "")
                                  : (children.find(
                                      (c) => c.esntlId === selectedStudentId,
                                    )?.userNm ?? "")
                              }
                            />
                          </div>
                        </div>
                        <div className="fieldUnit">
                          <span className="formLabel" id="lblGenderPr05">
                            성별
                          </span>
                          <div
                            className="customGroup formControl"
                            role="radiogroup"
                            aria-labelledby="lblGenderPr05"
                          >
                            <label className="customItem">
                              <input
                                type="radio"
                                name="genderPr05"
                                className="customInput"
                                checked={studentGender === "M"}
                                readOnly
                                aria-readonly="true"
                              />
                              <div className="customBox">
                                <span
                                  className="customIcon"
                                  aria-hidden="true"
                                />
                                <span className="customText">남</span>
                              </div>
                            </label>
                            <label className="customItem">
                              <input
                                type="radio"
                                name="genderPr05"
                                className="customInput"
                                checked={studentGender === "F"}
                                readOnly
                                aria-readonly="true"
                              />
                              <div className="customBox">
                                <span
                                  className="customIcon"
                                  aria-hidden="true"
                                />
                                <span className="customText">여</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="formRow split">
                        <div className="fieldUnit">
                          <label
                            htmlFor="studentContactPr05"
                            className="formLabel"
                          >
                            연락처
                          </label>
                          <div className="formControl">
                            <input
                              type="tel"
                              id="studentContactPr05"
                              className="inputField bgGray"
                              readOnly
                              aria-label="연락처"
                              value={studentContact}
                            />
                          </div>
                        </div>
                        <div className="fieldUnit">
                          <label
                            htmlFor="studentBirthPr05"
                            className="formLabel"
                          >
                            생년월일
                          </label>
                          <div className="formControl">
                            <input
                              type="date"
                              id="studentBirthPr05"
                              className="inputField bgGray"
                              readOnly
                              aria-label="생년월일"
                              value={studentBirth}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="formRow">
                        <span className="formLabel">주소</span>
                        <div className="formControl addressContainer">
                          <div className="inputWithBtn">
                            <input
                              type="text"
                              className="inputField bgGray"
                              readOnly
                              title="주소"
                              aria-label="주소"
                              value={[
                                studentZip && studentAdres
                                  ? `(${studentZip}) ${studentAdres}`
                                  : "",
                                studentDetailAdres,
                              ]
                                .filter((v) => String(v ?? "").trim() !== "")
                                .join(" ")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="formSection">
                    <div className="sectionHeader">
                      <div className="sectionTitle">학교정보</div>
                    </div>
                    <div className="formGrid">
                      <div className="formRow">
                        <span className="formLabel" id="lblSchoolNamePr05">
                          학교명
                        </span>
                        <div className="formControl inputWithBtn">
                          <input
                            type="text"
                            className="inputField bgGray"
                            readOnly
                            title="학교명 및 학년정보"
                            aria-label="학교명 및 학년정보"
                            value={[
                              schoolNm,
                              schoolLvl ? `${schoolLvl}학년` : "",
                              schoolNo ? `${schoolNo}반` : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="formSection">
                    <div className="sectionHeader mb-0">
                      <div className="sectionTitle">
                        {isProGb07 ? "탐방국가" : "강연정보"}
                      </div>
                    </div>
                    <div className="tableWrapper">
                      <table
                        className={
                          isProGb07
                            ? "certTable work lectureTable lectureTableTour"
                            : "certTable work lectureTable"
                        }
                        aria-label={
                          isProGb07
                            ? "탐방국가 목록 선택"
                            : "강연(회차) 목록 선택"
                        }
                      >
                        <caption className="blind">
                          {isProGb07
                            ? "선택, 국가, 지역, 탐방주제, 일정, 인원(명)을 포함한 탐방국가 목록"
                            : "선택, 일시, 분야, 강연자, 주제, 인원(명)을 포함한 강연정보 목록"}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col" className="colSelect" title="선택">
                              <span className="requiredMark" aria-hidden="true">
                                *
                              </span>
                              선택
                            </th>
                            {!isProGb07 && (
                              <th scope="col" title="일시">
                                일시
                              </th>
                            )}
                            {isProGb07 ? (
                              <>
                                <th scope="col" title="국가">
                                  국가
                                </th>
                                <th scope="col" title="지역">
                                  지역
                                </th>
                                <th scope="col" title="탐방주제">
                                  탐방주제
                                </th>
                                <th scope="col" title="일정">
                                  일정
                                </th>
                              </>
                            ) : (
                              <>
                                <th scope="col" title="분야">
                                  분야
                                </th>
                                <th scope="col" title="강연자">
                                  강연자
                                </th>
                                <th scope="col" title="주제">
                                  주제
                                </th>
                              </>
                            )}
                            <th scope="col" title="인원(명)">
                              인원(명)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleList05Loading ? (
                            <tr>
                              <td colSpan={6} className="emptyCell">
                                {isProGb07
                                  ? "탐방국가 목록을 불러오는 중입니다."
                                  : "강연 목록을 불러오는 중입니다."}
                              </td>
                            </tr>
                          ) : scheduleList05.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="emptyCell">
                                {isProGb07
                                  ? "등록된 탐방국가 일정이 없습니다."
                                  : "등록된 강연(회차)이 없습니다."}
                              </td>
                            </tr>
                          ) : (
                            scheduleList05.map((item, i) => {
                              const seqVal = String(item.proSeq ?? i + 1);
                              const isSelected = selectedProSeq05 === seqVal;
                              const isClosedRound = isLectureRoundClosed(item);
                              const dateTimeStr =
                                [item.workDate, item.startTime, item.endTime]
                                  .filter(Boolean)
                                  .join(" ")
                                  .replace(/-/g, ".")
                                  .trim() || "";
                              const countryLabel = String(
                                item.item1 ?? "",
                              ).trim();
                              const tourRowLabel = [
                                countryLabel,
                                String(item.item2 ?? "").trim(),
                                String(item.item3 ?? "").trim(),
                                String(item.item4 ?? "").trim(),
                              ]
                                .filter(Boolean)
                                .join(" ");
                              const radioAria = isProGb07
                                ? `${tourRowLabel || "탐방 일정"} 선택`
                                : `${dateTimeStr} 선택`;
                              return (
                                <tr key={`${item.proSeq ?? i}-${i}`}>
                                  <td className="colSelect">
                                    <label className="customItem">
                                      <input
                                        type="radio"
                                        name="lecturePr05"
                                        className="customInput"
                                        value={seqVal}
                                        checked={isSelected}
                                        onChange={() =>
                                          setSelectedProSeq05(seqVal)
                                        }
                                        disabled={
                                          isReadOnlyForm || isClosedRound
                                        }
                                        aria-label={radioAria}
                                      />
                                      <span className="customBox">
                                        <span
                                          className="customIcon"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    </label>
                                  </td>
                                  {!isProGb07 && <td>{dateTimeStr}</td>}
                                  {isProGb07 ? (
                                    <>
                                      <td>{item.item1 ?? ""}</td>
                                      <td>{item.item2 ?? ""}</td>
                                      <td>{item.item3 ?? ""}</td>
                                      <td>{item.item4 ?? ""}</td>
                                    </>
                                  ) : (
                                    <>
                                      <td>{item.item1 ?? ""}</td>
                                      <td>{item.item2 ?? ""}</td>
                                      <td>{item.item3 ?? ""}</td>
                                    </>
                                  )}
                                  <td>
                                    {item.applyCntStr ?? item.recCnt ?? ""}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="formSection">
                    <div className="sectionHeader">
                      <div className="sectionTitle">첨부파일</div>
                    </div>
                    <div className="formGrid">
                      <div className="formRow">
                        <span className="formLabel">
                          첨부파일
                          {canSaveOrApply && !isReadOnlyForm && (
                            <>
                              <input
                                ref={fileInput05Ref}
                                type="file"
                                className="hiddenInput"
                                id={fileInput05Id}
                                accept=".hwp,.hwpx,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                                multiple
                                onChange={handleFileSelect05}
                                aria-label="첨부파일 추가"
                              />
                              <label
                                htmlFor={fileInput05Id}
                                className="btnFileAdd"
                                aria-label="첨부파일 추가"
                              >
                                <img
                                  src={`${ICON}/ico_file_add.png`}
                                  alt=""
                                  aria-hidden="true"
                                />
                              </label>
                            </>
                          )}
                        </span>
                        <div className="formControl fileListContainer">
                          {existingFiles.length === 0 &&
                          pendingAttachFiles05.length === 0 ? (
                            <span className="fileListEmpty">
                              첨부된 파일이 없습니다.
                            </span>
                          ) : (
                            <>
                              {existingFiles.map((file) => {
                                const viewUrl = `${API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? ""}/api/v1/files/view?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                                const fileLabel =
                                  file.orgfNm ?? `파일 ${file.seq}`;
                                const typeClass = getFileTypeClass(
                                  file.orgfNm ?? "",
                                );
                                return (
                                  <div
                                    key={`${file.fileId}-${file.seq}`}
                                    className={`file ${typeClass}`.trim()}
                                  >
                                    <span>
                                      <a
                                        href={viewUrl}
                                        className="fileLink"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          void downloadWaterbAttachmentOrOpenView(
                                            file.fileId,
                                            file.seq,
                                            viewUrl,
                                            fileLabel || undefined,
                                          );
                                        }}
                                      >
                                        {fileLabel}
                                      </a>
                                    </span>
                                    {canSaveOrApply && !isReadOnlyForm && (
                                      <button
                                        type="button"
                                        className="btnFileDel"
                                        aria-label={`${fileLabel} 파일 삭제`}
                                        onClick={(ev) => {
                                          ev.preventDefault();
                                          ev.stopPropagation();
                                          setFileToDelete({
                                            fileId: file.fileId,
                                            seq: file.seq,
                                          });
                                          setShowDeleteFileConfirm(true);
                                        }}
                                      >
                                        <img
                                          src={`${ICON}/ico_file_del.png`}
                                          alt=""
                                          aria-hidden="true"
                                        />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {pendingAttachFiles05.map(({ id, file }) => (
                                <div
                                  key={id}
                                  className={`file ${getFileTypeClass(file.name)}`.trim()}
                                >
                                  <span>{file.name}</span>
                                  {canSaveOrApply && !isReadOnlyForm && (
                                    <button
                                      type="button"
                                      className="btnFileDel"
                                      aria-label={`${file.name} 파일 제거`}
                                      onClick={() => {
                                        setPendingAttachFiles05((prev) =>
                                          prev.filter((p) => p.id !== id),
                                        );
                                      }}
                                    >
                                      <img
                                        src={`${ICON}/ico_file_del.png`}
                                        alt=""
                                        aria-hidden="true"
                                      />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <section className="formSection">
                    <div className="sectionHeader">
                      <div className="sectionTitle">학부모정보</div>
                      {fromMypage && !isProGb03 && (
                        <button
                          type="button"
                          className="btnPr btnHistory"
                          id="btnHistory"
                          onClick={openHistoryModal}
                        >
                          변경이력
                        </button>
                      )}
                    </div>
                    <div className="formGrid">
                      {isProGb03 ? (
                        <>
                          <div className="formRow split">
                            <div className="fieldUnit">
                              <label
                                htmlFor="guardianName"
                                className="formLabel"
                              >
                                보호자명
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="guardianName"
                                  className="inputField bgGray"
                                  value={guardianName}
                                  readOnly
                                  aria-label="보호자명"
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label
                                htmlFor="guardianContact"
                                className="formLabel"
                              >
                                연락처
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="guardianContact"
                                  className="inputField bgGray"
                                  value={guardianContact}
                                  readOnly
                                  aria-label="연락처"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="formRow">
                            <div className="fieldUnit">
                              <label
                                htmlFor="guardianBirth"
                                className="formLabel"
                              >
                                생년월일
                              </label>
                              <div className="formControl">
                                <input
                                  type="date"
                                  id="guardianBirth"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="생년월일"
                                  aria-readonly="true"
                                  value={guardianBirth}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="formRow split">
                            <div className="fieldUnit">
                              <label
                                htmlFor="guardianName"
                                className="formLabel"
                              >
                                보호자명
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="guardianName"
                                  className="inputField bgGray"
                                  value={guardianName}
                                  readOnly
                                  aria-label="보호자명"
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label
                                htmlFor="householdName"
                                className="formLabel"
                              >
                                세대주명
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="householdName"
                                  className={`inputField ${isReadOnlyForm ? "bgGray" : ""}`}
                                  placeholder="세대주명을 입력해주세요"
                                  value={householdName}
                                  onChange={(e) =>
                                    setHouseholdName(e.target.value)
                                  }
                                  readOnly={isReadOnlyForm}
                                  aria-label="세대주명"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="formRow split">
                            <div className="fieldUnit">
                              <label
                                htmlFor="guardianContact"
                                className="formLabel"
                              >
                                전화번호
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="guardianContact"
                                  className="inputField bgGray"
                                  value={guardianContact}
                                  readOnly
                                  aria-label="전화번호"
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label htmlFor="guardianId" className="formLabel">
                                주민번호
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="guardianId"
                                  className="inputField bgGray"
                                  value={maskIhidnum(guardianId)}
                                  readOnly
                                  aria-label="주민번호"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="formRow">
                            <span className="formLabel">계좌번호</span>
                            <div className="formControl accountGroup">
                              <select
                                className="selectField"
                                aria-label="은행 선택"
                                value={payBankCode}
                                onChange={(e) => setPayBankCode(e.target.value)}
                              >
                                <option value="">은행 선택</option>
                                {bankOptions.map((item, idx) => (
                                  <option
                                    key={
                                      item.code
                                        ? `${item.code}-${idx}`
                                        : `bank-${idx}`
                                    }
                                    value={item.code ?? ""}
                                  >
                                    {item.codeNm ?? item.code ?? ""}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                className="inputField"
                                placeholder="예금주를 입력해주세요"
                                aria-label="예금주"
                                value={holderNm}
                                onChange={(e) => setHolderNm(e.target.value)}
                              />
                              <input
                                type="text"
                                className="inputField"
                                placeholder="계좌번호를 입력해주세요"
                                aria-label="계좌번호"
                                value={payBank}
                                onChange={(e) => setPayBank(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="formRow">
                            <span className="formLabel">다자녀 가구 여부</span>
                            <div className="formControl group">
                              <div
                                className="customGroup"
                                role="radiogroup"
                                aria-label="다자녀 가구 여부"
                              >
                                <label className="customItem">
                                  <input
                                    type="radio"
                                    name="multiChild"
                                    className="customInput"
                                    value="Y"
                                    checked={multiChildYn === "Y"}
                                    onChange={() => setMultiChildYn("Y")}
                                  />
                                  <div className="customBox">
                                    <span
                                      className="customIcon"
                                      aria-hidden="true"
                                    />
                                    <span className="customText">해당</span>
                                  </div>
                                </label>
                                <label className="customItem">
                                  <input
                                    type="radio"
                                    name="multiChild"
                                    className="customInput"
                                    value="N"
                                    checked={multiChildYn === "N"}
                                    onChange={() => setMultiChildYn("N")}
                                  />
                                  <div className="customBox">
                                    <span
                                      className="customIcon"
                                      aria-hidden="true"
                                    />
                                    <span className="customText">해당없음</span>
                                  </div>
                                </label>
                              </div>
                              <input
                                type="text"
                                className="inputField inlineInput"
                                placeholder="자녀 수 입력"
                                aria-label="자녀 수"
                                value={multiChildText}
                                onChange={(e) =>
                                  setMultiChildText(e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                  <section className="formSection">
                    <div className="sectionHeader">
                      <div className="sectionTitle">학생정보</div>
                    </div>
                    <div className="formGrid">
                      {isProGb03 ? (
                        <>
                          <div className="formRow split">
                            <div className="fieldUnit">
                              <label
                                htmlFor={
                                  AuthService.getUserSe() === "SNR"
                                    ? "studentNameReadonlyCt03"
                                    : "studentSelect"
                                }
                                className="formLabel"
                              >
                                <span
                                  className="requiredMark"
                                  aria-hidden="true"
                                >
                                  *
                                </span>
                                학생명
                              </label>
                              <div className="formControl">
                                {AuthService.getUserSe() === "SNR" ? (
                                  <input
                                    type="text"
                                    id="studentNameReadonlyCt03"
                                    className="inputField bgGray"
                                    value={
                                      studentSelfOption?.userNm ??
                                      mentorDisplayStudent?.userNm ??
                                      studentSelectOptions.find(
                                        (c) =>
                                          (c.esntlId ?? "") ===
                                          selectedStudentId,
                                      )?.userNm ??
                                      ""
                                    }
                                    readOnly
                                    aria-readonly="true"
                                    aria-label="학생명"
                                  />
                                ) : (
                                  <select
                                    id="studentSelect"
                                    className={`selectField ${studentSelectLocked ? "bgGray" : ""}`}
                                    value={selectedStudentId}
                                    onChange={(e) =>
                                      setSelectedStudentId(e.target.value)
                                    }
                                    disabled={studentSelectLocked}
                                    aria-label="학생명 선택"
                                  >
                                    <option value="">
                                      이름을 선택해주세요
                                    </option>
                                    {studentSelectOptions.map((c) => (
                                      <option
                                        key={c.esntlId ?? ""}
                                        value={c.esntlId ?? ""}
                                      >
                                        {c.userNm ?? ""}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <span className="formLabel" id="lblGender03">
                                성별
                              </span>
                              <div
                                className="customGroup formControl"
                                role="radiogroup"
                                aria-labelledby="lblGender03"
                              >
                                <label className="customItem">
                                  <input
                                    type="radio"
                                    name="gender03"
                                    className="customInput"
                                    checked={studentGender === "M"}
                                    onChange={() => setStudentGender("M")}
                                    disabled
                                    readOnly
                                    aria-readonly="true"
                                  />
                                  <div className="customBox">
                                    <span
                                      className="customIcon"
                                      aria-hidden="true"
                                    />
                                    <span className="customText">남</span>
                                  </div>
                                </label>
                                <label className="customItem">
                                  <input
                                    type="radio"
                                    name="gender03"
                                    className="customInput"
                                    checked={studentGender === "F"}
                                    onChange={() => setStudentGender("F")}
                                    disabled
                                    readOnly
                                    aria-readonly="true"
                                  />
                                  <div className="customBox">
                                    <span
                                      className="customIcon"
                                      aria-hidden="true"
                                    />
                                    <span className="customText">여</span>
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="formRow split">
                            <div className="fieldUnit">
                              <label
                                htmlFor="studentContact"
                                className="formLabel"
                              >
                                연락처
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="studentContact"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="연락처"
                                  value={studentContact}
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label
                                htmlFor="studentBirth"
                                className="formLabel"
                              >
                                생년월일
                              </label>
                              <div className="formControl">
                                <input
                                  type="date"
                                  id="studentBirth"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="생년월일"
                                  value={studentBirth}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="formRow split">
                            <div className="fieldUnit">
                              <label
                                htmlFor={
                                  AuthService.getUserSe() === "SNR"
                                    ? "studentNameReadonlyPrNon03"
                                    : "studentSelect"
                                }
                                className="formLabel"
                              >
                                <span
                                  className="requiredMark"
                                  aria-hidden="true"
                                >
                                  *
                                </span>
                                학생명
                              </label>
                              <div className="formControl">
                                {AuthService.getUserSe() === "SNR" ? (
                                  <input
                                    type="text"
                                    id="studentNameReadonlyPrNon03"
                                    className="inputField bgGray"
                                    value={
                                      studentSelfOption?.userNm ??
                                      mentorDisplayStudent?.userNm ??
                                      studentSelectOptions.find(
                                        (c) =>
                                          (c.esntlId ?? "") ===
                                          selectedStudentId,
                                      )?.userNm ??
                                      ""
                                    }
                                    readOnly
                                    aria-readonly="true"
                                    aria-label="학생명"
                                  />
                                ) : (
                                  <select
                                    id="studentSelect"
                                    className={`selectField ${studentSelectLocked ? "bgGray" : ""}`}
                                    value={selectedStudentId}
                                    onChange={(e) =>
                                      setSelectedStudentId(e.target.value)
                                    }
                                    disabled={studentSelectLocked}
                                    aria-label="학생명 선택"
                                  >
                                    <option value="">
                                      이름을 선택해주세요
                                    </option>
                                    {studentSelectOptions.map((c) => (
                                      <option
                                        key={c.esntlId ?? ""}
                                        value={c.esntlId ?? ""}
                                      >
                                        {c.userNm ?? ""}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label
                                htmlFor="studentBirth"
                                className="formLabel"
                              >
                                생년월일
                              </label>
                              <div className="formControl">
                                <input
                                  type="date"
                                  id="studentBirth"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="생년월일"
                                  value={studentBirth}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="formRow split">
                            <div className="fieldUnit">
                              <label
                                htmlFor="studentContact"
                                className="formLabel"
                              >
                                연락처
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="studentContact"
                                  className="inputField bgGray"
                                  placeholder="숫자만 입력해주세요"
                                  readOnly
                                  aria-label="연락처"
                                  value={studentContact}
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label htmlFor="studentId" className="formLabel">
                                주민번호
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="studentId"
                                  className="inputField bgGray"
                                  placeholder="주민번호를 입력해주세요"
                                  readOnly
                                  aria-label="주민번호"
                                  value={maskIhidnum(studentId)}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="formRow">
                            <span className="formLabel">주소</span>
                            <div className="formControl addressContainer">
                              <div className="inputWithBtn">
                                <input
                                  type="text"
                                  className="inputField bgGray"
                                  readOnly
                                  title="주소"
                                  aria-label="주소"
                                  value={[
                                    studentZip && studentAdres
                                      ? `(${studentZip}) ${studentAdres}`
                                      : "",
                                    studentDetailAdres,
                                  ]
                                    .filter(
                                      (v) => String(v ?? "").trim() !== "",
                                    )
                                    .join(" ")}
                                />
                                <button
                                  type="button"
                                  className="btnSearch"
                                  style={{ display: "none" }}
                                  aria-hidden
                                >
                                  주소검색
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {isProGb03 && (
                    <section className="formSection">
                      <div className="sectionHeader">
                        <div className="sectionTitle">학교정보</div>
                      </div>
                      <div className="formGrid">
                        <div className="formRow">
                          <span className="formLabel" id="lblSchoolNameCt">
                            학교명
                          </span>
                          <div className="formControl inputWithBtn">
                            <input
                              type="text"
                              className="inputField bgGray"
                              readOnly
                              title="학교명 및 학년정보"
                              aria-label="학교명 및 학년정보"
                              value={[
                                schoolNm,
                                schoolLvl ? `${schoolLvl}학년` : "",
                                schoolNo ? `${schoolNo}반` : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-readonly="true"
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {isProGb03 && (
                    <section className="formSection">
                      <div className="sectionHeader">
                        <div className="sectionTitle">상담정보</div>
                        <button
                          type="button"
                          className="btnPr btnHistory"
                          onClick={() => {
                            const q = new URLSearchParams();
                            if (proId) q.set("proId", proId);
                            q.set("type", getCareerConsultCalendarType(searchParams));
                            const reqGb = searchParams.get("reqGbPosition");
                            if (reqGb) q.set("reqGbPosition", reqGb);
                            router.push(
                              `/userWeb/careerConsulting/calendar?${q.toString()}`,
                            );
                          }}
                          aria-label="접수현황"
                        >
                          접수현황
                        </button>
                      </div>
                      <div className="formGrid">
                        <div className="formRow split">
                          <div className="fieldUnit">
                            <label htmlFor="consultField" className="formLabel">
                              상담분야
                            </label>
                            <div className="formControl">
                              <select
                                id="consultField"
                                className={`selectField ${isReadOnlyForm ? "bgGray" : ""}`}
                                aria-label="상담분야 선택"
                                value={consultField}
                                onChange={(e) =>
                                  setConsultField(e.target.value)
                                }
                                disabled={isReadOnlyForm}
                              >
                                {CONSULT_FIELD_OPTIONS.map((opt) => (
                                  <option
                                    key={opt.value || "empty"}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="fieldUnit">
                            <label htmlFor="consultDate" className="formLabel">
                              <span className="requiredMark" aria-hidden="true">
                                *
                              </span>
                              상담일자
                            </label>
                            <div className="formControl">
                              <input
                                type="date"
                                id="consultDate"
                                className={`inputField ${isReadOnlyForm ? "bgGray" : ""}`}
                                aria-label="상담일자 선택"
                                value={consultDate}
                                onChange={(e) => setConsultDate(e.target.value)}
                                readOnly={isReadOnlyForm}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="formRow">
                          <div className="fieldUnit">
                            <label
                              htmlFor="consultPlaceTime"
                              className="formLabel"
                            >
                              <span className="requiredMark" aria-hidden="true">
                                *
                              </span>
                              장소 및 시간
                            </label>
                            <div className="formControl">
                              <select
                                id="consultPlaceTime"
                                className={`selectField ${isReadOnlyForm ? "bgGray" : ""}`}
                                aria-label="장소 및 시간 선택"
                                value={consultPlaceTime}
                                onChange={(e) =>
                                  setConsultPlaceTime(e.target.value)
                                }
                                disabled={isReadOnlyForm}
                              >
                                {consultPlaceTimeOptions.map((opt) => (
                                  <option
                                    key={opt.value || "empty"}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="formRow">
                          <label htmlFor="requestDesc" className="formLabel">
                            요청사항
                          </label>
                          <div className="formControl">
                            <textarea
                              id="requestDesc"
                              className={`textAreaField ${isReadOnlyForm ? "bgGray" : ""}`}
                              placeholder="요청사항을 입력해주세요"
                              aria-label="요청사항"
                              value={requestDesc}
                              onChange={(e) => setRequestDesc(e.target.value)}
                              readOnly={isReadOnlyForm}
                            />
                          </div>
                        </div>
                        <div className="formRow">
                          <span className="formLabel">
                            첨부파일
                            {canSaveOrApply && !isReadOnlyForm && (
                              <>
                                <input
                                  type="file"
                                  id="attachFilesCt"
                                  className="hiddenInput"
                                  multiple
                                  aria-label="첨부파일 추가"
                                  onChange={(e) => {
                                    const files = e.target.files;
                                    const fileArray = files?.length
                                      ? Array.from(files)
                                      : [];
                                    if (fileArray.length) {
                                      setPendingAttachFilesCt((prev) => [
                                        ...prev,
                                        ...fileArray,
                                      ]);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                                <label
                                  htmlFor="attachFilesCt"
                                  className="btnFileAdd"
                                  aria-label="첨부파일 추가"
                                >
                                  <img
                                    src={`${ICON}/ico_file_add.png`}
                                    alt=""
                                    aria-hidden="true"
                                  />
                                </label>
                              </>
                            )}
                          </span>
                          <div className="formControl fileListContainer">
                            {existingFiles.length === 0 &&
                            pendingAttachFilesCt.length === 0 ? (
                              <span className="fileListEmpty">
                                첨부된 파일이 없습니다.
                              </span>
                            ) : (
                              <>
                                {existingFiles.map((file) => {
                                  const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                                  const fileLabel =
                                    file.orgfNm ?? `파일 ${file.seq}`;
                                  const typeClass = getFileTypeClass(fileLabel);
                                  return (
                                    <div
                                      key={`${file.fileId}-${file.seq}`}
                                      className={`file ${typeClass}`.trim()}
                                    >
                                      <span>
                                        <a
                                          href={viewUrl}
                                          className="fileLink"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            void downloadWaterbAttachmentOrOpenView(
                                              file.fileId,
                                              file.seq,
                                              viewUrl,
                                              fileLabel || undefined,
                                            );
                                          }}
                                        >
                                          {fileLabel}
                                        </a>
                                      </span>
                                      {canSaveOrApply && !isReadOnlyForm && (
                                        <button
                                          type="button"
                                          className="btnFileDel"
                                          aria-label={`${fileLabel} 파일 삭제`}
                                          onClick={(ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            if (!canSaveOrApply) {
                                              showAlert(
                                                "알림",
                                                fromMypage
                                                  ? "이미 신청 완료된 지원사업은 수정할 수 없습니다."
                                                  : "수정은 MY PAGE에서만 가능합니다.\n이미 신청 완료된 지원사업은 수정할 수 없습니다.",
                                                "danger",
                                              );
                                              return;
                                            }
                                            setFileToDelete({
                                              fileId: file.fileId,
                                              seq: file.seq,
                                            });
                                            setShowDeleteFileConfirm(true);
                                          }}
                                        >
                                          <img
                                            src={`${ICON}/ico_file_del.png`}
                                            alt=""
                                            aria-hidden="true"
                                          />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                {pendingAttachFilesCt.map((file, idx) => (
                                  <div
                                    key={`pending-ct-${idx}-${file.name}`}
                                    className={`file ${getFileTypeClass(file.name)}`.trim()}
                                  >
                                    <span>{file.name}</span>
                                    {canSaveOrApply && !isReadOnlyForm && (
                                      <button
                                        type="button"
                                        className="btnFileDel"
                                        aria-label={`${file.name} 파일 제거`}
                                        onClick={() => {
                                          setPendingAttachFilesCt((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                          );
                                        }}
                                      >
                                        <img
                                          src={`${ICON}/ico_file_del.png`}
                                          alt=""
                                          aria-hidden="true"
                                        />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {isProGb03 &&
                    (fromMypage || fromMentorWork) &&
                    effectiveReqId && (
                      <>
                        <section className="formSection">
                          <div className="sectionHeader">
                            <div className="sectionTitle">멘토지정</div>
                          </div>
                          <div className="formGrid">
                            <div className="formRow split">
                              <div className="fieldUnit">
                                <label className="formLabel">멘토명</label>
                                <div className="formControl">
                                  <input
                                    type="text"
                                    className="inputField bgGray"
                                    readOnly
                                    aria-label="멘토명"
                                    value={mentorInfo?.advEsntlNm ?? ""}
                                  />
                                </div>
                              </div>
                              <div className="fieldUnit">
                                <label className="formLabel">연락처</label>
                                <div className="formControl">
                                  <input
                                    type="text"
                                    className="inputField bgGray"
                                    readOnly
                                    aria-label="연락처"
                                    value={mentorInfo?.mbtlnum ?? ""}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="formRow">
                              <label className="formLabel">멘토소개</label>
                              <div className="formControl">
                                <textarea
                                  className="textAreaField bgGray"
                                  readOnly
                                  aria-label="멘토소개"
                                  rows={3}
                                  value={mentorInfo?.profileDesc ?? ""}
                                />
                              </div>
                            </div>
                          </div>
                        </section>
                        <section className="formSection">
                          <div className="sectionHeader">
                            <div className="sectionTitle">멘토정보</div>
                          </div>
                          <div className="formGrid">
                            <div className="formRow split">
                              <div className="fieldUnit">
                                <label className="formLabel">상담장소</label>
                                <div className="formControl">
                                  <input
                                    type="text"
                                    className={`inputField ${fromMentorWork ? "" : "bgGray"}`}
                                    readOnly={!fromMentorWork}
                                    aria-label="상담장소"
                                    value={
                                      fromMentorWork
                                        ? mentorAdvSpace
                                        : (mentorInfo?.advSpace ?? "")
                                    }
                                    onChange={
                                      fromMentorWork
                                        ? (e) =>
                                            setMentorAdvSpace(e.target.value)
                                        : undefined
                                    }
                                  />
                                </div>
                              </div>
                              <div className="fieldUnit">
                                <label className="formLabel">상담시간</label>
                                <div className="formControl">
                                  {fromMentorWork ? (
                                    <div
                                      className="flex items-center gap-1 flex-wrap"
                                      style={{ gap: "0.25rem 0.5rem" }}
                                    >
                                      <select
                                        className="inputField"
                                        style={{ minWidth: "4rem" }}
                                        aria-label="상담 시작 시"
                                        value={getMentorAdvHour(mentorAdvFrom)}
                                        onChange={(e) =>
                                          setMentorAdvFrom(
                                            buildMentorAdvDateTime(
                                              mentorAdvFrom,
                                              consultDate ?? "",
                                              e.target.value,
                                              getMentorAdvMin(mentorAdvFrom),
                                            ),
                                          )
                                        }
                                      >
                                        {MENTOR_HOUR_OPTIONS.map((h) => (
                                          <option key={h} value={h}>
                                            {h}시
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className="inputField"
                                        style={{ minWidth: "4rem" }}
                                        aria-label="상담 시작 분"
                                        value={getMentorAdvMin(mentorAdvFrom)}
                                        onChange={(e) =>
                                          setMentorAdvFrom(
                                            buildMentorAdvDateTime(
                                              mentorAdvFrom,
                                              consultDate ?? "",
                                              getMentorAdvHour(mentorAdvFrom),
                                              e.target.value,
                                            ),
                                          )
                                        }
                                      >
                                        {MENTOR_MINUTE_OPTIONS.map((m) => (
                                          <option key={m} value={m}>
                                            {m}분
                                          </option>
                                        ))}
                                      </select>
                                      <span
                                        className="text-gray-500"
                                        aria-hidden="true"
                                      >
                                        ~
                                      </span>
                                      <select
                                        className="inputField"
                                        style={{ minWidth: "4rem" }}
                                        aria-label="상담 종료 시"
                                        value={getMentorAdvHour(mentorAdvTo)}
                                        onChange={(e) =>
                                          setMentorAdvTo(
                                            buildMentorAdvDateTime(
                                              mentorAdvTo,
                                              consultDate ?? "",
                                              e.target.value,
                                              getMentorAdvMin(mentorAdvTo),
                                            ),
                                          )
                                        }
                                      >
                                        {MENTOR_HOUR_OPTIONS.map((h) => (
                                          <option key={h} value={h}>
                                            {h}시
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className="inputField"
                                        style={{ minWidth: "4rem" }}
                                        aria-label="상담 종료 분"
                                        value={getMentorAdvMin(mentorAdvTo)}
                                        onChange={(e) =>
                                          setMentorAdvTo(
                                            buildMentorAdvDateTime(
                                              mentorAdvTo,
                                              consultDate ?? "",
                                              getMentorAdvHour(mentorAdvTo),
                                              e.target.value,
                                            ),
                                          )
                                        }
                                      >
                                        {MENTOR_MINUTE_OPTIONS.map((m) => (
                                          <option key={m} value={m}>
                                            {m}분
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      className="inputField bgGray"
                                      readOnly
                                      aria-label="상담시간"
                                      value={
                                        mentorInfo?.advFrom != null &&
                                        mentorInfo?.advTo != null
                                          ? `${mentorInfo.advFrom} ~ ${mentorInfo.advTo}`
                                          : (mentorInfo?.advFrom ?? "") ||
                                            (mentorInfo?.advTo ?? "")
                                      }
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="formRow">
                              <label className="formLabel">상담내용</label>
                              <div className="formControl">
                                <textarea
                                  className={`textAreaField ${fromMentorWork ? "" : "bgGray"}`}
                                  readOnly={!fromMentorWork}
                                  aria-label="상담내용"
                                  rows={3}
                                  value={
                                    fromMentorWork
                                      ? mentorAdvDesc
                                      : (mentorInfo?.advDesc ?? "")
                                  }
                                  onChange={
                                    fromMentorWork
                                      ? (e) => setMentorAdvDesc(e.target.value)
                                      : undefined
                                  }
                                />
                              </div>
                            </div>
                            <div className="formRow">
                              <label className="formLabel">사유</label>
                              <div className="formControl">
                                <textarea
                                  className={`textAreaField ${fromMentorWork ? "" : "bgGray"}`}
                                  readOnly
                                  aria-readonly="true"
                                  aria-label="사유"
                                  rows={3}
                                  value={
                                    fromMentorWork
                                      ? mentorReaDesc
                                      : loadedReaDesc
                                  }
                                />
                              </div>
                            </div>
                            <div className="formRow">
                              <span className="formLabel">
                                첨부파일
                                {fromMentorWork && effectiveReqId && (
                                  <>
                                    <input
                                      ref={mentorInfoFileInputRef}
                                      type="file"
                                      id="mentorInfoAttachFiles"
                                      className="hiddenInput"
                                      multiple
                                      accept=".pdf,.hwp,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                                      aria-label="첨부파일 추가"
                                      onChange={handleMentorInfoFileUpload}
                                      disabled={mentorInfoFileLoading}
                                    />
                                    <label
                                      htmlFor="mentorInfoAttachFiles"
                                      className="btnFileAdd"
                                      aria-label="첨부파일 추가"
                                      style={{
                                        pointerEvents: mentorInfoFileLoading
                                          ? "none"
                                          : undefined,
                                        opacity: mentorInfoFileLoading
                                          ? 0.6
                                          : 1,
                                      }}
                                    >
                                      <img
                                        src={`${ICON}/ico_file_add.png`}
                                        alt=""
                                        aria-hidden="true"
                                      />
                                    </label>
                                  </>
                                )}
                              </span>
                              <div className="formControl fileListContainer">
                                {!(
                                  mentorInfo?.files &&
                                  mentorInfo.files.length > 0
                                ) && pendingMentorFiles.length === 0 ? (
                                  <span className="fileListEmpty">
                                    첨부된 파일이 없습니다.
                                  </span>
                                ) : (
                                  <>
                                    {mentorInfo?.files?.map((file) => {
                                      const fileId = String(file.fileId ?? "");
                                      const seq = file.seq ?? 0;
                                      const numFileId = file.fileId ?? 0;
                                      const deletingKey = `${numFileId}-${seq}`;
                                      const isDeleting =
                                        mentorInfoDeletingKey === deletingKey;
                                      const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(seq)}`;
                                      const fileLabel =
                                        file.orgfNm ?? `파일 ${seq}`;
                                      const typeClass =
                                        getFileTypeClass(fileLabel);
                                      return (
                                        <div
                                          key={`${fileId}-${seq}`}
                                          className={`file ${typeClass}`.trim()}
                                        >
                                          <span>
                                            <a
                                              href={viewUrl}
                                              className="fileLink"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                void downloadWaterbAttachmentOrOpenView(
                                                  fileId,
                                                  seq,
                                                  viewUrl,
                                                  fileLabel || undefined,
                                                );
                                              }}
                                            >
                                              {fileLabel}
                                            </a>
                                          </span>
                                          {fromMentorWork && effectiveReqId && (
                                            <button
                                              type="button"
                                              className="btnFileDel"
                                              aria-label={`${fileLabel} 파일 삭제`}
                                              onClick={(ev) => {
                                                ev.preventDefault();
                                                ev.stopPropagation();
                                                handleMentorInfoFileDelete(
                                                  numFileId,
                                                  seq,
                                                );
                                              }}
                                              disabled={isDeleting}
                                            >
                                              <img
                                                src={`${ICON}/ico_file_del.png`}
                                                alt=""
                                                aria-hidden="true"
                                              />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {pendingMentorFiles.map((file, index) => {
                                      const fileLabel = file.name;
                                      const typeClass =
                                        getFileTypeClass(fileLabel);
                                      return (
                                        <div
                                          key={`pending-mentor-${index}-${fileLabel}`}
                                          className={`file ${typeClass}`.trim()}
                                        >
                                          <span>{fileLabel}</span>
                                          <button
                                            type="button"
                                            className="btnFileDel"
                                            aria-label={`${fileLabel} 파일 선택 취소`}
                                            onClick={() =>
                                              setPendingMentorFiles((prev) =>
                                                prev.filter(
                                                  (_, i) => i !== index,
                                                ),
                                              )
                                            }
                                          >
                                            <img
                                              src={`${ICON}/ico_file_del.png`}
                                              alt=""
                                              aria-hidden="true"
                                            />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>
                      </>
                    )}

                  {!isProGb03 && (
                    <>
                      <section className="formSection">
                        <div className="sectionHeader">
                          <div className="sectionTitle">학교정보</div>
                        </div>
                        <div className="formGrid">
                          <div className="formRow">
                            <span className="formLabel" id="lblSchoolNamePr">
                              학교명
                            </span>
                            <div className="formControl inputWithBtn">
                              <input
                                type="text"
                                className="inputField bgGray"
                                readOnly
                                title="학교명 및 학년정보"
                                aria-label="학교명 및 학년정보"
                                value={[
                                  schoolNm,
                                  schoolLvl ? `${schoolLvl}학년` : "",
                                  schoolNo ? `${schoolNo}반` : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-readonly="true"
                              />
                            </div>
                          </div>
                        </div>
                      </section>
                      <section className="formSection">
                        <div className="sectionHeader">
                          <div className="sectionTitle">첨부파일</div>
                        </div>
                        <div className="formGrid">
                          {FILE_ATTACH_ITEMS.map((item) => {
                            const seq = item.seq;
                            const existingForRow = existingFiles.filter(
                              (f) => f.seq === seq,
                            );
                            const pendingForRow = pendingFilesBySeq[seq];
                            const hasAny =
                              existingForRow.length > 0 ||
                              pendingForRow != null;
                            const labelStyle =
                              "labelStyle" in item
                                ? item.labelStyle
                                : undefined;
                            return (
                              <div key={item.id} className="formRow">
                                <span
                                  className="formLabel"
                                  style={
                                    labelStyle as
                                      | React.CSSProperties
                                      | undefined
                                  }
                                >
                                  {item.label}
                                  {canSaveOrApply && (
                                    <>
                                      <input
                                        type="file"
                                        id={item.id}
                                        className="hiddenInput"
                                        aria-label={item.ariaLabel}
                                        onChange={(e) => {
                                          const file =
                                            e.target.files?.[0] ?? null;
                                          handleFileSelectBySeq(seq, file);
                                          e.target.value = "";
                                        }}
                                      />
                                      <label
                                        htmlFor={item.id}
                                        className="btnFileAdd"
                                        aria-label={item.ariaLabel}
                                      >
                                        <img
                                          src={`${ICON}/ico_file_add.png`}
                                          alt=""
                                          aria-hidden="true"
                                        />
                                      </label>
                                    </>
                                  )}
                                </span>
                                <div className="formControl fileListContainer">
                                  {!hasAny ? (
                                    <span className="fileListEmpty">
                                      첨부된 파일이 없습니다.
                                    </span>
                                  ) : (
                                    <>
                                      {existingForRow.map((file) => {
                                        const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                                        const fileLabel =
                                          file.orgfNm ?? `파일 ${file.seq}`;
                                        const typeClass =
                                          getFileTypeClass(fileLabel);
                                        return (
                                          <div
                                            key={`${file.fileId}-${file.seq}`}
                                            className={`file ${typeClass}`.trim()}
                                          >
                                            <span>
                                              <a
                                                href={viewUrl}
                                                className="fileLink"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  void downloadWaterbAttachmentOrOpenView(
                                                    file.fileId,
                                                    file.seq,
                                                    viewUrl,
                                                    fileLabel || undefined,
                                                  );
                                                }}
                                              >
                                                {fileLabel}
                                              </a>
                                            </span>
                                            {canSaveOrApply && (
                                              <button
                                                type="button"
                                                className="btnFileDel"
                                                aria-label={`${fileLabel} 파일 삭제`}
                                                onClick={(ev) => {
                                                  ev.preventDefault();
                                                  ev.stopPropagation();
                                                  setFileToDelete({
                                                    fileId: file.fileId,
                                                    seq: file.seq,
                                                  });
                                                  setShowDeleteFileConfirm(
                                                    true,
                                                  );
                                                }}
                                              >
                                                <img
                                                  src={`${ICON}/ico_file_del.png`}
                                                  alt=""
                                                  aria-hidden="true"
                                                />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {pendingForRow != null && (
                                        <div
                                          className={`file ${getFileTypeClass(pendingForRow.name)}`.trim()}
                                        >
                                          <span>{pendingForRow.name}</span>
                                          {canSaveOrApply && (
                                            <button
                                              type="button"
                                              className="btnFileDel"
                                              aria-label={`${pendingForRow.name} 파일 삭제`}
                                              onClick={() =>
                                                handleFileSelectBySeq(seq, null)
                                              }
                                            >
                                              <img
                                                src={`${ICON}/ico_file_del.png`}
                                                alt=""
                                                aria-hidden="true"
                                              />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
              <div className="formActions">
                {fromMentorWork ? (
                  <>
                    <button
                      type="button"
                      className="btnWhite"
                      onClick={handleSaveMentorInfoTemp}
                      disabled={mentorInfoSaveLoading}
                      aria-label="저장"
                    >
                      {mentorInfoSaveLoading ? "저장 중…" : "저장"}
                    </button>
                    <button
                      type="button"
                      className="btnSubmit"
                      onClick={handleSaveMentorInfo}
                      disabled={
                        mentorInfoSaveLoading || loadedSttusCode === "04"
                      }
                      aria-label="완료"
                    >
                      {mentorInfoSaveLoading ? "완료 중…" : "완료"}
                    </button>
                    <button
                      type="button"
                      className="btnWhite"
                      onClick={openRejectModal}
                      aria-label="반려"
                    >
                      반려
                    </button>
                    <button
                      type="button"
                      className="btnWhite"
                      onClick={() => router.back()}
                      aria-label="닫기"
                    >
                      닫기
                    </button>
                  </>
                ) : (
                  <>
                    {!fromMypage && (
                      <button
                        type="button"
                        className="btnWhite"
                        onClick={handleReset}
                        aria-label={
                          isProGb03
                            ? "학생 선택 및 상담 정보 초기화"
                            : proGb === "05"
                              ? "강연정보 및 첨부파일 초기화"
                              : "세대주명 및 학생 선택 초기화"
                        }
                      >
                        초기화
                      </button>
                    )}
                    <button
                      type="button"
                      className="btnWhite"
                      onClick={() => handleSubmitArtappm("01")}
                      aria-label="임시저장"
                      disabled={!canSaveOrApply}
                    >
                      임시저장
                    </button>
                    <button
                      type="submit"
                      className="btnSubmit"
                      disabled={!canSaveOrApply}
                    >
                      신청
                    </button>
                    {fromMypage && (
                      <button
                        type="button"
                        className="btnSubmit"
                        onClick={() => {
                          if (loadedSttusCode === "99") {
                            showAlert(
                              "알림",
                              "이미 취소된 건입니다.",
                              "danger",
                            );
                            return;
                          }
                          setShowCancelConfirm(true);
                        }}
                        aria-label="신청 취소"
                        disabled={loadedSttusCode === "99"}
                      >
                        취소
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        {fromMypage && proGb === "02" && (
          <div
            id="content_cert"
            className={`tabContent bizInput ${activeTab === "cert" ? "active" : ""}`}
          >
            <div className="certSection">
              <div className="sectionHeader mb-0">
                <div className="sectionTitle">수강 확인증</div>
                <button
                  type="button"
                  className="btnApply btnPr"
                  id="btnRegCert"
                  onClick={openRegCertModal}
                >
                  수강확인증 등록
                </button>
              </div>
              <div className="tableWrapper">
                <table className="certTable">
                  <caption className="blind">
                    번호, 내용, 일자, 상태를 포함한 수강 확인증 목록
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="colNum">
                        번호
                      </th>
                      <th scope="col" className="colContent">
                        내용
                      </th>
                      <th scope="col" className="colDate">
                        일자
                      </th>
                      <th scope="col" className="colState">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studyCertList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="cellEmpty"
                          style={{ textAlign: "center" }}
                        >
                          등록된 수강확인증이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      studyCertList.map((row, idx) => {
                        const uploadDate =
                          row.uploadDttm != null
                            ? typeof row.uploadDttm === "string"
                              ? row.uploadDttm.slice(0, 10)
                              : new Date(row.uploadDttm)
                                  .toISOString()
                                  .slice(0, 10)
                            : "";
                        return (
                          <tr key={`${row.fileId}-${row.seq}-${idx}`}>
                            <td className="cellNum">
                              {row.rnum ?? String(idx + 1)}
                            </td>
                            <td className="cellContent">
                              <div
                                className="ellipsis"
                                title={row.fileDesc ?? ""}
                              >
                                {row.fileDesc ?? ""}
                              </div>
                            </td>
                            <td className="cellDate">{uploadDate}</td>
                            <td className="cellState">
                              <div className="btnGroup">
                                <button
                                  type="button"
                                  className="btnModify"
                                  onClick={() => openStudyCertDetailModal(row)}
                                  aria-label={`${row.fileDesc ?? "수강확인증"} 상세`}
                                >
                                  상세
                                </button>
                                <button
                                  type="button"
                                  className="btnDelete"
                                  onClick={() =>
                                    row.seq != null &&
                                    setStudyCertToDelete({ seq: row.seq })
                                  }
                                  aria-label={`${row.fileDesc ?? "수강확인증"} 삭제`}
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {fromMypage && (
        <>
          <div
            className={`modalOverlay ${historyModalOpen ? "active" : ""}`}
            id="historyModal"
            aria-hidden={!historyModalOpen}
            onClick={(e) => handleOverlayClick(e, closeHistoryModal)}
          >
            <div
              className="modalContent"
              role="dialog"
              aria-labelledby="modalTitle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modalHeader">
                <div id="modalTitle" className="modalTitle">
                  변경이력
                </div>
                <button
                  type="button"
                  className="closeBtn"
                  id="closeHistoryModal"
                  aria-label="닫기"
                  onClick={closeHistoryModal}
                >
                  &times;
                </button>
              </div>
              <div className="modalBody">
                {changeListLoading ? (
                  <p className="historyList" style={{ padding: "16px 0" }}>
                    조회 중...
                  </p>
                ) : (
                  <ul className="historyList">
                    {changeList.length === 0 ? (
                      <li className="historyItem">
                        <div className="historyContent">
                          변경이력이 없습니다.
                        </div>
                      </li>
                    ) : (
                      changeList.map((item, idx) => (
                        <li key={idx} className="historyItem">
                          <div className="historyHeader">
                            <span className="historyDate">
                              {item.chgDt
                                ? formatChangeListDate(item.chgDt)
                                : ""}
                            </span>
                          </div>
                          {item.chgDesc && (
                            <div className="historyContent">{item.chgDesc}</div>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div
            className={`modalOverlay studyCertRegModal ${regCertModalOpen ? "active" : ""}`}
            id="regCertModal"
            aria-hidden={!regCertModalOpen}
            onClick={(e) => handleOverlayClick(e, closeRegCertModal)}
          >
            <div
              className="modalContent"
              role="dialog"
              aria-labelledby="modalTitle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modalHeader">
                <div id="modalTitle">
                  {studyCertDetailSeq != null
                    ? "수강확인증 상세"
                    : "수강확인증 등록"}
                </div>
                <button
                  type="button"
                  className="closeBtn"
                  id="closeRegCertModal"
                  aria-label="닫기"
                  onClick={closeRegCertModal}
                >
                  &times;
                </button>
              </div>
              <div className="modalBody">
                <div className="formGrid bizInput">
                  <div className="formRow">
                    <label htmlFor="certDate" className="formLabel">
                      일자
                    </label>
                    <div className="formControl">
                      <input
                        type="date"
                        id="certDate"
                        className="inputField"
                        title={
                          studyCertDetailSeq != null
                            ? "일자"
                            : "일자 (오늘 날짜 고정)"
                        }
                        value={certDate}
                        readOnly
                        aria-readonly="true"
                      />
                    </div>
                  </div>
                  <div className="formRow">
                    <label htmlFor="certText" className="formLabel">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      내용
                    </label>
                    <div className="formControl">
                      <textarea
                        id="certText"
                        className="textAreaField"
                        placeholder="내용을 입력해주세요"
                        value={certFileDesc}
                        onChange={(e) => setCertFileDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="formRow">
                    <span className="formLabel">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      첨부파일
                      <input
                        ref={certFileInputRef}
                        type="file"
                        id="certFile"
                        className="tabInput"
                        style={{ display: "none" }}
                        accept=".hwp,.hwpx,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z"
                        onChange={(e) =>
                          setCertFile(e.target.files?.[0] ?? null)
                        }
                        disabled={!canSaveOrApply}
                      />
                      {canSaveOrApply && (
                        <label
                          htmlFor="certFile"
                          className="btnFileAdd"
                          style={{ cursor: "pointer", marginLeft: "8px" }}
                        >
                          <img
                            src={`${ICON}/ico_file_add.png`}
                            alt="파일 추가"
                          />
                        </label>
                      )}
                    </span>
                    <div className="formControl addressContainer">
                      {certFile ? (
                        <div
                          className={`file ${getFileTypeClass(certFile.name)}`}
                        >
                          <span>{certFile.name}</span>
                          {canSaveOrApply && (
                            <button
                              type="button"
                              className="btnFileDel"
                              aria-label="파일 삭제"
                              onClick={() => {
                                setCertFile(null);
                                if (certFileInputRef.current)
                                  certFileInputRef.current.value = "";
                              }}
                            >
                              <img src={`${ICON}/ico_file_del.png`} alt="" />
                            </button>
                          )}
                        </div>
                      ) : detailFileInfo ? (
                        <div
                          className={`file ${getFileTypeClass(detailFileInfo.orgfNm ?? "")}`}
                        >
                          <span>
                            {API_CONFIG?.BASE_URL
                              ? (() => {
                                  const certViewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(detailFileInfo.fileId)}&seq=${encodeURIComponent(detailFileInfo.seq)}`;
                                  const certName =
                                    detailFileInfo.orgfNm ?? "첨부파일";
                                  return (
                                    <a
                                      href={certViewUrl}
                                      className="fileLink"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        void downloadWaterbAttachmentOrOpenView(
                                          detailFileInfo.fileId,
                                          detailFileInfo.seq,
                                          certViewUrl,
                                          certName || undefined,
                                        );
                                      }}
                                    >
                                      {certName}
                                    </a>
                                  );
                                })()
                              : (detailFileInfo.orgfNm ?? "첨부파일")}
                          </span>
                        </div>
                      ) : (
                        <span className="filePlaceholder">
                          선택된 파일 없음
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modalFooter">
                  <button
                    type="button"
                    className="btnSubmit"
                    onClick={submitStudyCert}
                    disabled={studyCertSubmitting}
                  >
                    {studyCertSubmitting
                      ? studyCertDetailSeq != null
                        ? "수정 중…"
                        : "등록 중…"
                      : studyCertDetailSeq != null
                        ? "수정하기"
                        : "등록하기"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 반려 모달 (멘토일지 fromMentorWork): 사유 입력 - 수강확인증 모달과 동일 UI(studyCertRegModal) */}
      <div
        className={`modalOverlay studyCertRegModal ${rejectModalOpen ? "active" : ""}`}
        id="rejectModal"
        aria-hidden={!rejectModalOpen}
        onClick={(e) => handleOverlayClick(e, closeRejectModal)}
      >
        <div
          className="modalContent"
          role="dialog"
          aria-labelledby="rejectModalTitle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modalHeader">
            <div id="rejectModalTitle">반려 사유</div>
            <button
              type="button"
              className="closeBtn"
              id="closeRejectModal"
              aria-label="닫기"
              onClick={closeRejectModal}
            >
              &times;
            </button>
          </div>
          <div className="modalBody">
            <div className="formGrid bizInput">
              <div className="formRow">
                <label htmlFor="rejectReason" className="formLabel">
                  사유
                </label>
                <div className="formControl">
                  <textarea
                    id="rejectReason"
                    className="textAreaField"
                    placeholder="반려 사유를 입력해주세요"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modalFooter">
              <button
                type="button"
                className="btnSubmit"
                disabled={rejectSaveLoading}
                onClick={() => {
                  if (!effectiveReqId) return;
                  setRejectSaveLoading(true);
                  apiClient
                    .put<{ result?: string; message?: string }>(
                      API_ENDPOINTS.USER_ARTAPPM.REJECT,
                      {
                        reqId: effectiveReqId,
                        reaDesc: rejectReason?.trim() ?? "",
                      },
                    )
                    .then((res) => {
                      if (res?.result === "00") {
                        setLoadedSttusCode("11");
                        setMentorReaDesc(rejectReason?.trim() ?? "");
                        closeRejectModal();
                        showAlert(
                          "완료",
                          res?.message ?? "저장되었습니다.",
                          "success",
                        );
                      } else {
                        showAlert(
                          "저장 실패",
                          res?.message ?? "저장에 실패했습니다.",
                          "danger",
                        );
                      }
                    })
                    .catch(() => {
                      showAlert(
                        "알림",
                        "저장 중 오류가 발생했습니다.",
                        "danger",
                      );
                    })
                    .finally(() => setRejectSaveLoading(false));
                }}
              >
                {rejectSaveLoading
                  ? "저장 중…"
                  : loadedSttusCode === "11"
                    ? "저장"
                    : "반려"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <SchoolSearchModal
        isOpen={showSchoolModal}
        onClose={() => setShowSchoolModal(false)}
        onSelect={handleSchoolSelect}
      />
      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={() => {
          setShowAlertModal(false);
          afterAlertCloseRef.current?.();
          afterAlertCloseRef.current = null;
          const which = studyCertFocusAfterAlertRef.current;
          studyCertFocusAfterAlertRef.current = null;
          if (which === "certText") {
            requestAnimationFrame(() =>
              document.getElementById("certText")?.focus(),
            );
          } else if (which === "certFile") {
            requestAnimationFrame(() => certFileInputRef.current?.focus());
          }
          const consultWhich = consultFocusAfterAlertRef.current;
          consultFocusAfterAlertRef.current = null;
          if (consultWhich === "consultDate") {
            requestAnimationFrame(() =>
              document.getElementById("consultDate")?.focus(),
            );
          } else if (consultWhich === "consultPlaceTime") {
            requestAnimationFrame(() =>
              document.getElementById("consultPlaceTime")?.focus(),
            );
          }
        }}
      />
      <ConfirmModal
        isOpen={showDeleteFileConfirm}
        title="확인"
        message="첨부파일을 삭제하시겠습니까?"
        cancelText="닫기"
        confirmText="삭제"
        onCancel={() => {
          setShowDeleteFileConfirm(false);
          setFileToDelete(null);
        }}
        onConfirm={() => {
          if (fileToDelete) {
            removeExistingFile(fileToDelete.fileId, fileToDelete.seq);
          }
          setShowDeleteFileConfirm(false);
          setFileToDelete(null);
        }}
      />
      <ConfirmModal
        isOpen={studyCertToDelete != null}
        title="확인"
        message="수강확인증을 삭제하시겠습니까?"
        cancelText="닫기"
        confirmText="삭제"
        onCancel={() => setStudyCertToDelete(null)}
        onConfirm={deleteStudyCertOne}
      />
      <ConfirmModal
        isOpen={showCancelConfirm}
        title="확인"
        message="신청을 취소하시겠습니까?"
        cancelText="닫기"
        confirmText="취소"
        onCancel={() => setShowCancelConfirm(false)}
        onConfirm={() => {
          setShowCancelConfirm(false);
          runInsert("99");
        }}
      />
    </section>
  );
};

export default BizInputPrSection;
