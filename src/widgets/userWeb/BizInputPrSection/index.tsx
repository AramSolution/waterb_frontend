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
/** ?™êµêµ¬ë¶„(ì´?ì¤?ê³??? ??NEIS schulKndScNm ë§¤í•‘??*/
const SCHOOL_GB_CODE_ID = "EDR002";

/** "1ë°?, "11ë°? ?±ì—???«ìë§?ì¶”ì¶œ (?™ê¸‰ ë°?ë²ˆí˜¸) */
function parseClassNumber(classNm: string): number {
  const digits = (classNm || "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** ë°??œì‹œ: "2" ??"2ë°?, "2ë°? ??"2ë°? (?™ë…„ê³??™ì¼?˜ê²Œ Në°??•ì‹?¼ë¡œ ?µì¼) */
function formatClassLabel(classNm: string): string {
  const s = (classNm ?? "").trim();
  if (!s) return "";
  return /ë°?s*$/.test(s) ? s : `${s}ë°?;
}

/** ?•ì¥?ë¡œ ?Œì¼ ?€???´ë˜??ë°˜í™˜ (.file.hwp, .file.pdf ?? */
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

/** ê°•ì—° ?Œì°¨ ë§ˆê° ?¬ë? ?ë‹¨: "9/9" ?•íƒœ ?ëŠ” applyCnt/recCnt ?«ì ë¹„êµ */
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

/** ?™ë?ëª??°ë™ ?ë? ëª©ë¡ ??ª© (USER_ARMCHIL) */
interface ArmchilChildItem {
  esntlId?: string;
  userNm?: string;
}

/** ì²¨ë??Œì¼ ?? ? ì²­???µì¥?¬ë³¸, seq 1~5 ê³ ì • (ë°±ì—”???€?????„ë¡ ?¸ì—??seq ?„ë‹¬) */
const FILE_ATTACH_ITEMS = [
  {
    id: "fileApp",
    label: "? ì²­??,
    ariaLabel: "? ì²­???Œì¼ ì²¨ë??˜ê¸°",
    seq: 1 as const,
  },
  {
    id: "filePrivacy",
    label: "ê°œì¸?•ë³´?˜ì§‘ ?™ì˜??,
    ariaLabel: "ê°œì¸?•ë³´?˜ì§‘ ?™ì˜???Œì¼ ì²¨ë??˜ê¸°",
    labelStyle: { letterSpacing: "-0.15rem" },
    seq: 2 as const,
  },
  {
    id: "fileScore",
    label: "? ì²­???ìˆ˜ ?°ì •??,
    ariaLabel: "? ì²­???ìˆ˜ ?°ì •???Œì¼ ì²¨ë??˜ê¸°",
    labelStyle: { letterSpacing: "-0.15rem" },
    seq: 3 as const,
  },
  {
    id: "fileIdCard",
    label: "? ë¶„ì¦?,
    ariaLabel: "? ë¶„ì¦??Œì¼ ì²¨ë??˜ê¸°",
    seq: 4 as const,
  },
  {
    id: "fileBankbook",
    label: "?µì¥?¬ë³¸",
    ariaLabel: "?µì¥?¬ë³¸ ?Œì¼ ì²¨ë??˜ê¸°",
    seq: 5 as const,
  },
] as const;

type MypageTab = "applyInfo" | "cert";

interface BizInputPrSectionProps {
  proId?: string;
  /** ?¬ì—…êµ¬ë¶„(ARTPROM.PRO_GB). 02=?¬ì „ì§€??bizInputPr)????ì²¨ë??Œì¼ FILE_DESC ?€??*/
  proGb?: string;
  /** MY PAGE ? ì²­?„í™©?ì„œ ì§„ì… ??true. ?íƒœ 01(?„ì‹œ?€?????Œë§Œ ?„ì‹œ?€??? ì²­?˜ê¸° ?ˆìš©. gunsan apply_prì²˜ëŸ¼ ? ì²­?•ë³´/?˜ê°•?•ì¸ì¦????œì‹œ */
  fromMypage?: boolean;
  /** ë©˜í† ?…ë¬´(ë©˜í† ?¼ì?)?ì„œ ì§„ì… ??true. ?™ë?ëª??™ìƒ/?™êµ/?ë‹´?•ë³´/ë©˜í† ì§€?•ì? ?½ê¸° ?„ìš©, ë©˜í† ?•ë³´ë§??¸ì§‘ ê°€?? ?˜ë‹¨ ë°˜ë ¤/?€???«ê¸° */
  fromMentorWork?: boolean;
  /** MY PAGE ? ì²­?„í™©?ì„œ ?¹ì • ? ì²­ ê±??´ë¦­ ???„ë‹¬. ?´ë‹¹ ?ë?(REQ_ESNTL_ID)ë¡?ì´ˆê¸° ? íƒ???´ë‹¹ ? ì²­ ??ë¡œë“œ */
  initialReqEsntlId?: string;
  /** ë©˜í† ?¼ì??ì„œ ì§„ì… ???„ë‹¬. ?´ë‹¹ ? ì²­ ê±?REQ_ID)?¼ë¡œ ?ì„¸ ë¡œë“œÂ·ë©˜í† ?•ë³´ ë¸”ë¡ ?¸ì¶œ */
  initialReqId?: string;
}

/**
 * ì£¼ë?ë²ˆí˜¸ ?”ë©´ ?œì‹œ??ë§ˆìŠ¤??(??7?ë¦¬(970929-1)ë§??¸ì¶œ, ?·ìë¦?******)
 * ?€???œì¶œ ?œì—??state ?ë³¸ ê°??„ì²´) ?¬ìš©
 */
function maskIhidnum(val: string): string {
  if (!val || typeof val !== "string") return "";
  const digits = val.replace(/\D/g, "");
  if (digits.length <= 7) return val;
  return digits.slice(0, 6) + "-" + digits[6] + "******";
}

/** YYYYMMDD ??YYYY-MM-DD (date input?? */
function formatBrthdyForInput(brthdy: string | undefined): string {
  if (!brthdy || brthdy.length < 8) return "";
  const d = brthdy.replace(/\D/g, "").slice(0, 8);
  if (d.length < 8) return "";
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** ë³€ê²½ì´??? ì§œ ?œì‹œ: yyyy-MM-dd HH:mm:ss ??yyyy.MM.dd */
function formatChangeListDate(chgDt: string): string {
  if (!chgDt || typeof chgDt !== "string") return "";
  const s = chgDt.trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  return s;
}

/**
 * bizInput_pr.html ë³¸ë¬¸ êµ¬ì¡° ? ì? (?´ë˜?¤ëª…Â·idÂ·?‘ê·¼?±Â·DOMÂ·?´ë?ì§€ ?ë³¸ ê·¸ë?ë¡?
 * ?ë³¸: source/gunsan/bizInput_pr.html
 * proId ?ˆìœ¼ë©??™ìƒ ? íƒ ??BY_STUDENTë¡?ê¸°ì¡´ ? ì²­ ?°ì´?°Â·ì²¨ë¶€?Œì¼ ë¡œë“œ (bizInputê³??™ì¼)
 */
/** ?¤ëŠ˜ ? ì§œ YYYY-MM-DD (03 ?ë‹´?¼ì ê¸°ë³¸ê°’ìš©) */
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ë©˜í† ?•ë³´ ?ë‹´?œê°„: ??ë¶?select???µì…˜ (?¼ì •ê´€ë¦??´ì˜?œê°„ê³??™ì¼) */
const MENTOR_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MENTOR_MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];

/** advFrom/advTo(yyyy-MM-ddThh:mm ?ëŠ” HH:mm, HH:mm:ss)?ì„œ ??ì¶”ì¶œ ??"00"~"23" */
function getMentorAdvHour(str: string): string {
  if (!str || typeof str !== "string") return "09";
  let t: string;
  if (str.includes("T")) t = str.split("T")[1];
  else if (/^\d{1,2}:\d{2}/.test(str))
    t = str.slice(0, 5); // HH:mm ?ëŠ” HH:mm:ss
  else t = str.slice(11, 16);
  if (!t || !t.includes(":")) return "09";
  const h = parseInt(t.slice(0, 2), 10);
  return Number.isNaN(h)
    ? "09"
    : String(Math.max(0, Math.min(23, h))).padStart(2, "0");
}

/** advFrom/advTo?ì„œ ë¶?ì¶”ì¶œ ??10ë¶??¨ìœ„ë¡?ë°˜ì˜¬ë¦?"00"|"10"|...|"50" */
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

/** ? ì§œ(YYYY-MM-DD) + ??ë¶„ìœ¼ë¡?advFromÂ·advTo??ë¬¸ì???ì„± (yyyy-MM-ddThh:mm) */
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

/** 03 ê³µê³µ??ì§„ë¡œì§„í•™ ì»¨ì„¤?? ?ë‹´ë¶„ì•¼ ?µì…˜ (ê´€ë¦¬ì ?˜ì´ì§€?€ ?™ì¼: 01/02/03, ê¸°ë³¸ ì²«ë²ˆì§? */
const CONSULT_FIELD_OPTIONS = [
  { value: "01", label: "?ë‹´1" },
  { value: "02", label: "?ë‹´2" },
  { value: "03", label: "?ë‹´3" },
];
/** API ?‘ë‹µ: ?ë‹´?¼ìë³??¥ì†Œ/?œê°„ (space_data=?ìŠ¤?? pro_seq=value) */
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
  /** 05 ì§€??—°ê³?ì§„ë¡œì²´í—˜ / 07 ê¸€ë¡œë²Œ ë¬¸í™”?ë°©: ?™ë?ëª¨ì •ë³????™ìƒ?•ë³´ ???™êµ?•ë³´ ?œì„œ, ?™ë?ëª¨ëŠ” ë³´í˜¸?ëª…/?°ë½ì²??ë…„?”ì¼/ê´€ê³„ë§Œ */
  const isProGb07 = proGb === "07";
  const isProGb05Or07 = proGb === "05" || proGb === "07";
  /** ?™ë?ëª??™ìƒ/?™êµ/?ë‹´?•ë³´/ë©˜í† ì§€???½ê¸° ?„ìš©: ë©˜í† ?¼ì? ì§„ì… ?œì—ë§??ìš© */
  const isReadOnlyForm = fromMentorWork;
  /** MY PAGE?ì„œ ê¸°ì¡´ ? ì²­ ê±??´ëŒ ???™ìƒ(?ë?) ë³€ê²?ë¶ˆê? ??bizInput(proGb 01)ê³??™ì¼ */
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
  /** ?™êµêµ¬ë¶„(EDR002 ì½”ë“œ: ì´ˆë“± E, ì¤‘ë“± J, ê³ ë“± H ?? ???™êµ ? íƒ ??schulKndScNm?¼ë¡œ ë§¤í•‘ */
  const [schoolGb, setSchoolGb] = useState("");
  /** EDR002 ì½”ë“œëª?ì´ˆë“±?™êµ ?? ??ì½”ë“œ(E ?? ë§¤í•‘ ???™êµ ? íƒ ??schoolGb ?¤ì •??*/
  const [schoolGbMapping, setSchoolGbMapping] = useState<Map<string, string>>(
    () => new Map(),
  );
  /** ?¤ì?€ ê°€êµ??¬ë?: Y=?´ë‹¹, N=?´ë‹¹?†ìŒ (ê¸°ë³¸ê°??´ë‹¹?†ìŒ) */
  const [multiChildYn, setMultiChildYn] = useState<"Y" | "N">("N");
  /** ?¤ì?€ ê°€êµ??¬ë? ?¤ë¥¸ìª??…ë ¥?€ (?ë? ???? */
  const [multiChildText, setMultiChildText] = useState("");
  /** 03 ê³µê³µ??ì§„ë¡œì§„í•™ ì»¨ì„¤???„ìš©: ë³´í˜¸???ë…„?”ì¼ */
  const [guardianBirth, setGuardianBirth] = useState("");
  /** ?™ë?ëª?ê´€ê³??œì‹œëª?(API RELATION_GB_NM, 05 ?Œì°¨ê´€ë¦??±ì—???¬ìš©) */
  const [guardianRelationNm, setGuardianRelationNm] = useState("");
  /** 03 ?„ìš©: ?™ìƒ ?±ë³„ (ê³µê³µ??ì§„ë¡œì§„í•™?€ ê¸°ë³¸ ??. 05?ì„œ???™ìƒ?•ë³´???œì‹œ */
  const [studentGender, setStudentGender] = useState<"M" | "F" | "">(
    proGb === "03" ? "M" : "",
  );
  /** 03 ?„ìš©: ?ë‹´ë¶„ì•¼(ê¸°ë³¸ ì²«ë²ˆì§?, ?ë‹´?¼ì(?”í´???¤ëŠ˜), ?¥ì†Œ+?œê°„, ?”ì²­?¬í•­ */
  const [consultField, setConsultField] = useState(proGb === "03" ? "01" : "");
  const [consultDate, setConsultDate] = useState(() => getTodayString());
  const [consultPlaceTime, setConsultPlaceTime] = useState("");
  /** 03 ?„ìš©: ?ë‹´?¼ìë³??¥ì†Œ/?œê°„ ?µì…˜ (API schedule-options ?°ë™, space_data=label, pro_seq=value) */
  const [consultPlaceTimeOptions, setConsultPlaceTimeOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "", label: "? íƒ?´ì£¼?¸ìš”" }]);
  const [requestDesc, setRequestDesc] = useState("");
  /** ê¸°ì¡´ ì²¨ë??Œì¼ ëª©ë¡ (BY_STUDENT fileList) */
  const [existingFiles, setExistingFiles] = useState<
    { fileId: string; seq: number; orgfNm?: string }[]
  >([]);
  /** ?™ìƒÂ·?¬ì—…ë³?ê¸°ì¡´ ? ì²­ ê±?ë¡œë“œ ??ë³´ê? (reqId: REQ_ID ?¨ì¼ PK, PRO_SEQ ë³€ê²½ì— ?ˆì „) */
  const [loadedReqId, setLoadedReqId] = useState("");
  const [loadedProSeq, setLoadedProSeq] = useState("");
  const [loadedSttusCode, setLoadedSttusCode] = useState("");
  /** ?‰ë³„ ?ˆë¡œ ? íƒ???Œì¼ (seq 1~5 ê³ ì •, ?€????ë°±ì—”?œì— seq ?„ë‹¬) */
  const [pendingFilesBySeq, setPendingFilesBySeq] = useState<
    Partial<Record<number, File>>
  >({});
  /** 03 ê³µê³µ??ì§„ë¡œì§„í•™ ?„ìš©: ?”ì²­?¬í•­ ?„ë˜ ì²¨ë??Œì¼(?¬ëŸ¬ ê°? */
  const [pendingAttachFilesCt, setPendingAttachFilesCt] = useState<File[]>([]);
  /** 05 ì§€??—°ê³?ì§„ë¡œì²´í—˜ ?„ìš©: ??ì¹¸ì— ?¬ëŸ¬ ?Œì¼ ì²¨ë? (01/bizInput ë°©ì‹) */
  const [pendingAttachFiles05, setPendingAttachFiles05] = useState<
    { id: string; file: File }[]
  >([]);
  const fileInput05Ref = useRef<HTMLInputElement>(null);
  const fileInput05Id = useId();
  /** ì²¨ë??Œì¼ ?? œ ?•ì¸ ëª¨ë‹¬ (ê¸°ì¡´ ?Œì¼ë§? fileId+seq ?„ë‹¬) */
  const [showDeleteFileConfirm, setShowDeleteFileConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string;
    seq: number;
  } | null>(null);
  /** MY PAGE + 03: BY_STUDENT detail.reaDesc(ARTAPPM.REA_DESC) ??ë©˜í† ?•ë³´ ?¹ì…˜ '?¬ìœ ' ?œì‹œ??*/
  const [loadedReaDesc, setLoadedReaDesc] = useState("");
  /** ë©˜í† ?¼ì?: ë©˜í† ?•ë³´ ?¸ì§‘??ë¡œì»¬ state (mentorInfo/loadedReaDesc?€ ?™ê¸°?? */
  const [mentorAdvSpace, setMentorAdvSpace] = useState("");
  const [mentorAdvFrom, setMentorAdvFrom] = useState("");
  const [mentorAdvTo, setMentorAdvTo] = useState("");
  const [mentorAdvDesc, setMentorAdvDesc] = useState("");
  const [mentorReaDesc, setMentorReaDesc] = useState("");
  /** ë©˜í† ?¼ì? ì§„ì… ??mentor-diary-detailë¡?ë¡œë“œ???™ìƒ 1ëª??œì‹œ??. ?ë? ëª©ë¡??ë¹„ì–´ ?ˆì„ ??select ?µì…˜?¼ë¡œ ?¬ìš© */
  const [mentorDisplayStudent, setMentorDisplayStudent] = useState<{
    esntlId: string;
    userNm: string;
  } | null>(null);
  /** 05 ?™ìƒ ë¡œê·¸???? ë³¸ì¸ 1ëª…ë§Œ ?™ìƒ ? íƒ ?µì…˜?¼ë¡œ ?¬ìš© */
  const [studentSelfOption, setStudentSelfOption] =
    useState<ArmchilChildItem | null>(null);
  /** 05 ?™ìƒ ë¡œê·¸???? ë³´í˜¸??ëª©ë¡ (GET /api/user/armchil/parents) */
  const [parentList, setParentList] = useState<ArmchilChildItem[]>([]);
  /** 05 ?™ìƒ ë¡œê·¸???? ? íƒ??ë³´í˜¸??esntlId (?€????pEsntlIdë¡??„ì†¡) */
  const [selectedParentId, setSelectedParentId] = useState("");
  /** ?™ìƒ(SNR) ë¡œê·¸????ë¯¸ì—°???ˆë‚´ ?¤ì´?¼ë¡œê·?1??*/
  const snParentLinkAlertShownRef = useRef(false);
  /** 05 ê°•ì—°?•ë³´: ?Œì°¨ ëª©ë¡(?¼ì •+? ì²­?¸ì›) ë°?? íƒ ?Œì°¨ PRO_SEQ (?€????artappm proSeqë¡??„ì†¡) */
  const [scheduleList05, setScheduleList05] = useState<ScheduleWithApplyItem[]>(
    [],
  );
  const [scheduleList05Loading, setScheduleList05Loading] = useState(false);
  const [selectedProSeq05, setSelectedProSeq05] = useState("");
  useEffect(() => {
    if (!fromMentorWork) setMentorDisplayStudent(null);
  }, [fromMentorWork]);
  /** MY PAGE + 03: mentor-info API ?‘ë‹µ(ë©˜í† ì§€?•Â·ìƒ?´ì¥?ŒÂ·ì‹œê°„Â·ë‚´?©Â·ì²¨ë¶€?Œì¼). ì¡°íšŒ ?„ìš© */
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
  /** ë©˜í† ?•ë³´ ì²¨ë??Œì¼ - ?„ì§ ?œë²„???¬ë¦¬ì§€ ?Šì?, ?´ë²ˆ ?€???„ë£Œ ???¨ê»˜ ?…ë¡œ?œí•  ?Œì¼??*/
  const [pendingMentorFiles, setPendingMentorFiles] = useState<File[]>([]);
  /** ?˜ê°•?•ì¸ì¦?ëª©ë¡(?¬ìš©?? fromMypage ??study-cert-list API) */
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
  /** ?Œë¦¼ ëª¨ë‹¬ (?? œ ?¤íŒ¨ ?? */
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

  /** ?™êµêµ¬ë¶„(EDR002) ì½”ë“œ ì¡°íšŒ ??schulKndScNm(?™êµì¢…ë¥˜ëª? ??ì½”ë“œ ë§¤í•‘ (ê´€ë¦¬ì ì§„ë¡œì§„í•™ ? ì²­ê³??™ì¼) */
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

  /** ë¡œê·¸???¬ìš©???•ë³´ ë¡œë“œ: ?™ë?ëª?PNR)ë©?ë³´í˜¸???„ë“œ ì±„ì?, ?™ìƒ(SNR)?´ë©´ ?™ìƒ ?„ë“œ ì±„ì? ë°?ë³¸ì¸???™ìƒ ? íƒ ?µì…˜?¼ë¡œ ?¤ì •(ë³´í˜¸?ëŠ” PARENTS API). ë©˜í† ?¼ì? ì§„ì… ?œì—???˜ì? ?ŠìŒ. */
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

  /** ?¸ì¦??ì¤€ë¹„ëœ ???ë? ëª©ë¡ ì¡°íšŒ (?™ë?ëª¨ìš©). ?™ìƒ(SNR)???ŒëŠ” ?¤í‚µ(ë³¸ì¸ ? ì²­ + PARENTSë¡?ë³´í˜¸??. ë©˜í† ?¼ì? ì§„ì… ?œì—???ë?ê°€ ?†ì–´??? íƒ ?´ì œ?˜ì? ?ŠìŒ */
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

  /** ?™ìƒ(SNR) ë¡œê·¸???? ë§¤ì¹­ ë³´í˜¸??ëª©ë¡ (GET /api/user/armchil/parents), 1ëª…ë§Œ ?¬ìš© */
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
            setAlertTitle("?ë? ?°ë™???„ìš”?©ë‹ˆ??);
            setAlertMessage(
              "?™ë?ëª¨ë‹˜??ë§ˆì´?˜ì´ì§€?ì„œ ?ë? ?°ë™???„ë£Œ?????¤ì‹œ ? ì²­??ì£¼ì„¸??",
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

  /** ?™ìƒ(SNR): ? íƒ??ë³´í˜¸???ì„¸ë¡??™ë?ëª??„ë“œ ì±„ì? */
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

  /** 05 ì§€??—°ê³?ì§„ë¡œì²´í—˜: ê°•ì—°(?Œì°¨) ëª©ë¡ ì¡°íšŒ - ArtpromUserController GET schedule-with-apply (selectArtprodListWithApplyCnt) */
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

  /** MY PAGE ? ì²­?„í™©?ì„œ ?¹ì • ? ì²­ ê±´ìœ¼ë¡?ì§„ì… ??initialReqEsntlId) ?´ë‹¹ ?ë?ë¡?ì´ˆê¸° ? íƒ (1?Œë§Œ) */
  const initialReqEsntlIdAppliedRef = useRef(false);
  useEffect(() => {
    if (initialReqEsntlIdAppliedRef.current || !initialReqEsntlId) return;
    /** ë©˜í† ?¼ì? ì§„ì…: ?ë? ëª©ë¡ê³?ë¬´ê??˜ê²Œ reqEsntlIdë¡??™ìƒ ? íƒ */
    if (fromMentorWork) {
      setSelectedStudentId(initialReqEsntlId);
      initialReqEsntlIdAppliedRef.current = true;
      return;
    }
    /** ?™ìƒ(SNR) MY PAGE ì§„ì…: ë³¸ì¸ ? ì²­ ê±´ì´ë©??ë? ëª©ë¡ ?†ì´???™ìƒ ? íƒ (BY_REQ_ID ë¡œë“œ ê°€?¥í•˜?„ë¡) */
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

  /** ë©˜í† ?¼ì? ì§„ì… ??reqIdë¡?? ì²­ ê±??ì„¸ ë¡œë“œ ??ë³´í˜¸???´ë‹¹ ? ì²­ ê±?Â·?™ìƒÂ·?™êµÂ·?ë‹´?•ë³´ ì±„ì?. ë¡œê·¸?¸í•œ ë©˜í† ê°€ ?„ë‹Œ ? ì²­ ê±´ì˜ ë³´í˜¸???•ë³´ ?œì‹œ */
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
              /* reqDesc ?‰ë¬¸ ? ì? */
            }
          }
        }
      })
      .catch(() => {
        mentorDiaryDetailAppliedRef.current = false;
      });
  }, [fromMentorWork, initialReqId, isProGb03]);

  /** 03 ?„ìš©: ?ë‹´?¼ì ë³€ê²????¥ì†Œ/?œê°„ ?µì…˜ API ?°ë™ (space_data=label, pro_seq=value). ê¸°ì¡´ ? íƒê°?ë¡œë“œ??proSeq)???µì…˜???ˆìœ¼ë©?? ì? */
  useEffect(() => {
    if (!isProGb03 || !proId || !consultDate) {
      setConsultPlaceTimeOptions([{ value: "", label: "? íƒ?´ì£¼?¸ìš”" }]);
      setConsultPlaceTime("");
      return;
    }
    const url = API_ENDPOINTS.USER_ARTPROM.SCHEDULE_OPTIONS(proId, consultDate);
    apiClient
      .get<ScheduleOptionItem[]>(url)
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        if (arr.length === 0) {
          setConsultPlaceTimeOptions([{ value: "", label: "? íƒ?´ì£¼?¸ìš”" }]);
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
        setConsultPlaceTimeOptions([{ value: "", label: "? íƒ?´ì£¼?¸ìš”" }]);
        setConsultPlaceTime("");
      });
  }, [isProGb03, proId, consultDate]);

  /** ?™ìƒ ? íƒ ?? proId ?ˆìœ¼ë©?BY_STUDENTë¡?ê¸°ì¡´ ? ì²­ ?°ì´?°Â·ì²¨ë¶€?Œì¼ ë¡œë“œ, ?†ìœ¼ë©??™ìƒ ?•ë³´ë§?ë¡œë“œ (bizInputê³??™ì¼) */
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
    /** ë©˜í† ?¼ì? ì§„ì…: mentor-diary-detailë¡??´ë? ë¡œë“œ?? BY_STUDENT???™ë?ëª??„ìš©?´ë¼ ?¸ì¶œ?˜ì? ?ŠìŒ */
    if (fromMentorWork && initialReqId) return;
    /** ê³µê³  ì§„ì…: ê¸°ì¡´ ? ì²­ ?°ì´?°ëŠ” ë¡œë“œ?˜ì? ?Šê³ , ?´ë‹¹ ?™ìƒ ê¸°ë³¸ ?•ë³´ë§?ë¡œë“œ (?€??? ì²­?€ ìµœì´ˆ 1?Œë§Œ ê°€?? */
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
            /** ?™ìƒ(SNR) ? ì²­ ê±?ë¡œë“œ ?? ë³´í˜¸??? íƒ ë³µì› */
            if (AuthService.getUserSe() === "SNR" && (d.pEsntlId as string)) {
              setSelectedParentId(String(d.pEsntlId));
            }
            /** 05 ? ì²­ ê±?ë¡œë“œ ?? ? íƒ ?Œì°¨ ë³µì› */
            if (isProGb05Or07 && d.proSeq != null) {
              setSelectedProSeq05(String(d.proSeq));
            }
            /** 03 ê³µê³µ??ì§„ë¡œì§„í•™: ?ë‹´?•ë³´ ??BY_STUDENT ?‘ë‹µ(proType, workDt, proSeq, reqDesc)ë¡?ì±„ì?. bizInputCt??proGb=03 ê³ ì •?´ë?ë¡?isProGb03 ê¸°ì? */
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
                  /* reqDesc ?‰ë¬¸?¼ë¡œ ? ì? */
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

  /** ë©˜í† ?¼ì? ì§„ì… ??URL??reqIdë¡œë„ ë©˜í† ?•ë³´ ë¸”ë¡ ?¸ì¶œÂ·API ?¸ì¶œ (loadedReqId??mentor-diary-detail ë¡œë“œ ???¸íŒ…?? */
  const effectiveReqId =
    loadedReqId || (fromMentorWork && initialReqId ? initialReqId : "");

  /** ?™ìƒ select ?µì…˜: ?™ìƒ(SNR)?´ë©´ ë³¸ì¸ 1ëª? ë©˜í† ?¼ì?ë©?ë¡œë“œ???™ìƒ 1ëª? ?„ë‹ˆë©??ë? ëª©ë¡ */
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

  /** API/?€?????¬ìš©??? ì²­???™ìƒ) ID: ?™ìƒ(SNR)?´ë©´ ë³¸ì¸, ?„ë‹ˆë©?? íƒ???ë? */
  const effectiveReqEsntlId =
    AuthService.getUserSe() === "SNR"
      ? (AuthService.getEsntlId() ?? "")
      : selectedStudentId;

  /** 03 + MY PAGE ?ëŠ” ë©˜í† ?¼ì?: effectiveReqId ?ˆì„ ??ë©˜í† ?•ë³´(ARTADVI) API ?¸ì¶œ */
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

  /** ë©˜í† ?¼ì?: mentorInfo/loadedReaDesc ë³€ê²????¸ì§‘ state ?™ê¸°?? ?ë‹´?œê°„?€ ??ë¶?select?©ìœ¼ë¡?yyyy-MM-ddThh:mm ?•ì‹ ? ì? */
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
        // APIê°€ ?œê°„ë§??´ë ¤ì¤????? 10:00:00, 11:00:00) ???¤ëŠ˜ ? ì§œ + HH:mm
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

  /** ë©˜í† ?•ë³´(ARTADVI) ?¬ì¡°?????…ë¡œ???? œ ??ëª©ë¡ ê°±ì‹ ??*/
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

  /** ë©˜í† ?•ë³´ ì²¨ë??Œì¼ ? íƒ (ë©˜í† ?¼ì?, effectiveReqId ?¬ìš©). ?¬ëŸ¬ ?Œì¼ ?™ì‹œ ? íƒ ê°€?? ?¤ì œ ?…ë¡œ?œëŠ” ?€???„ë£Œ ?œì ???˜í–‰ */
  const handleMentorInfoFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (!files.length) return;
      setPendingMentorFiles((prev) => [...prev, ...files]);
      e.target.value = "";
    },
    [],
  );

  /** ë©˜í† ?•ë³´ ì²¨ë??Œì¼ 1ê±??? œ */
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
          setAlertTitle("?„ë£Œ");
          setAlertMessage("ì²¨ë??Œì¼???? œ?˜ì—ˆ?µë‹ˆ??");
          setAlertType("success");
          setShowAlertModal(true);
        } else {
          setAlertTitle("?ˆë‚´");
          setAlertMessage(res?.message ?? "ì²¨ë??Œì¼ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
          setAlertType("danger");
          setShowAlertModal(true);
        }
      } catch {
        setAlertTitle("?ˆë‚´");
        setAlertMessage("ì²¨ë??Œì¼ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
        setAlertType("danger");
        setShowAlertModal(true);
      } finally {
        setMentorInfoDeletingKey(null);
      }
    },
    [effectiveReqId, refetchMentorInfo],
  );

  /** ë©˜í† ?¼ì?: ë©˜í† ?•ë³´ ?„ë£Œ ì²˜ë¦¬(ARTADVI + ARTAPPM ?íƒœ 04). '?„ë£Œ' ë²„íŠ¼ ?´ë¦­ ???¸ì¶œ */
  const [mentorInfoSaveLoading, setMentorInfoSaveLoading] = useState(false);
  const handleSaveMentorInfo = useCallback(async () => {
    if (!effectiveReqId) {
      showAlert("?Œë¦¼", "? ì²­ ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤.", "danger");
      return;
    }
    /** DB ADV_FROM/ADV_TO??TIME(HH:mm:ss). yyyy-MM-ddThh:mm ?ëŠ” hh:mm ??HH:mm:ss ë¡?ë³€??*/
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
      // 1) ?„ì§ ?…ë¡œ?œë˜ì§€ ?Šì? ì²¨ë??Œì¼???ˆìœ¼ë©?ë¨¼ì? ?…ë¡œ??
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
            throw new Error(res?.message ?? "ì²¨ë??Œì¼ ?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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
        // mentorAdvFrom/mentorAdvToê°€ ""(state ë¯¸ì´ˆê¸°í™”)?¬ë„ ?”ë©´?ì„œ ? íƒ??ê°?ê¸°ë³¸ê°??¬í•¨)???€?¥ë˜?„ë¡ ë³´ì •
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
        showAlert("?„ë£Œ", res?.message ?? "?„ë£Œ?˜ì—ˆ?µë‹ˆ??", "success");
      } else {
        showAlert(
          "?€???¤íŒ¨",
          res?.message ?? "?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.",
          "danger",
        );
      }
    } catch (e) {
      showAlert(
        "?Œë¦¼",
        e instanceof Error ? e.message : "?€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
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

  /** ë©˜í† ?¼ì?: ?€??ARTADVIë§??€?? ?íƒœ ë³€ê²??†ìŒ). ë²„íŠ¼ ?œì„œ: ?€??| ?„ë£Œ | ë°˜ë ¤ */
  const handleSaveMentorInfoTemp = useCallback(async () => {
    if (!effectiveReqId) {
      showAlert("?Œë¦¼", "? ì²­ ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤.", "danger");
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
      // 1) ?„ì§ ?…ë¡œ?œë˜ì§€ ?Šì? ì²¨ë??Œì¼???ˆìœ¼ë©?ë¨¼ì? ?…ë¡œ??
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
            throw new Error(res?.message ?? "ì²¨ë??Œì¼ ?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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
        // mentorAdvFrom/mentorAdvToê°€ ""(state ë¯¸ì´ˆê¸°í™”)?¬ë„ ?”ë©´?ì„œ ? íƒ??ê°?ê¸°ë³¸ê°??¬í•¨)???€?¥ë˜?„ë¡ ë³´ì •
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
        showAlert("?€??, res?.message ?? "?€?¥ë˜?ˆìŠµ?ˆë‹¤.", "success");
      } else {
        showAlert(
          "?€???¤íŒ¨",
          res?.message ?? "?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.",
          "danger",
        );
      }
    } catch (e) {
      showAlert(
        "?Œë¦¼",
        e instanceof Error ? e.message : "?€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
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

  /** ì´ˆê¸°?? 05 ì§€??—°ê³?ê³µê³ Â·!mypage): ê°•ì—°(?Œì°¨) ? íƒÂ·ì²¨ë?ë§?ì´ˆê¸°???™ìƒÂ·?™êµÂ·ë³´í˜¸????? ì?). ê·??? ?¸ë?ì£¼ëª…Â·?™ìƒ ?´ì œ ??ê¸°ì¡´ ?™ì‘. fromMypageë©??™ìƒ ? ì?. 03?€ ?ë‹´/ë©˜í†  ë¸”ë¡ê¹Œì? ì´ˆê¸°??*/
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

  /** ?‰ë³„(seq) ?Œì¼ ? íƒ: ?€????ë°±ì—”?œì— seq 1~5 ê³ ì • ?„ë‹¬ */
  const handleFileSelectBySeq = (seq: number, file: File | null) => {
    setPendingFilesBySeq((prev) => {
      const next = { ...prev };
      if (file) next[seq] = file;
      else delete next[seq];
      return next;
    });
  };

  /** 05 ì§€??—°ê³?ì§„ë¡œì²´í—˜: ??ì¹??¬ëŸ¬ ?Œì¼ ì²¨ë? (01/bizInput ë°©ì‹) */
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

  /** ?€?¥Â·ì‹ ì²?ê°€?? ?°ì´???†ìŒ("")?´ë©´ ??ƒ ê°€?? 01(?„ì‹œ?€???´ë©´ MY PAGE ì§„ì…(fromMypage)???Œë§Œ ê°€?? 02/03/04/05/99??ë¶ˆê? */
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

  /** ?™êµê²€??ëª¨ë‹¬?ì„œ ?™êµ ? íƒ ?? ?™êµëª…Â·í•™êµêµ¬ë¶?ë°˜ì˜ ???´ë‹¹ ?™êµ ?™ë…„/ë°??µì…˜ ì¡°íšŒ (ê´€ë¦¬ì ì§„ë¡œì§„í•™ ? ì²­ê³??™ì¼) */
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
            label: `${g}?™ë…„`,
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

  /** ?™ìƒ ?ì„¸ ë¡œë“œ ???€?¥ëœ ?™êµëª…ìœ¼ë¡?NEIS ?™êµ ì¡°íšŒ ???´ë‹¹ ?™êµ ?™ë…„/ë°??µì…˜ ?¤ì • (ì¤‘í•™êµ?3?™ë…„ ???¤ì œ ?™ë…„ë§??¸ì¶œ) */
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
            label: `${g}?™ë…„`,
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

  /** ê¸°ì¡´ ì²¨ë??Œì¼ ?? œ (reqId + fileId + seq, by-req-id ?„ìš©) */
  const removeExistingFile = (fileId: string, seq: number) => {
    if (!canSaveOrApply) {
      showAlert(
        "?Œë¦¼",
        fromMypage
          ? "?´ë? ? ì²­ ?„ë£Œ??ì§€?ì‚¬?…ì? ?˜ì •?????†ìŠµ?ˆë‹¤."
          : "?˜ì •?€ MY PAGE?ì„œë§?ê°€?¥í•©?ˆë‹¤.\n?´ë? ? ì²­ ?„ë£Œ??ì§€?ì‚¬?…ì? ?˜ì •?????†ìŠµ?ˆë‹¤.",
        "danger",
      );
      return;
    }
    if (!loadedReqId) {
      showAlert(
        "?Œë¦¼",
        "?? œë¥?ì§„í–‰?????†ìŠµ?ˆë‹¤. ?˜ì´ì§€ë¥??ˆë¡œê³ ì¹¨?????¤ì‹œ ?œë„??ì£¼ì„¸??",
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
            "?Œë¦¼",
            res?.message ?? "?Œì¼ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.",
            "danger",
          );
        }
      })
      .catch(() => {
        showAlert("?Œë¦¼", "?Œì¼ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", "danger");
      });
  };

  /** ?„ì‹œ?€??01) / ? ì²­?˜ê¸°(02) ??bizInputê³??™ì¼ API, data??bizInputPr ?„ë“œ(?¸ë?ì£¼ëª…Â·?¤ì?€Â·?Œì¼ seq 1~5) ë°˜ì˜ */
  const handleSubmitArtappm = (sttusCode: "01" | "02" | "03") => {
    if (!proId) {
      showAlert("?Œë¦¼", "ì§€?ì‚¬?…ì„ ? íƒ?˜ê³  ?™ìƒ??? íƒ?´ì£¼?¸ìš”.", "danger");
      return;
    }
    if (!effectiveReqEsntlId) {
      showAlert("?Œë¦¼", "?™ìƒ??? íƒ?????€?¥í•´ ì£¼ì„¸??", "danger");
      return;
    }
    if (AuthService.getUserSe() === "SNR" && !selectedParentId) {
      showAlert("?Œë¦¼", "ë³´í˜¸?ë? ? íƒ??ì£¼ì„¸??", "danger");
      return;
    }
    if (isProGb05Or07 && (!selectedProSeq05 || selectedProSeq05 === "0")) {
      showAlert(
        "?Œë¦¼",
        isProGb07
          ? "?ë°©êµ??(?¼ì •)??? íƒ??ì£¼ì„¸??"
          : "ê°•ì—°(?Œì°¨)??? íƒ??ì£¼ì„¸??",
        "danger",
      );
      return;
    }
    /** ê³µê³  ì§„ì…: ?€??? ì²­ ???´ë‹¹ ?™ìƒ+proId ê¸°ì¡´ ? ì²­ ?¬ë? ?•ì¸. ?ˆìœ¼ë©?ë§‰ê³  MY PAGE ?ˆë‚´ */
    if (!fromMypage) {
      // ?¤íšŒ ? ì²­ ê°€???¬ì—…?€ ?™ìƒ+proIdë§Œìœ¼ë¡?? ì°¨?¨í•˜ë©?????03?€ ?ë‹´?¼ì+?¥ì†Œ/?œê°„, 05Â·07?€ ?Œì°¨/?ë°© ?¬ë¡¯?¼ë¡œ êµ¬ë¶„).
      // ì¤‘ë³µ ì°¨ë‹¨?€ ?€????ë°±ì—”?œì—???¬ë¡¯ ê¸°ì??¼ë¡œ ì²˜ë¦¬?œë‹¤.
      if (isProGb03 || isProGb05Or07) {
        if (isProGb03) {
          if (!consultDate?.trim()) {
            consultFocusAfterAlertRef.current = "consultDate";
            showAlert(
              "?ˆë‚´",
              "?´ë‹¹ ?¼ì???Œë§?€ ?¥ì†Œ ë°??œê°„??ì¡´ì¬?˜ì? ?ŠìŠµ?ˆë‹¤.",
              "danger",
            );
            return;
          }
          if (!consultPlaceTime?.trim() || consultPlaceTime === "0") {
            consultFocusAfterAlertRef.current = "consultPlaceTime";
            showAlert(
              "?ˆë‚´",
              "?´ë‹¹ ?¼ì???Œë§?€ ?¥ì†Œ ë°??œê°„??ì¡´ì¬?˜ì? ?ŠìŠµ?ˆë‹¤.",
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
              "?Œë¦¼",
              "?˜ì •?€ MY PAGE?ì„œë§?ê°€?¥í•©?ˆë‹¤.\n?´ë? ? ì²­ ?„ë£Œ??ì§€?ì‚¬?…ì? ?˜ì •?????†ìŠµ?ˆë‹¤.",
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
        "?Œë¦¼",
        "?´ë? ? ì²­ ?„ë£Œ??ì§€?ì‚¬?…ì? ?˜ì •?????†ìŠµ?ˆë‹¤.",
        "danger",
      );
      return;
    }
    /** 03 ê³µê³µ?? ?ë‹´?¼ìÂ·?¥ì†Œ ë°??œê°„ ?„ìˆ˜ (?„ì‹œ?€??? ì²­ ê³µí†µ, proSeq ?•ìƒ ?„ì†¡ ë°©ì?) */
    if (isProGb03) {
      if (!consultDate?.trim()) {
        consultFocusAfterAlertRef.current = "consultDate";
        showAlert(
          "?ˆë‚´",
          "?´ë‹¹ ?¼ì???Œë§?€ ?¥ì†Œ ë°??œê°„??ì¡´ì¬?˜ì? ?ŠìŠµ?ˆë‹¤.",
          "danger",
        );
        return;
      }
      if (!consultPlaceTime?.trim() || consultPlaceTime === "0") {
        consultFocusAfterAlertRef.current = "consultPlaceTime";
        showAlert(
          "?ˆë‚´",
          "?´ë‹¹ ?¼ì???Œë§?€ ?¥ì†Œ ë°??œê°„??ì¡´ì¬?˜ì? ?ŠìŠµ?ˆë‹¤.",
          "danger",
        );
        return;
      }
    }
    runInsert(sttusCode);
  };

  const runInsert = (sttusCode: "01" | "02" | "03" | "99") => {
    /** pEsntlId=ë³´í˜¸?? REQ_ESNTL_ID(reqEsntlIdForInsert)??ë¡œê·¸??? ì²­) ì£¼ì²´ */
    const isStudentApplicant = AuthService.getUserSe() === "SNR";
    const pEsntlId = isStudentApplicant
      ? (selectedParentId ?? "")
      : (AuthService.getEsntlId() ?? "");
    /** REQ_ESNTL_ID = ?¤ì œ ? ì²­(ë¡œê·¸?? ì£¼ì²´. ë§ˆì´?˜ì´ì§€ ëª©ë¡?€ ??ê°’ìœ¼ë¡?ì¡°íšŒ??*/
    const reqEsntlIdForInsert = AuthService.getEsntlId() ?? "";
    /** 03 ê³µê³µ?? ?¥ì†Œ/?œê°„=? íƒ ?¼ì • PRO_SEQ. 05: ? íƒ ?Œì°¨ PRO_SEQ(?„ì‹œ?€??? ì²­ ??artappm proSeqë¡??€??. ê·??? ê¸°ì¡´ loadedProSeq */
    const proSeqRaw = isProGb03
      ? consultPlaceTime &&
        consultPlaceTime.trim() !== "" &&
        consultPlaceTime !== "0"
        ? consultPlaceTime.trim()
        : loadedProSeq && loadedProSeq !== ""
          ? loadedProSeq
          : consultPlaceTime || "0"
      : isProGb05Or07
        ? /** MY PAGE ?˜ì • ?œì—???”ë©´?ì„œ ? íƒ???Œì°¨(selectedProSeq05)ë¥??°ì„  ?„ì†¡ (loadedProSeqë§??°ë©´ ?Œì°¨ ë³€ê²½ì´ ?œë²„ê¹Œì? ??ê°? */
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

    /** ?„ì†¡???Œì¼: 03/05??ê°€ë³€ ?¬ëŸ¬ ê°? 02??seq 1~5 ê³ ì • */
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

    /** 03 ê³µê³µ??ì§„ë¡œì§„í•™: REQ_DESC?ëŠ” ?”ì²­?¬í•­(ëª©ì /?œë™?´ìš©/ê¸°í?ì²˜ëŸ¼) ?‰ë¬¸ë§??€?? ?ë‹´ë¶„ì•¼Â·?¼ìÂ·?¥ì†Œ??PRO_TYPEÂ·WORK_DTÂ·PRO_SEQë¡??„ë‹¬ */
    const reqDescValue = isProGb03 ? (requestDesc ?? "").trim() : "";

    /** 03 ê³µê³µ?? ?ë‹´ë¶„ì•¼(consultField 01/02/03) ??PRO_TYPE, ?ë‹´?¼ì(consultDate) ??WORK_DT, RESULT_GB=N. ?˜ì • ??reqId ?¬í•¨(PRO_SEQ ë³€ê²½ì— ?ˆì „). */
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
    /** 03Â·05Â·07: PRO_SEQ JSON ?„ë½/ë°”ì¸???´ìŠˆ ??ë³´ì •??ë³„ë„ ?ŒíŠ¸ */
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
            "?Œë¦¼",
            (res as { message?: string })?.message ??
              (isUpdate
                ? "?˜ì •?€ MY PAGE?ì„œë§?ê°€?¥í•©?ˆë‹¤."
                : "?™ì¼??ì§€?ì‚¬??? ì²­ ê±´ì´ ?´ë? ì¡´ì¬?©ë‹ˆ??"),
            "danger",
          );
          /** ì¤‘ë³µ(50) ??ê¸°ì¡´ ê±??ì„¸ë¥??¤ì‹œ ë¶ˆëŸ¬?¤ì? ?ŠìŒ ??BY_STUDENT/BY_REQ_ID ?‘ë‹µ??sttusCodeë¥??°ë©´ ê³µê³  ?¼ì˜ loadedSttusCodeê°€ ??—¬ ?„ì‹œ?€?¥Â·ì‹ ì²?ë²„íŠ¼???˜ëª» ë¹„í™œ?±í™”??*/
          return;
        }
        if (result === "00") {
          if (sttusCode === "99") {
            showAlert("ì·¨ì†Œ ?„ë£Œ", "? ì²­??ì·¨ì†Œ?˜ì—ˆ?µë‹ˆ??", "success");
            setLoadedSttusCode("99");
            setShowCancelConfirm(false);
            if (fromMypage) {
              afterAlertCloseRef.current = () =>
                router.push("/userWeb/mypagePr");
            }
            return;
          }
          if (sttusCode === "02" || sttusCode === "03") {
            showAlert("? ì²­ ?„ë£Œ", "? ì²­???„ë£Œ?˜ì—ˆ?µë‹ˆ??", "success");
            setLoadedSttusCode(sttusCode);
          } else {
            showAlert("?„ì‹œ?€??, "?„ì‹œ?€?¥ë˜?ˆìŠµ?ˆë‹¤.", "success");
            setLoadedSttusCode("01");
          }
          setPendingFilesBySeq({});
          setPendingAttachFilesCt([]);
          setPendingAttachFiles05([]);
          /** ì§€?ì‚¬??ê³µê³ ) ê²½ìœ  ì§„ì… ?? ?„ë£Œ ëª¨ë‹¬ ?•ì¸ ??ë©”ì¸?¼ë¡œ ?´ë™(ì¿¼ë¦¬ ? ì?) */
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
          "?Œë¦¼",
          res?.message ?? "ì²˜ë¦¬ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
          "danger",
        );
      })
      .catch(() => {
        showAlert("?Œë¦¼", "?€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", "danger");
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    /** ìµœì¢… ? ì²­ ?íƒœê°??•ì±…: 03/05ë§??¹ì¸(03), 07?€ ? ì²­(02) */
    handleSubmitArtappm(isProGb03 || proGb === "05" ? "03" : "02");
  };

  /** fromMypage??????·ëª¨??(gunsan apply_pr?€ ?™ì¼) */
  const [activeTab, setActiveTab] = useState<MypageTab>("applyInfo");
  /** ?˜ê°•?•ì¸ì¦?ëª©ë¡ ì¡°íšŒ: fromMypage + ?˜ê°•?•ì¸ì¦??? reqId ?„ìš©(searchReqId) */
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
  /** ë³€ê²½ì´??ëª©ë¡ (API: f_changlist). ? ì§œÂ·?´ìš©ë§??œì‹œ */
  const [changeList, setChangeList] = useState<
    { chgDt?: string; chgDesc?: string }[]
  >([]);
  const [changeListLoading, setChangeListLoading] = useState(false);
  const [regCertModalOpen, setRegCertModalOpen] = useState(false);
  /** ë°˜ë ¤ ëª¨ë‹¬(ë©˜í† ?¼ì? fromMentorWork): ?¬ìœ  textareaë§??œì‹œ */
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaveLoading, setRejectSaveLoading] = useState(false);
  /** ?˜ê°•?•ì¸ì¦??±ë¡ ëª¨ë‹¬: ?¼ì(?¤ëŠ˜ ê³ ì •), ?´ìš©(FILE_DESC), ì²¨ë??Œì¼ 1ê°? null=?±ë¡ ëª¨ë“œ, ?ˆìŒ=?ì„¸/?˜ì • ëª¨ë“œ */
  const [studyCertDetailSeq, setStudyCertDetailSeq] = useState<number | null>(
    null,
  );
  /** ?ì„¸ ëª¨ë“œ????ê¸°ì¡´ ?Œì¼ ?•ë³´ (ë³´ê¸° ë§í¬Â·?Œì¼ëª??œì‹œ) */
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
  /** ë©˜í† ?•ë³´ ì²¨ë??Œì¼ ?…ë¡œ?œìš© hidden input (ë©˜í† ?¼ì??ì„œë§??¬ìš©) */
  const mentorInfoFileInputRef = useRef<HTMLInputElement>(null);
  /** ë©˜í† ?•ë³´ ì²¨ë??Œì¼ ?…ë¡œ??ì¤?*/
  const [mentorInfoFileLoading, setMentorInfoFileLoading] = useState(false);
  /** ë©˜í† ?•ë³´ ì²¨ë??Œì¼ ?? œ ì¤‘ì¸ ??ª© "fileId-seq" (?´ë‹¹ ???? œ ë²„íŠ¼ ë¹„í™œ?±í™”) */
  const [mentorInfoDeletingKey, setMentorInfoDeletingKey] = useState<
    string | null
  >(null);
  /** ?˜ê°•?•ì¸ì¦?? íš¨???Œë¦¼ ?•ì¸ ???¬ì»¤?¤í•  ?€??*/
  const studyCertFocusAfterAlertRef = useRef<"certText" | "certFile" | null>(
    null,
  );
  /** proGb=03 ?€??? ì²­ ???ë‹´?¼ìÂ·?¥ì†Œ ë°??œê°„ ê²€ì¦??¤íŒ¨ ???¬ì»¤?¤í•  ?„ë“œ */
  const consultFocusAfterAlertRef = useRef<
    "consultDate" | "consultPlaceTime" | null
  >(null);
  /** ?˜ê°•?•ì¸ì¦??? œ ?•ì¸ ëª¨ë‹¬ (seqë§??„ë‹¬, DELETE study-cert API) */
  const [studyCertToDelete, setStudyCertToDelete] = useState<{
    seq: number;
  } | null>(null);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  /** ?™êµê²€?‰ìœ¼ë¡?? íƒ???™êµ ì½”ë“œ ???´ë‹¹ ?™êµ ?™ë…„/ë°??µì…˜ (ê´€ë¦¬ì?˜ì´ì§€?€ ?™ì¼) */
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

  /** ?™ë…„ ë³€ê²????´ë‹¹ ?™ë…„ ë°?ëª©ë¡?¼ë¡œ classOptions ê°±ì‹  */
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
  /** ?˜ê°•?•ì¸ì¦??ì„¸ ì¡°íšŒ ??ëª¨ë‹¬ ?´ê¸° (reqIdë§??¬ìš©) */
  const openStudyCertDetailModal = async (
    row: (typeof studyCertList)[number],
  ) => {
    if (row.seq == null) return;
    if (!loadedReqId) {
      setAlertTitle("?ˆë‚´");
      setAlertMessage(
        "ì¡°íšŒë¥?ì§„í–‰?????†ìŠµ?ˆë‹¤. ?˜ì´ì§€ë¥??ˆë¡œê³ ì¹¨?????¤ì‹œ ?œë„??ì£¼ì„¸??",
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
        setAlertTitle("?ˆë‚´");
        setAlertMessage(
          res?.result === "40"
            ? "?±ë¡???˜ê°•?•ì¸ì¦ì´ ?†ìŠµ?ˆë‹¤."
            : "ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤.",
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
      setAlertTitle("?ˆë‚´");
      setAlertMessage("ì¡°íšŒ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
      setAlertType("danger");
      setShowAlertModal(true);
    }
  };
  /** ?˜ê°•?•ì¸ì¦??±ë¡(? ê·œ) ?ëŠ” ?˜ì •(?ì„¸) API. ?´ìš©Â·?Œì¼ ?„ìˆ˜. */
  const submitStudyCert = async () => {
    if (!proId || !selectedStudentId) return;
    const proSeqNorm = loadedProSeq || "0";
    const isEdit = studyCertDetailSeq != null;
    if (!certFileDesc?.trim()) {
      studyCertFocusAfterAlertRef.current = "certText";
      setAlertTitle("?ˆë‚´");
      setAlertMessage("?´ìš©???…ë ¥?´ì£¼?¸ìš”.");
      setAlertType("danger");
      setShowAlertModal(true);
      return;
    }
    const hasFile = certFile != null && certFile.size > 0;
    const hasExistingFile = isEdit && detailFileInfo != null;
    if (!hasFile && !hasExistingFile) {
      studyCertFocusAfterAlertRef.current = "certFile";
      setAlertTitle("?ˆë‚´");
      setAlertMessage("?˜ê°•?•ì¸ì¦??Œì¼??? íƒ?´ì£¼?¸ìš”.");
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
        setAlertTitle("?ˆë‚´");
        setAlertMessage(
          "?±ë¡Â·?˜ì •??ì§„í–‰?????†ìŠµ?ˆë‹¤. ?˜ì´ì§€ë¥??ˆë¡œê³ ì¹¨?????¤ì‹œ ?œë„??ì£¼ì„¸??",
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
        setAlertTitle("?„ë£Œ");
        setAlertMessage(
          isEdit
            ? "?˜ê°•?•ì¸ì¦ì´ ?˜ì •?˜ì—ˆ?µë‹ˆ??"
            : "?˜ê°•?•ì¸ì¦ì´ ?±ë¡?˜ì—ˆ?µë‹ˆ??",
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
        setAlertTitle("?ˆë‚´");
        setAlertMessage(
          res?.message ??
            (isEdit ? "?˜ì •???¤íŒ¨?ˆìŠµ?ˆë‹¤." : "?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤."),
        );
        setAlertType("danger");
        setShowAlertModal(true);
      }
    } catch {
      setAlertTitle("?ˆë‚´");
      setAlertMessage(
        studyCertDetailSeq != null
          ? "?˜ì • ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."
          : "?±ë¡ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
      );
      setAlertType("danger");
      setShowAlertModal(true);
    } finally {
      setStudyCertSubmitting(false);
    }
  };
  /** ?˜ê°•?•ì¸ì¦?1ê±??? œ (reqIdë§??¬ìš©, POST by-req-id/study-cert/delete?seq=) */
  const deleteStudyCertOne = async () => {
    if (!studyCertToDelete) return;
    if (!loadedReqId) {
      setAlertTitle("?ˆë‚´");
      setAlertMessage(
        "?? œë¥?ì§„í–‰?????†ìŠµ?ˆë‹¤. ?˜ì´ì§€ë¥??ˆë¡œê³ ì¹¨?????¤ì‹œ ?œë„??ì£¼ì„¸??",
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
        setAlertTitle("?„ë£Œ");
        setAlertMessage("?˜ê°•?•ì¸ì¦ì´ ?? œ?˜ì—ˆ?µë‹ˆ??");
        setAlertType("success");
        setShowAlertModal(true);
        setStudyCertToDelete(null);
        // ?? œ ???˜ê°•?•ì¸ì¦?ëª©ë¡ API ?¬í˜¸ì¶œë¡œ ëª©ë¡Â·ë²ˆí˜¸(rnum) ê°±ì‹  (reqId ?¬ìš©)
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
            setAlertTitle("?ˆë‚´");
            setAlertMessage("ëª©ë¡??ê°±ì‹ ?˜ì? ëª»í–ˆ?µë‹ˆ?? ?ˆë¡œê³ ì¹¨??ì£¼ì„¸??");
            setAlertType("danger");
            setShowAlertModal(true);
          }
        } catch {
          setAlertTitle("?ˆë‚´");
          setAlertMessage("ëª©ë¡??ê°±ì‹ ?˜ì? ëª»í–ˆ?µë‹ˆ?? ?ˆë¡œê³ ì¹¨??ì£¼ì„¸??");
          setAlertType("danger");
          setShowAlertModal(true);
        }
      } else {
        setAlertTitle("?ˆë‚´");
        setAlertMessage(res?.message ?? "?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
        setAlertType("danger");
        setShowAlertModal(true);
      }
    } catch {
      setAlertTitle("?ˆë‚´");
      setAlertMessage("?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
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
            aria-label="ë§ˆì´?˜ì´ì§€ ë©”ë‰´ ? íƒ"
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
                <span>? ì²­?•ë³´</span>
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
                <span>?˜ê°•?•ì¸ì¦?/span>
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
                      <div className="sectionTitle">?™ë?ëª¨ì •ë³?/div>
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
                            ë³´í˜¸?ëª…
                          </label>
                          <div className="formControl">
                            <input
                              type="text"
                              id="guardianNamePr05"
                              className="inputField bgGray"
                              value={guardianName}
                              readOnly
                              aria-label="ë³´í˜¸?ëª…"
                            />
                          </div>
                        </div>
                        <div className="fieldUnit">
                          <label
                            htmlFor="guardianContactPr05"
                            className="formLabel"
                          >
                            ?°ë½ì²?
                          </label>
                          <div className="formControl">
                            <input
                              type="tel"
                              id="guardianContactPr05"
                              className="inputField bgGray"
                              value={guardianContact}
                              readOnly
                              aria-label="?°ë½ì²?
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
                            ?ë…„?”ì¼
                          </label>
                          <div className="formControl">
                            <input
                              type="date"
                              id="guardianBirthPr05"
                              className="inputField bgGray"
                              value={guardianBirth}
                              readOnly
                              aria-label="?ë…„?”ì¼"
                            />
                          </div>
                        </div>
                        <div className="fieldUnit">
                          <label
                            htmlFor="guardianRelationPr05"
                            className="formLabel"
                          >
                            ê´€ê³?
                          </label>
                          <div className="formControl">
                            <input
                              type="text"
                              id="guardianRelationPr05"
                              className="inputField bgGray"
                              value={guardianRelationNm}
                              readOnly
                              aria-label="ê´€ê³?
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="formSection">
                    <div className="sectionHeader">
                      <div className="sectionTitle">?™ìƒ?•ë³´</div>
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
                            ?™ìƒëª?
                          </label>
                          <div className="formControl">
                            <input
                              type="text"
                              id="studentNamePr05"
                              className="inputField bgGray"
                              readOnly
                              aria-label="?™ìƒëª?
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
                            ?±ë³„
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
                                <span className="customText">??/span>
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
                                <span className="customText">??/span>
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
                            ?°ë½ì²?
                          </label>
                          <div className="formControl">
                            <input
                              type="tel"
                              id="studentContactPr05"
                              className="inputField bgGray"
                              readOnly
                              aria-label="?°ë½ì²?
                              value={studentContact}
                            />
                          </div>
                        </div>
                        <div className="fieldUnit">
                          <label
                            htmlFor="studentBirthPr05"
                            className="formLabel"
                          >
                            ?ë…„?”ì¼
                          </label>
                          <div className="formControl">
                            <input
                              type="date"
                              id="studentBirthPr05"
                              className="inputField bgGray"
                              readOnly
                              aria-label="?ë…„?”ì¼"
                              value={studentBirth}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="formRow">
                        <span className="formLabel">ì£¼ì†Œ</span>
                        <div className="formControl addressContainer">
                          <div className="inputWithBtn">
                            <input
                              type="text"
                              className="inputField bgGray"
                              readOnly
                              title="ì£¼ì†Œ"
                              aria-label="ì£¼ì†Œ"
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
                      <div className="sectionTitle">?™êµ?•ë³´</div>
                    </div>
                    <div className="formGrid">
                      <div className="formRow">
                        <span className="formLabel" id="lblSchoolNamePr05">
                          ?™êµëª?
                        </span>
                        <div className="formControl inputWithBtn">
                          <input
                            type="text"
                            className="inputField bgGray"
                            readOnly
                            title="?™êµëª?ë°??™ë…„?•ë³´"
                            aria-label="?™êµëª?ë°??™ë…„?•ë³´"
                            value={[
                              schoolNm,
                              schoolLvl ? `${schoolLvl}?™ë…„` : "",
                              schoolNo ? `${schoolNo}ë°? : "",
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
                        {isProGb07 ? "?ë°©êµ??" : "ê°•ì—°?•ë³´"}
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
                            ? "?ë°©êµ?? ëª©ë¡ ? íƒ"
                            : "ê°•ì—°(?Œì°¨) ëª©ë¡ ? íƒ"
                        }
                      >
                        <caption className="blind">
                          {isProGb07
                            ? "? íƒ, êµ??, ì§€?? ?ë°©ì£¼ì œ, ?¼ì •, ?¸ì›(ëª????¬í•¨???ë°©êµ?? ëª©ë¡"
                            : "? íƒ, ?¼ì‹œ, ë¶„ì•¼, ê°•ì—°?? ì£¼ì œ, ?¸ì›(ëª????¬í•¨??ê°•ì—°?•ë³´ ëª©ë¡"}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col" className="colSelect" title="? íƒ">
                              <span className="requiredMark" aria-hidden="true">
                                *
                              </span>
                              ? íƒ
                            </th>
                            {!isProGb07 && (
                              <th scope="col" title="?¼ì‹œ">
                                ?¼ì‹œ
                              </th>
                            )}
                            {isProGb07 ? (
                              <>
                                <th scope="col" title="êµ??">
                                  êµ??
                                </th>
                                <th scope="col" title="ì§€??>
                                  ì§€??
                                </th>
                                <th scope="col" title="?ë°©ì£¼ì œ">
                                  ?ë°©ì£¼ì œ
                                </th>
                                <th scope="col" title="?¼ì •">
                                  ?¼ì •
                                </th>
                              </>
                            ) : (
                              <>
                                <th scope="col" title="ë¶„ì•¼">
                                  ë¶„ì•¼
                                </th>
                                <th scope="col" title="ê°•ì—°??>
                                  ê°•ì—°??
                                </th>
                                <th scope="col" title="ì£¼ì œ">
                                  ì£¼ì œ
                                </th>
                              </>
                            )}
                            <th scope="col" title="?¸ì›(ëª?">
                              ?¸ì›(ëª?
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleList05Loading ? (
                            <tr>
                              <td colSpan={6} className="emptyCell">
                                {isProGb07
                                  ? "?ë°©êµ?? ëª©ë¡??ë¶ˆëŸ¬?¤ëŠ” ì¤‘ì…?ˆë‹¤."
                                  : "ê°•ì—° ëª©ë¡??ë¶ˆëŸ¬?¤ëŠ” ì¤‘ì…?ˆë‹¤."}
                              </td>
                            </tr>
                          ) : scheduleList05.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="emptyCell">
                                {isProGb07
                                  ? "?±ë¡???ë°©êµ?? ?¼ì •???†ìŠµ?ˆë‹¤."
                                  : "?±ë¡??ê°•ì—°(?Œì°¨)???†ìŠµ?ˆë‹¤."}
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
                                ? `${tourRowLabel || "?ë°© ?¼ì •"} ? íƒ`
                                : `${dateTimeStr} ? íƒ`;
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
                      <div className="sectionTitle">ì²¨ë??Œì¼</div>
                    </div>
                    <div className="formGrid">
                      <div className="formRow">
                        <span className="formLabel">
                          ì²¨ë??Œì¼
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
                                aria-label="ì²¨ë??Œì¼ ì¶”ê?"
                              />
                              <label
                                htmlFor={fileInput05Id}
                                className="btnFileAdd"
                                aria-label="ì²¨ë??Œì¼ ì¶”ê?"
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
                              ì²¨ë????Œì¼???†ìŠµ?ˆë‹¤.
                            </span>
                          ) : (
                            <>
                              {existingFiles.map((file) => {
                                const viewUrl = `${API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? ""}/api/v1/files/view?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                                const fileLabel =
                                  file.orgfNm ?? `?Œì¼ ${file.seq}`;
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
                                        aria-label={`${fileLabel} ?Œì¼ ?? œ`}
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
                                      aria-label={`${file.name} ?Œì¼ ?œê±°`}
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
                      <div className="sectionTitle">?™ë?ëª¨ì •ë³?/div>
                      {fromMypage && !isProGb03 && (
                        <button
                          type="button"
                          className="btnPr btnHistory"
                          id="btnHistory"
                          onClick={openHistoryModal}
                        >
                          ë³€ê²½ì´??
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
                                ë³´í˜¸?ëª…
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="guardianName"
                                  className="inputField bgGray"
                                  value={guardianName}
                                  readOnly
                                  aria-label="ë³´í˜¸?ëª…"
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label
                                htmlFor="guardianContact"
                                className="formLabel"
                              >
                                ?°ë½ì²?
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="guardianContact"
                                  className="inputField bgGray"
                                  value={guardianContact}
                                  readOnly
                                  aria-label="?°ë½ì²?
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
                                ?ë…„?”ì¼
                              </label>
                              <div className="formControl">
                                <input
                                  type="date"
                                  id="guardianBirth"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="?ë…„?”ì¼"
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
                                ë³´í˜¸?ëª…
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="guardianName"
                                  className="inputField bgGray"
                                  value={guardianName}
                                  readOnly
                                  aria-label="ë³´í˜¸?ëª…"
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label
                                htmlFor="householdName"
                                className="formLabel"
                              >
                                ?¸ë?ì£¼ëª…
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="householdName"
                                  className={`inputField ${isReadOnlyForm ? "bgGray" : ""}`}
                                  placeholder="?¸ë?ì£¼ëª…???…ë ¥?´ì£¼?¸ìš”"
                                  value={householdName}
                                  onChange={(e) =>
                                    setHouseholdName(e.target.value)
                                  }
                                  readOnly={isReadOnlyForm}
                                  aria-label="?¸ë?ì£¼ëª…"
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
                                ?„í™”ë²ˆí˜¸
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="guardianContact"
                                  className="inputField bgGray"
                                  value={guardianContact}
                                  readOnly
                                  aria-label="?„í™”ë²ˆí˜¸"
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label htmlFor="guardianId" className="formLabel">
                                ì£¼ë?ë²ˆí˜¸
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="guardianId"
                                  className="inputField bgGray"
                                  value={maskIhidnum(guardianId)}
                                  readOnly
                                  aria-label="ì£¼ë?ë²ˆí˜¸"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="formRow">
                            <span className="formLabel">ê³„ì¢Œë²ˆí˜¸</span>
                            <div className="formControl accountGroup">
                              <select
                                className="selectField"
                                aria-label="?€??? íƒ"
                                value={payBankCode}
                                onChange={(e) => setPayBankCode(e.target.value)}
                              >
                                <option value="">?€??? íƒ</option>
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
                                placeholder="?ˆê¸ˆì£¼ë? ?…ë ¥?´ì£¼?¸ìš”"
                                aria-label="?ˆê¸ˆì£?
                                value={holderNm}
                                onChange={(e) => setHolderNm(e.target.value)}
                              />
                              <input
                                type="text"
                                className="inputField"
                                placeholder="ê³„ì¢Œë²ˆí˜¸ë¥??…ë ¥?´ì£¼?¸ìš”"
                                aria-label="ê³„ì¢Œë²ˆí˜¸"
                                value={payBank}
                                onChange={(e) => setPayBank(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="formRow">
                            <span className="formLabel">?¤ì?€ ê°€êµ??¬ë?</span>
                            <div className="formControl group">
                              <div
                                className="customGroup"
                                role="radiogroup"
                                aria-label="?¤ì?€ ê°€êµ??¬ë?"
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
                                    <span className="customText">?´ë‹¹</span>
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
                                    <span className="customText">?´ë‹¹?†ìŒ</span>
                                  </div>
                                </label>
                              </div>
                              <input
                                type="text"
                                className="inputField inlineInput"
                                placeholder="?ë? ???…ë ¥"
                                aria-label="?ë? ??
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
                      <div className="sectionTitle">?™ìƒ?•ë³´</div>
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
                                ?™ìƒëª?
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
                                    aria-label="?™ìƒëª?
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
                                    aria-label="?™ìƒëª?? íƒ"
                                  >
                                    <option value="">
                                      ?´ë¦„??? íƒ?´ì£¼?¸ìš”
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
                                ?±ë³„
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
                                    <span className="customText">??/span>
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
                                    <span className="customText">??/span>
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
                                ?°ë½ì²?
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="studentContact"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="?°ë½ì²?
                                  value={studentContact}
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label
                                htmlFor="studentBirth"
                                className="formLabel"
                              >
                                ?ë…„?”ì¼
                              </label>
                              <div className="formControl">
                                <input
                                  type="date"
                                  id="studentBirth"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="?ë…„?”ì¼"
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
                                ?™ìƒëª?
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
                                    aria-label="?™ìƒëª?
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
                                    aria-label="?™ìƒëª?? íƒ"
                                  >
                                    <option value="">
                                      ?´ë¦„??? íƒ?´ì£¼?¸ìš”
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
                                ?ë…„?”ì¼
                              </label>
                              <div className="formControl">
                                <input
                                  type="date"
                                  id="studentBirth"
                                  className="inputField bgGray"
                                  readOnly
                                  aria-label="?ë…„?”ì¼"
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
                                ?°ë½ì²?
                              </label>
                              <div className="formControl">
                                <input
                                  type="tel"
                                  id="studentContact"
                                  className="inputField bgGray"
                                  placeholder="?«ìë§??…ë ¥?´ì£¼?¸ìš”"
                                  readOnly
                                  aria-label="?°ë½ì²?
                                  value={studentContact}
                                />
                              </div>
                            </div>
                            <div className="fieldUnit">
                              <label htmlFor="studentId" className="formLabel">
                                ì£¼ë?ë²ˆí˜¸
                              </label>
                              <div className="formControl">
                                <input
                                  type="text"
                                  id="studentId"
                                  className="inputField bgGray"
                                  placeholder="ì£¼ë?ë²ˆí˜¸ë¥??…ë ¥?´ì£¼?¸ìš”"
                                  readOnly
                                  aria-label="ì£¼ë?ë²ˆí˜¸"
                                  value={maskIhidnum(studentId)}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="formRow">
                            <span className="formLabel">ì£¼ì†Œ</span>
                            <div className="formControl addressContainer">
                              <div className="inputWithBtn">
                                <input
                                  type="text"
                                  className="inputField bgGray"
                                  readOnly
                                  title="ì£¼ì†Œ"
                                  aria-label="ì£¼ì†Œ"
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
                                  ì£¼ì†Œê²€??
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
                        <div className="sectionTitle">?™êµ?•ë³´</div>
                      </div>
                      <div className="formGrid">
                        <div className="formRow">
                          <span className="formLabel" id="lblSchoolNameCt">
                            ?™êµëª?
                          </span>
                          <div className="formControl inputWithBtn">
                            <input
                              type="text"
                              className="inputField bgGray"
                              readOnly
                              title="?™êµëª?ë°??™ë…„?•ë³´"
                              aria-label="?™êµëª?ë°??™ë…„?•ë³´"
                              value={[
                                schoolNm,
                                schoolLvl ? `${schoolLvl}?™ë…„` : "",
                                schoolNo ? `${schoolNo}ë°? : "",
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
                        <div className="sectionTitle">?ë‹´?•ë³´</div>
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
                          aria-label="?‘ìˆ˜?„í™©"
                        >
                          ?‘ìˆ˜?„í™©
                        </button>
                      </div>
                      <div className="formGrid">
                        <div className="formRow split">
                          <div className="fieldUnit">
                            <label htmlFor="consultField" className="formLabel">
                              ?ë‹´ë¶„ì•¼
                            </label>
                            <div className="formControl">
                              <select
                                id="consultField"
                                className={`selectField ${isReadOnlyForm ? "bgGray" : ""}`}
                                aria-label="?ë‹´ë¶„ì•¼ ? íƒ"
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
                              ?ë‹´?¼ì
                            </label>
                            <div className="formControl">
                              <input
                                type="date"
                                id="consultDate"
                                className={`inputField ${isReadOnlyForm ? "bgGray" : ""}`}
                                aria-label="?ë‹´?¼ì ? íƒ"
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
                              ?¥ì†Œ ë°??œê°„
                            </label>
                            <div className="formControl">
                              <select
                                id="consultPlaceTime"
                                className={`selectField ${isReadOnlyForm ? "bgGray" : ""}`}
                                aria-label="?¥ì†Œ ë°??œê°„ ? íƒ"
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
                            ?”ì²­?¬í•­
                          </label>
                          <div className="formControl">
                            <textarea
                              id="requestDesc"
                              className={`textAreaField ${isReadOnlyForm ? "bgGray" : ""}`}
                              placeholder="?”ì²­?¬í•­???…ë ¥?´ì£¼?¸ìš”"
                              aria-label="?”ì²­?¬í•­"
                              value={requestDesc}
                              onChange={(e) => setRequestDesc(e.target.value)}
                              readOnly={isReadOnlyForm}
                            />
                          </div>
                        </div>
                        <div className="formRow">
                          <span className="formLabel">
                            ì²¨ë??Œì¼
                            {canSaveOrApply && !isReadOnlyForm && (
                              <>
                                <input
                                  type="file"
                                  id="attachFilesCt"
                                  className="hiddenInput"
                                  multiple
                                  aria-label="ì²¨ë??Œì¼ ì¶”ê?"
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
                                  aria-label="ì²¨ë??Œì¼ ì¶”ê?"
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
                                ì²¨ë????Œì¼???†ìŠµ?ˆë‹¤.
                              </span>
                            ) : (
                              <>
                                {existingFiles.map((file) => {
                                  const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                                  const fileLabel =
                                    file.orgfNm ?? `?Œì¼ ${file.seq}`;
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
                                          aria-label={`${fileLabel} ?Œì¼ ?? œ`}
                                          onClick={(ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            if (!canSaveOrApply) {
                                              showAlert(
                                                "?Œë¦¼",
                                                fromMypage
                                                  ? "?´ë? ? ì²­ ?„ë£Œ??ì§€?ì‚¬?…ì? ?˜ì •?????†ìŠµ?ˆë‹¤."
                                                  : "?˜ì •?€ MY PAGE?ì„œë§?ê°€?¥í•©?ˆë‹¤.\n?´ë? ? ì²­ ?„ë£Œ??ì§€?ì‚¬?…ì? ?˜ì •?????†ìŠµ?ˆë‹¤.",
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
                                        aria-label={`${file.name} ?Œì¼ ?œê±°`}
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
                            <div className="sectionTitle">ë©˜í† ì§€??/div>
                          </div>
                          <div className="formGrid">
                            <div className="formRow split">
                              <div className="fieldUnit">
                                <label className="formLabel">ë©˜í† ëª?/label>
                                <div className="formControl">
                                  <input
                                    type="text"
                                    className="inputField bgGray"
                                    readOnly
                                    aria-label="ë©˜í† ëª?
                                    value={mentorInfo?.advEsntlNm ?? ""}
                                  />
                                </div>
                              </div>
                              <div className="fieldUnit">
                                <label className="formLabel">?°ë½ì²?/label>
                                <div className="formControl">
                                  <input
                                    type="text"
                                    className="inputField bgGray"
                                    readOnly
                                    aria-label="?°ë½ì²?
                                    value={mentorInfo?.mbtlnum ?? ""}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="formRow">
                              <label className="formLabel">ë©˜í† ?Œê°œ</label>
                              <div className="formControl">
                                <textarea
                                  className="textAreaField bgGray"
                                  readOnly
                                  aria-label="ë©˜í† ?Œê°œ"
                                  rows={3}
                                  value={mentorInfo?.profileDesc ?? ""}
                                />
                              </div>
                            </div>
                          </div>
                        </section>
                        <section className="formSection">
                          <div className="sectionHeader">
                            <div className="sectionTitle">ë©˜í† ?•ë³´</div>
                          </div>
                          <div className="formGrid">
                            <div className="formRow split">
                              <div className="fieldUnit">
                                <label className="formLabel">?ë‹´?¥ì†Œ</label>
                                <div className="formControl">
                                  <input
                                    type="text"
                                    className={`inputField ${fromMentorWork ? "" : "bgGray"}`}
                                    readOnly={!fromMentorWork}
                                    aria-label="?ë‹´?¥ì†Œ"
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
                                <label className="formLabel">?ë‹´?œê°„</label>
                                <div className="formControl">
                                  {fromMentorWork ? (
                                    <div
                                      className="flex items-center gap-1 flex-wrap"
                                      style={{ gap: "0.25rem 0.5rem" }}
                                    >
                                      <select
                                        className="inputField"
                                        style={{ minWidth: "4rem" }}
                                        aria-label="?ë‹´ ?œì‘ ??
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
                                            {h}??
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className="inputField"
                                        style={{ minWidth: "4rem" }}
                                        aria-label="?ë‹´ ?œì‘ ë¶?
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
                                            {m}ë¶?
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
                                        aria-label="?ë‹´ ì¢…ë£Œ ??
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
                                            {h}??
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className="inputField"
                                        style={{ minWidth: "4rem" }}
                                        aria-label="?ë‹´ ì¢…ë£Œ ë¶?
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
                                            {m}ë¶?
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      className="inputField bgGray"
                                      readOnly
                                      aria-label="?ë‹´?œê°„"
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
                              <label className="formLabel">?ë‹´?´ìš©</label>
                              <div className="formControl">
                                <textarea
                                  className={`textAreaField ${fromMentorWork ? "" : "bgGray"}`}
                                  readOnly={!fromMentorWork}
                                  aria-label="?ë‹´?´ìš©"
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
                              <label className="formLabel">?¬ìœ </label>
                              <div className="formControl">
                                <textarea
                                  className={`textAreaField ${fromMentorWork ? "" : "bgGray"}`}
                                  readOnly
                                  aria-readonly="true"
                                  aria-label="?¬ìœ "
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
                                ì²¨ë??Œì¼
                                {fromMentorWork && effectiveReqId && (
                                  <>
                                    <input
                                      ref={mentorInfoFileInputRef}
                                      type="file"
                                      id="mentorInfoAttachFiles"
                                      className="hiddenInput"
                                      multiple
                                      accept=".pdf,.hwp,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                                      aria-label="ì²¨ë??Œì¼ ì¶”ê?"
                                      onChange={handleMentorInfoFileUpload}
                                      disabled={mentorInfoFileLoading}
                                    />
                                    <label
                                      htmlFor="mentorInfoAttachFiles"
                                      className="btnFileAdd"
                                      aria-label="ì²¨ë??Œì¼ ì¶”ê?"
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
                                    ì²¨ë????Œì¼???†ìŠµ?ˆë‹¤.
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
                                        file.orgfNm ?? `?Œì¼ ${seq}`;
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
                                              aria-label={`${fileLabel} ?Œì¼ ?? œ`}
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
                                            aria-label={`${fileLabel} ?Œì¼ ? íƒ ì·¨ì†Œ`}
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
                          <div className="sectionTitle">?™êµ?•ë³´</div>
                        </div>
                        <div className="formGrid">
                          <div className="formRow">
                            <span className="formLabel" id="lblSchoolNamePr">
                              ?™êµëª?
                            </span>
                            <div className="formControl inputWithBtn">
                              <input
                                type="text"
                                className="inputField bgGray"
                                readOnly
                                title="?™êµëª?ë°??™ë…„?•ë³´"
                                aria-label="?™êµëª?ë°??™ë…„?•ë³´"
                                value={[
                                  schoolNm,
                                  schoolLvl ? `${schoolLvl}?™ë…„` : "",
                                  schoolNo ? `${schoolNo}ë°? : "",
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
                          <div className="sectionTitle">ì²¨ë??Œì¼</div>
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
                                      ì²¨ë????Œì¼???†ìŠµ?ˆë‹¤.
                                    </span>
                                  ) : (
                                    <>
                                      {existingForRow.map((file) => {
                                        const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                                        const fileLabel =
                                          file.orgfNm ?? `?Œì¼ ${file.seq}`;
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
                                                aria-label={`${fileLabel} ?Œì¼ ?? œ`}
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
                                              aria-label={`${pendingForRow.name} ?Œì¼ ?? œ`}
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
                      aria-label="?€??
                    >
                      {mentorInfoSaveLoading ? "?€??ì¤‘â€? : "?€??}
                    </button>
                    <button
                      type="button"
                      className="btnSubmit"
                      onClick={handleSaveMentorInfo}
                      disabled={
                        mentorInfoSaveLoading || loadedSttusCode === "04"
                      }
                      aria-label="?„ë£Œ"
                    >
                      {mentorInfoSaveLoading ? "?„ë£Œ ì¤‘â€? : "?„ë£Œ"}
                    </button>
                    <button
                      type="button"
                      className="btnWhite"
                      onClick={openRejectModal}
                      aria-label="ë°˜ë ¤"
                    >
                      ë°˜ë ¤
                    </button>
                    <button
                      type="button"
                      className="btnWhite"
                      onClick={() => router.back()}
                      aria-label="?«ê¸°"
                    >
                      ?«ê¸°
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
                            ? "?™ìƒ ? íƒ ë°??ë‹´ ?•ë³´ ì´ˆê¸°??
                            : proGb === "05"
                              ? "ê°•ì—°?•ë³´ ë°?ì²¨ë??Œì¼ ì´ˆê¸°??
                              : "?¸ë?ì£¼ëª… ë°??™ìƒ ? íƒ ì´ˆê¸°??
                        }
                      >
                        ì´ˆê¸°??
                      </button>
                    )}
                    <button
                      type="button"
                      className="btnWhite"
                      onClick={() => handleSubmitArtappm("01")}
                      aria-label="?„ì‹œ?€??
                      disabled={!canSaveOrApply}
                    >
                      ?„ì‹œ?€??
                    </button>
                    <button
                      type="submit"
                      className="btnSubmit"
                      disabled={!canSaveOrApply}
                    >
                      ? ì²­
                    </button>
                    {fromMypage && (
                      <button
                        type="button"
                        className="btnSubmit"
                        onClick={() => {
                          if (loadedSttusCode === "99") {
                            showAlert(
                              "?Œë¦¼",
                              "?´ë? ì·¨ì†Œ??ê±´ì…?ˆë‹¤.",
                              "danger",
                            );
                            return;
                          }
                          setShowCancelConfirm(true);
                        }}
                        aria-label="? ì²­ ì·¨ì†Œ"
                        disabled={loadedSttusCode === "99"}
                      >
                        ì·¨ì†Œ
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
                <div className="sectionTitle">?˜ê°• ?•ì¸ì¦?/div>
                <button
                  type="button"
                  className="btnApply btnPr"
                  id="btnRegCert"
                  onClick={openRegCertModal}
                >
                  ?˜ê°•?•ì¸ì¦??±ë¡
                </button>
              </div>
              <div className="tableWrapper">
                <table className="certTable">
                  <caption className="blind">
                    ë²ˆí˜¸, ?´ìš©, ?¼ì, ?íƒœë¥??¬í•¨???˜ê°• ?•ì¸ì¦?ëª©ë¡
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="colNum">
                        ë²ˆí˜¸
                      </th>
                      <th scope="col" className="colContent">
                        ?´ìš©
                      </th>
                      <th scope="col" className="colDate">
                        ?¼ì
                      </th>
                      <th scope="col" className="colState">
                        ?íƒœ
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
                          ?±ë¡???˜ê°•?•ì¸ì¦ì´ ?†ìŠµ?ˆë‹¤.
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
                                  aria-label={`${row.fileDesc ?? "?˜ê°•?•ì¸ì¦?} ?ì„¸`}
                                >
                                  ?ì„¸
                                </button>
                                <button
                                  type="button"
                                  className="btnDelete"
                                  onClick={() =>
                                    row.seq != null &&
                                    setStudyCertToDelete({ seq: row.seq })
                                  }
                                  aria-label={`${row.fileDesc ?? "?˜ê°•?•ì¸ì¦?} ?? œ`}
                                >
                                  ?? œ
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
                  ë³€ê²½ì´??
                </div>
                <button
                  type="button"
                  className="closeBtn"
                  id="closeHistoryModal"
                  aria-label="?«ê¸°"
                  onClick={closeHistoryModal}
                >
                  &times;
                </button>
              </div>
              <div className="modalBody">
                {changeListLoading ? (
                  <p className="historyList" style={{ padding: "16px 0" }}>
                    ì¡°íšŒ ì¤?..
                  </p>
                ) : (
                  <ul className="historyList">
                    {changeList.length === 0 ? (
                      <li className="historyItem">
                        <div className="historyContent">
                          ë³€ê²½ì´?¥ì´ ?†ìŠµ?ˆë‹¤.
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
                    ? "?˜ê°•?•ì¸ì¦??ì„¸"
                    : "?˜ê°•?•ì¸ì¦??±ë¡"}
                </div>
                <button
                  type="button"
                  className="closeBtn"
                  id="closeRegCertModal"
                  aria-label="?«ê¸°"
                  onClick={closeRegCertModal}
                >
                  &times;
                </button>
              </div>
              <div className="modalBody">
                <div className="formGrid bizInput">
                  <div className="formRow">
                    <label htmlFor="certDate" className="formLabel">
                      ?¼ì
                    </label>
                    <div className="formControl">
                      <input
                        type="date"
                        id="certDate"
                        className="inputField"
                        title={
                          studyCertDetailSeq != null
                            ? "?¼ì"
                            : "?¼ì (?¤ëŠ˜ ? ì§œ ê³ ì •)"
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
                      ?´ìš©
                    </label>
                    <div className="formControl">
                      <textarea
                        id="certText"
                        className="textAreaField"
                        placeholder="?´ìš©???…ë ¥?´ì£¼?¸ìš”"
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
                      ì²¨ë??Œì¼
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
                            alt="?Œì¼ ì¶”ê?"
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
                              aria-label="?Œì¼ ?? œ"
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
                                    detailFileInfo.orgfNm ?? "ì²¨ë??Œì¼";
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
                              : (detailFileInfo.orgfNm ?? "ì²¨ë??Œì¼")}
                          </span>
                        </div>
                      ) : (
                        <span className="filePlaceholder">
                          ? íƒ???Œì¼ ?†ìŒ
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
                        ? "?˜ì • ì¤‘â€?
                        : "?±ë¡ ì¤‘â€?
                      : studyCertDetailSeq != null
                        ? "?˜ì •?˜ê¸°"
                        : "?±ë¡?˜ê¸°"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ë°˜ë ¤ ëª¨ë‹¬ (ë©˜í† ?¼ì? fromMentorWork): ?¬ìœ  ?…ë ¥ - ?˜ê°•?•ì¸ì¦?ëª¨ë‹¬ê³??™ì¼ UI(studyCertRegModal) */}
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
            <div id="rejectModalTitle">ë°˜ë ¤ ?¬ìœ </div>
            <button
              type="button"
              className="closeBtn"
              id="closeRejectModal"
              aria-label="?«ê¸°"
              onClick={closeRejectModal}
            >
              &times;
            </button>
          </div>
          <div className="modalBody">
            <div className="formGrid bizInput">
              <div className="formRow">
                <label htmlFor="rejectReason" className="formLabel">
                  ?¬ìœ 
                </label>
                <div className="formControl">
                  <textarea
                    id="rejectReason"
                    className="textAreaField"
                    placeholder="ë°˜ë ¤ ?¬ìœ ë¥??…ë ¥?´ì£¼?¸ìš”"
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
                          "?„ë£Œ",
                          res?.message ?? "?€?¥ë˜?ˆìŠµ?ˆë‹¤.",
                          "success",
                        );
                      } else {
                        showAlert(
                          "?€???¤íŒ¨",
                          res?.message ?? "?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.",
                          "danger",
                        );
                      }
                    })
                    .catch(() => {
                      showAlert(
                        "?Œë¦¼",
                        "?€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
                        "danger",
                      );
                    })
                    .finally(() => setRejectSaveLoading(false));
                }}
              >
                {rejectSaveLoading
                  ? "?€??ì¤‘â€?
                  : loadedSttusCode === "11"
                    ? "?€??
                    : "ë°˜ë ¤"}
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
        title="?•ì¸"
        message="ì²¨ë??Œì¼???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?"
        cancelText="?«ê¸°"
        confirmText="?? œ"
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
        title="?•ì¸"
        message="?˜ê°•?•ì¸ì¦ì„ ?? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?"
        cancelText="?«ê¸°"
        confirmText="?? œ"
        onCancel={() => setStudyCertToDelete(null)}
        onConfirm={deleteStudyCertOne}
      />
      <ConfirmModal
        isOpen={showCancelConfirm}
        title="?•ì¸"
        message="? ì²­??ì·¨ì†Œ?˜ì‹œê² ìŠµ?ˆê¹Œ?"
        cancelText="?«ê¸°"
        confirmText="ì·¨ì†Œ"
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
