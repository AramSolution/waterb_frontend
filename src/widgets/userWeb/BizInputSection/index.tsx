"use client";

import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiClient,
  downloadWaterbAttachmentOrOpenView,
  TokenUtils,
  openSirenPassBlankWindow,
  tryCloseSirenPassWindow,
  postSirenCreateTokenAndSubmit,
  getSirenTokenAuthRetUrlForApply,
} from "@/shared/lib";
import { API_CONFIG, API_ENDPOINTS, EDREAM_CERT_SIREN } from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { UserArmchilService } from "@/entities/userWeb/armchil/api";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import SchoolSearchModal, {
  type SchoolItem,
} from "@/widgets/userWeb/SchoolSearchModal";

/** gunsan bizInput.htmlê³??™ì¼: ì²¨ë??Œì¼ ?„ì´ì½˜ì? userWeb/icon (ico_file_add, ico_file_del, ico_file_*) */
const ICON = "/images/userWeb/icon";

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

/** ?•ì¥?ë¡œ gunsan ?¤í????Œì¼ ?€???´ë˜??ë°˜í™˜ (.file.hwp, .file.pdf ?? */
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

/* ë³¸ì¸?¸ì¦ */
const fetchData = async () => {
  try {
    console.log("?”µ ë³¸ì¸?¸ì¦ ?”ì²­ ?œì‘");

    // URLSearchParamsë¥??¬ìš©?˜ì—¬ x-www-form-urlencoded ?•ì‹?¼ë¡œ ë³€??
    const params = new URLSearchParams();
    params.append("srvNo", "017001");
    params.append("retUrl", getSirenTokenAuthRetUrlForApply());

    console.log("?“¤ ?”ì²­ ?°ì´??", params.toString());

    // /backend ê²½ë¡œë¥??¬ìš©?˜ì—¬ rewritesë¡?ë°±ì—”??API ?¸ì¶œ
    const response = await axios.post(
      EDREAM_CERT_SIREN.TOKEN_AUTH,
      params, // URLSearchParams ê°ì²´
      {
        // Config ê°ì²´ (?¤ë” ?¤ì •)
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: TokenUtils.getToken(),
        },
        timeout: 10000, // 10ì´??€?„ì•„??
        withCredentials: true, // ì¿ í‚¤ ?¬í•¨
      },
    );

    let oldForm = document.getElementById("reqCBAForm");
    if (oldForm) {
      oldForm.remove();
    }

    const newForm = document.createElement("form");
    newForm.id = "reqCBAForm";
    newForm.name = "reqCBAForm";
    newForm.method = "post";
    document.body.appendChild(newForm);

    addHiddenInput("reqCBAForm", "id", response.data.id);
    addHiddenInput("reqCBAForm", "srvNo", response.data.srvNo);
    addHiddenInput("reqCBAForm", "reqNum", response.data.reqNum);
    addHiddenInput("reqCBAForm", "certGb", response.data.certGb);
    addHiddenInput("reqCBAForm", "retUrl", response.data.retUrl);
    addHiddenInput("reqCBAForm", "verSion", response.data.verSion);
    addHiddenInput("reqCBAForm", "certDate", response.data.certDate);

    console.log("???±ê³µ:", response.data);
    console.log("???‘ë‹µ ?íƒœ:", response.status);
    console.log("???‘ë‹µ ?¤ë”:", response.headers);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("??Axios ?ëŸ¬ ë°œìƒ");
      console.error("?íƒœ ì½”ë“œ:", error.response?.status);
      console.error("?‘ë‹µ ?°ì´??", error.response?.data);
      console.error("?‘ë‹µ ?¤ë”:", error.response?.headers);
      console.error("?”ì²­ URL:", error.config?.url);
      console.error("?”ì²­ ë©”ì„œ??", error.config?.method);
      console.error("?”ì²­ ?¤ë”:", error.config?.headers);
      console.error("?”ì²­ ë°”ë””:", error.config?.data);
    } else {
      console.error("???¼ë°˜ ?ëŸ¬:", error);
    }
  }
};

const createToken = async () => {
  const passPopup = openSirenPassBlankWindow();
  if (!passPopup || passPopup.closed) {
    console.error("ë³¸ì¸?¸ì¦ ?ì—…??ì°¨ë‹¨?˜ì—ˆ?µë‹ˆ??");
    return;
  }
  try {
    const formElements = document.getElementsByName("reqCBAForm");
    const formElement = formElements[0] as HTMLFormElement;
    if (!formElement) {
      console.error("?¼ì„ ì°¾ì„ ???†ìŠµ?ˆë‹¤.");
      tryCloseSirenPassWindow(passPopup);
      return;
    }
    await postSirenCreateTokenAndSubmit(
      formElement,
      addHiddenInput,
      TokenUtils.getToken(),
    );
  } catch (error) {
    tryCloseSirenPassWindow(passPopup);
    console.error("???¼ë°˜ ?ëŸ¬:", error);
  }
};

const addHiddenInput = (formId: string, name: string, value: string) => {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;

  const form = document.getElementById(formId);
  form?.appendChild(input);
};

/**
 * bizInput.html ë³¸ë¬¸ êµ¬ì¡° ? ì? (?´ë˜?¤ëª…Â·idÂ·?‘ê·¼?±Â·DOM êµ¬ì¡° ?™ì¼)
 * ?ë³¸: source/gunsan/bizInput.html
 * ?™ì‘: ? ì²­ë¶„ì•¼ ì²´í¬ ???´ë‹¹ ??input ?œì„±??ë¹„í™œ?±í™” (?ë³¸ ?¤í¬ë¦½íŠ¸?€ ?™ì¼)
 * ?œì‹œ ?œì„œ: ?¸ë¬¸, ê³¼í•™, ?ˆì²´?? ?¸ì„±, ê¸°í? (DB REQ_PART ?œì„œ???¸ë¬¸, ?ˆì²´?? ê³¼í•™, ?¸ì„±, ê¸°í?)
 */
const FIELD_OPTIONS = [
  {
    name: "field",
    value: "humanities",
    label: "?¸ë¬¸",
    placeholder: "ex)ë¬¸í•™, ?´í•™, ??‚¬, ë¬¸í™”?‰ì‚¬ ??,
    ariaLabel: "?¸ë¬¸ ë¶„ì•¼ ?ì„¸ ?´ìš©",
  },
  {
    name: "field",
    value: "science",
    label: "ê³¼í•™",
    placeholder: "ex)ê¸°ê³„, ê³µí•™, ?˜ê²½, ì»´í“¨?? ?µì‹ , ë°©ì†¡ ë¯¸ë””????,
    ariaLabel: "ê³¼í•™ ë¶„ì•¼ ?ì„¸ ?´ìš©",
  },
  {
    name: "field",
    value: "arts",
    label: "?ˆì²´??,
    placeholder: "ex)?Œì•…, ë¯¸ìˆ , ê±´ì¶•, ?¬ì§„, ?¤í¬ì¸???,
    ariaLabel: "?ˆì²´??ë¶„ì•¼ ?ì„¸ ?´ìš©",
  },
  {
    name: "field",
    value: "character",
    label: "?¸ì„±",
    placeholder: "ex)ë´‰ì‚¬, ?ë‹´, ?˜ê²½ë³´í˜¸, ìº í˜?¸í™œ????,
    ariaLabel: "?¸ì„± ë¶„ì•¼ ?ì„¸ ?´ìš©",
  },
  {
    name: "field",
    value: "etc",
    label: "ê¸°í?",
    placeholder: "ex)?¸ë˜?? êµ?† ?€?¥ì •, ë² ì´?? ì¡°ì‚¬?œë™ ??,
    ariaLabel: "ê¸°í? ë¶„ì•¼ ?ì„¸ ?´ìš©",
  },
] as const;

/** DB REQ_PART ?„ë“œ ?œì„œ: ?¸ë¬¸, ê³¼í•™, ?ˆì²´?? ?¸ì„±, ê¸°í?. êµ¬ë¶„??single |, N=ë¯¸ì²´?? Y|ê°?ì²´í¬+?ìŠ¤??*/
const REQ_PART_ORDER: string[] = [
  "humanities",
  "science",
  "arts",
  "character",
  "etc",
];

function parseReqPart(reqPart: string): {
  checked: Record<string, boolean>;
  values: Record<string, string>;
} {
  const checked: Record<string, boolean> = {
    humanities: false,
    arts: false,
    science: false,
    character: false,
    etc: false,
  };
  const values: Record<string, string> = {
    humanities: "",
    arts: "",
    science: "",
    character: "",
    etc: "",
  };
  const tokens = reqPart
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  let ti = 0;
  for (const key of REQ_PART_ORDER) {
    if (ti >= tokens.length) break;
    const token = tokens[ti];
    if (token === "N") {
      checked[key] = false;
      values[key] = "";
      ti += 1;
    } else if (token === "Y") {
      checked[key] = true;
      values[key] = (tokens[ti + 1] ?? "").trim();
      ti += 2;
    } else {
      ti += 1;
    }
  }
  return { checked, values };
}

function buildReqPart(
  checked: Record<string, boolean>,
  values: Record<string, string>,
): string {
  const segments = REQ_PART_ORDER.map((key) => {
    if (checked[key] && (values[key] ?? "").trim()) {
      return `Y|${(values[key] ?? "").trim()}`;
    }
    return "N";
  });
  return segments.join("|");
}

const BANK_CODE_ID = "ARM002";

/** ?ë…„?”ì¼ 8?ë¦¬ ??input[type=date] (YYYY-MM-DD) */
function formatBrthdyForInput(brthdy: string | undefined): string {
  if (!brthdy || brthdy.length < 8) return "";
  const d = brthdy.replace(/\D/g, "").slice(0, 8);
  if (d.length < 8) return "";
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

interface BankCodeItem {
  code?: string;
  codeNm?: string;
}

interface ArmchilChildItem {
  esntlId?: string;
  userNm?: string;
}

interface BizInputSectionProps {
  proId?: string;
  /** ?¬ì—…êµ¬ë¶„(ARTPROM.PRO_GB). 01=?¼ë°˜(bizInput), 02=?¬ì „ì§€??bizInputPr) */
  proGb?: string;
  /** MY PAGE ? ì²­?„í™©?ì„œ ì§„ì… ??true. ?íƒœ 01(?„ì‹œ?€?????Œë§Œ ?„ì‹œ?€??? ì²­?˜ê¸° ?ˆìš© */
  fromMypage?: boolean;
  /** MY PAGE ì§„ì… ???´ë‹¹ ? ì²­ ê±´ì˜ ?™ìƒ(?”ì²­?? ID. ?ˆìœ¼ë©??™ìƒ ?ë™ ? íƒÂ·ë³€ê²?ë¶ˆê? */
  reqEsntlId?: string;
}

const BizInputSection: React.FC<BizInputSectionProps> = ({
  proId,
  proGb,
  fromMypage = false,
  reqEsntlId: reqEsntlIdProp,
}) => {
  const auth = useUserWebAuthOptional();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReqId = (searchParams.get("reqId") ?? "").trim();

  const [bankOptions, setBankOptions] = useState<BankCodeItem[]>([]);
  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [guardianBirth, setGuardianBirth] = useState("");
  const [guardianCertified, setGuardianCertified] = useState(false);
  const [guardianCertDi, setGuardianCertDi] = useState("");
  const [showCertError, setShowCertError] = useState(false);
  const [payBankCode, setPayBankCode] = useState("");
  const [holderNm, setHolderNm] = useState("");
  const [payBank, setPayBank] = useState("");
  const [explorationType, setExplorationType] = useState<"single" | "group">(
    "single",
  );
  const [fieldChecked, setFieldChecked] = useState<Record<string, boolean>>({
    humanities: false,
    arts: false,
    science: false,
    character: false,
    etc: false,
  });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({
    humanities: "",
    arts: "",
    science: "",
    character: "",
    etc: "",
  });
  const [children, setChildren] = useState<ArmchilChildItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  /** ?™ìƒ(SNR) ? ì²­ ??ë§¤ì¹­ ë³´í˜¸??esntlId (?€????pEsntlId) */
  const [linkedParentEsntlId, setLinkedParentEsntlId] = useState("");
  /** ?™ìƒ(SNR) ë¡œê·¸?????™ìƒëª??œì‹œ(?½ê¸° ?„ìš© ?¸í’‹). ?™ë?ëª¨ëŠ” ?€?‰íŠ¸ë§??¬ìš© */
  const [studentSelfDisplayName, setStudentSelfDisplayName] = useState("");
  const snParentLinkAlertShownRef = useRef(false);
  const [studentZip, setStudentZip] = useState("");
  const [studentAdres, setStudentAdres] = useState("");
  const [studentDetailAdres, setStudentDetailAdres] = useState("");
  const [studentGender, setStudentGender] = useState<"M" | "F">("M");
  const [schoolNm, setSchoolNm] = useState("");
  const [schoolLvl, setSchoolLvl] = useState("");
  const [schoolNo, setSchoolNo] = useState("");
  const [activityRange, setActivityRange] = useState<"01" | "02">("01");
  const [activityPurpose, setActivityPurpose] = useState("");
  const [activityContent, setActivityContent] = useState("");
  const [budgetPlan, setBudgetPlan] = useState("");
  const [etcContent, setEtcContent] = useState("");
  const [existingFiles, setExistingFiles] = useState<
    { fileId: string; seq: number; orgfNm?: string }[]
  >([]);
  /** ?ˆë¡œ ? íƒ???Œì¼ (?„ì§ ?œë²„ ë¯¸ì—…ë¡œë“œ). ?„ì‹œ?€??? ì²­?˜ê¸° ???„ì†¡ ?ˆì • */
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; file: File }[]
  >([]);
  /** ?™ìƒÂ·?¬ì—…ë³?ê¸°ì¡´ ? ì²­ ê±?ë¡œë“œ ??ë³´ê? (reqId: REQ_ID ?¨ì¼ PK, proSeq, sttusCode). ?†ìœ¼ë©?reqId "", proSeq "0", sttusCode "" */
  const [loadedReqId, setLoadedReqId] = useState("");
  const [loadedProSeq, setLoadedProSeq] = useState("");
  const [loadedSttusCode, setLoadedSttusCode] = useState("");
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guardianSectionRef = useRef<HTMLElement>(null);
  const certButtonRef = useRef<HTMLButtonElement>(null);
  const studentSelectRef = useRef<HTMLSelectElement>(null);
  const studentNameReadonlyRef = useRef<HTMLInputElement>(null);
  const afterAlertCloseRef = useRef<(() => void) | null>(null);

  const handleFieldCheck = (value: string, checked: boolean) => {
    setFieldChecked((prev) => ({ ...prev, [value]: checked }));
    if (!checked) {
      setFieldValues((prev) => ({ ...prev, [value]: "" }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
    }));
    setPendingFiles((prev) => [...prev, ...next]);
    e.target.value = "";
    fileInputRef.current && (fileInputRef.current.value = "");
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  /** ?Œë¦¼ ëª¨ë‹¬ (?¬ìš©?ì›¹) */
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  /** ì²¨ë??Œì¼ ?? œ ?•ì¸ ëª¨ë‹¬ (DB ê¸°ì¡´ ?Œì¼ë§? */
  const [showDeleteFileConfirm, setShowDeleteFileConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string;
    seq: number;
  } | null>(null);
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

  /** ?™êµê²€??ëª¨ë‹¬?ì„œ ?™êµ ? íƒ ?? ?™êµëª?ë°˜ì˜ ???´ë‹¹ ?™êµ ?™ë…„/ë°??µì…˜ ì¡°íšŒ (ê´€ë¦¬ì?˜ì´ì§€?€ ?™ì¼) */
  const handleSchoolSelect = (school: SchoolItem) => {
    const code = school.sdSchulCode ?? "";
    setSchoolNm(school.schulNm ?? "");
    setSchoolId(code);
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
    if (!proId || !selectedStudentId) {
      setExistingFiles((prev) =>
        prev.filter((f) => !(f.fileId === fileId && f.seq === seq)),
      );
      return;
    }
    const url = loadedReqId
      ? API_ENDPOINTS.USER_ARTAPPM.DELETE_FILE_BY_REQ_ID(
          loadedReqId,
          fileId,
          seq,
        )
      : `${API_ENDPOINTS.USER_ARTAPPM.DELETE_FILE_BASE}/${encodeURIComponent(proId)}/${encodeURIComponent(loadedProSeq && loadedProSeq !== "" ? loadedProSeq : "0")}/${encodeURIComponent(selectedStudentId)}/files/${encodeURIComponent(fileId)}/${encodeURIComponent(seq)}`;
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

  /** ? ì²­ë¶„ì•¼Â·?œë™ê³„íš?œÂ·ê¸°?€Â·ì²¨ë??Œì¼ë§?ì´ˆê¸°??(?™ìƒ ë³€ê²????´ë‹¹ ?™ìƒ ? ì²­ ê±´ì´ ?†ì„ ???¬ìš©). ?êµ¬ ? í˜•?€ 1???êµ¬?•ìœ¼ë¡? */
  const resetApplicationFields = () => {
    setExplorationType("single");
    setActivityRange("01");
    setActivityPurpose("");
    setActivityContent("");
    setBudgetPlan("");
    setEtcContent("");
    setFieldChecked({
      humanities: false,
      arts: false,
      science: false,
      character: false,
      etc: false,
    });
    setFieldValues({
      humanities: "",
      arts: "",
      science: "",
      character: "",
      etc: "",
    });
    setExistingFiles([]);
    setPendingFiles([]);
  };

  /** ì´ˆê¸°?? ?™ìƒëª??´ì œ ???™ìƒ ê¸°ì??¼ë¡œ ë¶ˆëŸ¬??ê°’ë“¤ ëª¨ë‘ ì´ˆê¸°??(useEffect?ì„œ ì²˜ë¦¬) */
  const handleReset = () => {
    setSelectedStudentId("");
  };

  const handleCertClick = () => {
    setGuardianCertified(true);
    setShowCertError(false);
  };

  /** ?€?¥Â·ì‹ ì²?ê°€?? ?°ì´???†ìŒ("")?´ë©´ ??ƒ ê°€?? 01(?„ì‹œ?€???´ë©´ MY PAGE ì§„ì…(fromMypage)???Œë§Œ ê°€?? 02/03/04/05/99??ë¶ˆê? */
  const canSaveOrApply =
    loadedSttusCode === "" || (loadedSttusCode === "01" && fromMypage);
  const handleSubmitArtappm = (sttusCode: "01" | "02") => {
    if (!proId) {
      showAlert("?Œë¦¼", "ì§€?ì‚¬?…ì„ ? íƒ?˜ê³  ?™ìƒ??? íƒ?´ì£¼?¸ìš”.", "danger");
      return;
    }
    if (!selectedStudentId) {
      showAlert("?Œë¦¼", "?™ìƒ??? íƒ?????€?¥í•´ ì£¼ì„¸??", "danger");
      afterAlertCloseRef.current = () => {
        const el =
          AuthService.getUserSe() === "SNR"
            ? studentNameReadonlyRef.current
            : studentSelectRef.current;
        el?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTimeout(() => el?.focus(), 100);
      };
      return;
    }
    if (AuthService.getUserSe() === "SNR" && !linkedParentEsntlId.trim()) {
      showAlert(
        "?ë? ?°ë™???„ìš”?©ë‹ˆ??,
        "?™ë?ëª¨ë‹˜??ë§ˆì´?˜ì´ì§€?ì„œ ?ë? ?°ë™???„ë£Œ?????¤ì‹œ ? ì²­??ì£¼ì„¸??",
        "danger",
      );
      return;
    }
    /** ê³µê³  ì§„ì…: ?€??? ì²­ ???´ë‹¹ ?™ìƒ+proId ê¸°ì¡´ ? ì²­ ?¬ë? ?•ì¸. ?ˆìœ¼ë©?ë§‰ê³  MY PAGE ?ˆë‚´ */
    if (!fromMypage) {
      // ?¤íšŒ ? ì²­ ê°€???¬ì—…(03/05/07)?€ ?™ìƒ+proIdë§Œìœ¼ë¡?? ì°¨?¨í•˜ë©??????¬ë¡¯: proSeq/workDt ?±ìœ¼ë¡?êµ¬ë¶„).
      // ì¤‘ë³µ ì°¨ë‹¨?€ ?€????ë°±ì—”?œì—???¬ë¡¯ ê¸°ì??¼ë¡œ ì²˜ë¦¬?œë‹¤.
      if (proGb === "03" || proGb === "05" || proGb === "07") {
        runInsert(sttusCode);
        return;
      }
      const params = new URLSearchParams({
        proId,
        reqEsntlId: selectedStudentId,
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
    runInsert(sttusCode);
  };

  const runInsert = (sttusCode: "01" | "02" | "99") => {
    /** ? ì²­?˜ê¸°(02)???Œë§Œ ë³´í˜¸?ì¸ì¦??„ìˆ˜. ?„ì‹œ?€??01)Â·ì·¨ì†Œ(99)???¸ì¦ ?†ì´ ê°€??*/
    if (sttusCode === "02" && !guardianCertified) {
      setShowCertError(true);
      guardianSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setTimeout(() => certButtonRef.current?.focus(), 300);
      return;
    }

    const isStudentApplicant = AuthService.getUserSe() === "SNR";
    const loginEsntlId = AuthService.getEsntlId() ?? "";
    const pEsntlId = isStudentApplicant
      ? (linkedParentEsntlId || "")
      : loginEsntlId;
    /** REQ_ESNTL_ID = ?¤ì œ ? ì²­(ë¡œê·¸?? ì£¼ì²´. ë§ˆì´?˜ì´ì§€ ëª©ë¡?€ ??ê°’ìœ¼ë¡?ì¡°íšŒ??*/
    const reqEsntlIdValue = loginEsntlId;
    const reqPart = buildReqPart(fieldChecked, fieldValues);
    const fileId = existingFiles[0]?.fileId ?? "";
    const proSeq = loadedProSeq && loadedProSeq !== "" ? loadedProSeq : "0";

    const data: Record<string, unknown> = {
      ...(loadedReqId ? { reqId: loadedReqId } : {}),
      proId,
      proSeq,
      proGb: proGb ?? "",
      reqEsntlId: reqEsntlIdValue,
      cEsntlId: selectedStudentId,
      proType: explorationType === "group" ? "02" : "01",
      pEsntlId,
      headNm: guardianName,
      pUserNm: guardianName,
      mbtlnum: guardianContact?.replace(/-/g, "") ?? "",
      brthdy: guardianBirth ? guardianBirth.replace(/-/g, "").slice(0, 8) : "",
      pIhidnum: "",
      cIhidnum: "",
      certYn: guardianCertified ? "Y" : "N",
      crtfcDnValue: guardianCertDi ?? "",
      schoolGb: "",
      schoolNm,
      schoolLvl: schoolLvl ? parseInt(schoolLvl, 10) : 0,
      schoolNo: schoolNo ? parseInt(schoolNo, 10) : 0,
      payBankCode,
      payBank,
      holderNm,
      reqPart,
      playPart: activityRange === "02" ? "2" : "1",
      reqObj: activityPurpose,
      reqPlay: activityContent,
      reqPlan: budgetPlan,
      mchilYn: "N",
      mchilNm: "",
      reqDesc: etcContent,
      fileId,
      sttusCode,
    };

    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    pendingFiles.forEach(({ file }) => {
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
          if (sttusCode === "02") {
            showAlert("? ì²­ ?„ë£Œ", "? ì²­???„ë£Œ?˜ì—ˆ?µë‹ˆ??", "success");
            setLoadedSttusCode("02");
          } else {
            showAlert("?„ì‹œ?€??, "?„ì‹œ?€?¥ë˜?ˆìŠµ?ˆë‹¤.", "success");
            setLoadedSttusCode("01");
          }
          setPendingFiles([]);
          setLoadedProSeq(proSeq);
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
    handleSubmitArtappm("02");
  };

  useEffect(() => {
    fetchData();

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

  useEffect(() => {
    if (!AuthService.isAuthenticated()) return;
    const esntlId = AuthService.getEsntlId();
    if (!esntlId) return;
    const userSe = AuthService.getUserSe();
    if (userSe === "SNR") {
      setSelectedStudentId(esntlId);
      setLinkedParentEsntlId("");
      setGuardianName("");
      setGuardianContact("");
      setGuardianBirth("");
      UserArmuserService.getDetail(esntlId)
        .then((r) => {
          const u = r.detail;
          setStudentSelfDisplayName(u?.userNm ?? "");
        })
        .catch(() => setStudentSelfDisplayName(""));
      apiClient
        .get<{ data?: ArmchilChildItem[] }>(API_ENDPOINTS.USER_ARMCHIL.PARENTS)
        .then((res) => {
          const arr = Array.isArray(res?.data) ? res.data : [];
          const first = (arr[0]?.esntlId ?? "").trim();
          if (!first) {
            if (!snParentLinkAlertShownRef.current) {
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
          setLinkedParentEsntlId(first);
          UserArmuserService.getDetail(first)
            .then((r) => {
              const d = r.detail;
              if (!d) return;
              setGuardianName(d.userNm ?? "");
              setGuardianContact(d.mbtlnum ?? "");
              setGuardianBirth(formatBrthdyForInput(d.brthdy ?? ""));
              setPayBankCode(d.payBankCode ?? "");
              setHolderNm(d.holderNm ?? "");
              setPayBank(d.payBank ?? "");
            })
            .catch(() => {});
        })
        .catch(() => {});
      return;
    }
    UserArmuserService.getDetail(esntlId)
      .then((res) => {
        const d = res.detail;
        if (!d) return;
        setStudentSelfDisplayName("");
        setGuardianName(d.userNm ?? "");
        setGuardianContact(d.mbtlnum ?? "");
        setGuardianBirth(formatBrthdyForInput(d.brthdy ?? ""));
        setPayBankCode(d.payBankCode ?? "");
        setHolderNm(d.holderNm ?? "");
        setPayBank(d.payBank ?? "");
      })
      .catch(() => {});
  }, []);

  /** ?¸ì¦??ì¤€ë¹„ëœ ???ë? ëª©ë¡ ì¡°íšŒ (?™ë?ëª¨ìš©). ?™ìƒ(SNR)?€ ?¤í‚µ */
  useEffect(() => {
    if (!isAuthenticated) return;
    if (AuthService.getUserSe() === "SNR") return;
    apiClient
      .get<{ data?: ArmchilChildItem[] }>(API_ENDPOINTS.USER_ARMCHIL.CHILDREN)
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setChildren(arr);
        if (arr.length === 0) setSelectedStudentId("");
      })
      .catch(() => setChildren([]));
  }, [isAuthenticated]);

  /** MY PAGE ì§„ì… ??reqEsntlIdê°€ ?ˆìœ¼ë©??ë? ëª©ë¡ ë¡œë“œ ???´ë‹¹ ?™ìƒ ?ë™ ? íƒ(?™ìƒ ë³¸ì¸ ê±´ì? ?ë? ëª©ë¡ ?†ì´ ? íƒ) */
  useEffect(() => {
    if (!fromMypage || !reqEsntlIdProp || selectedStudentId !== "") return;
    if (
      AuthService.getUserSe() === "SNR" &&
      AuthService.getEsntlId() === (reqEsntlIdProp ?? "").trim()
    ) {
      setSelectedStudentId(reqEsntlIdProp);
      return;
    }
    if (children.length === 0) return;
    const exists = children.some((c) => (c.esntlId ?? "") === reqEsntlIdProp);
    if (exists) setSelectedStudentId(reqEsntlIdProp);
  }, [fromMypage, reqEsntlIdProp, children, selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setExplorationType("single");
      setStudentZip("");
      setStudentAdres("");
      setStudentDetailAdres("");
      setStudentGender("M");
      setSchoolNm("");
      setSchoolLvl("");
      setSchoolNo("");
      setSchoolId("");
      setClassListForSchool([]);
      setGradeOptions([]);
      setClassOptions([]);
      setActivityRange("01");
      setActivityPurpose("");
      setActivityContent("");
      setBudgetPlan("");
      setEtcContent("");
      setFieldChecked({
        humanities: false,
        arts: false,
        science: false,
        character: false,
        etc: false,
      });
      setFieldValues({
        humanities: "",
        arts: "",
        science: "",
        character: "",
        etc: "",
      });
      setExistingFiles([]);
      setPendingFiles([]);
      setLoadedReqId("");
      setLoadedProSeq("");
      setLoadedSttusCode("");
      setGuardianCertified(false);
      setGuardianCertDi("");
      setStudentSelfDisplayName("");
      return;
    }
    /** ê³µê³  ì§„ì…: ê¸°ì¡´ ? ì²­ ?°ì´?°ëŠ” ë¡œë“œ?˜ì? ?Šê³ , ?´ë‹¹ ?™ìƒ ê¸°ë³¸ ?•ë³´ë§?ë¡œë“œ (?€??? ì²­?€ ìµœì´ˆ 1?Œë§Œ ê°€??. ?¸ì¦ ?íƒœ??? ì? */
    if (!fromMypage) {
      setLoadedReqId("");
      setLoadedProSeq("0");
      setLoadedSttusCode("");
      resetApplicationFields();
      UserArmuserService.getDetail(selectedStudentId).then((r) => {
        const u = r.detail;
        if (!u) return;
        if (AuthService.getUserSe() === "SNR") {
          setStudentSelfDisplayName(u.userNm ?? "");
        }
        setStudentZip(u.zip ?? "");
        setStudentAdres(u.adres ?? "");
        setStudentDetailAdres(u.detailAdres ?? "");
        setStudentGender((u.sexdstnCode || "M") === "F" ? "F" : "M");
        setSchoolNm(u.schoolNm ?? "");
        setSchoolLvl(String(u.schoolLvl ?? ""));
        setSchoolNo(String(u.schoolNo ?? ""));
        setSchoolId("");
        setClassListForSchool([]);
        setGradeOptions([]);
        setClassOptions([]);
        fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
      });
      return;
    }
    if (proId) {
      const useReqId =
        fromMypage &&
        initialReqId !== "" &&
        (reqEsntlIdProp ?? "") !== "" &&
        selectedStudentId === (reqEsntlIdProp ?? "");
      const url = useReqId
        ? API_ENDPOINTS.USER_ARTAPPM.BY_REQ_ID(initialReqId)
        : (() => {
            const params = new URLSearchParams({
              proId,
              reqEsntlId: selectedStudentId,
            });
            return `${API_ENDPOINTS.USER_ARTAPPM.BY_STUDENT}?${params}`;
          })();
      apiClient
        .get<{ detail?: Record<string, unknown> }>(url)
        .then((res) => {
          const d = res.detail;
          if (d) {
            setLoadedReqId((d.reqId as string) ?? "");
            setLoadedProSeq((d.proSeq as string) ?? "0");
            setLoadedSttusCode((d.sttusCode as string) ?? "");
            setGuardianCertified((d.certYn as string) === "Y");
            setShowCertError(false);
            if (AuthService.getUserSe() === "SNR") {
              const pe = String(
                (d as { pEsntlId?: unknown }).pEsntlId ?? "",
              ).trim();
              if (pe) setLinkedParentEsntlId(pe);
              setStudentSelfDisplayName(String((d.userNm as string) ?? ""));
            }
            setStudentZip((d.zip as string) ?? "");
            setStudentAdres((d.adres as string) ?? "");
            setStudentDetailAdres((d.detailAdres as string) ?? "");
            setStudentGender(
              ((d.cSexdstnCode as string) || "M") === "F" ? "F" : "M",
            );
            setSchoolNm((d.schoolNm as string) ?? "");
            setSchoolLvl(String(d.schoolLvl ?? ""));
            setSchoolNo(String(d.schoolNo ?? ""));
            setSchoolId("");
            setClassListForSchool([]);
            setGradeOptions([]);
            setClassOptions([]);
            fetchGradeOptionsBySchoolName((d.schoolNm as string) ?? "");
            setExplorationType(
              (d.proType as string) === "02" ? "group" : "single",
            );
            setActivityRange((d.playPart as string) === "2" ? "02" : "01");
            setActivityPurpose((d.reqObj as string) ?? "");
            setActivityContent((d.reqPlay as string) ?? "");
            setBudgetPlan((d.reqPlan as string) ?? "");
            setEtcContent((d.reqDesc as string) ?? "");
            const rp = (d.reqPart as string) || "";
            const { checked: reqChecked, values: reqValues } = parseReqPart(rp);
            setFieldChecked((prev) => ({ ...prev, ...reqChecked }));
            setFieldValues((prev) => ({ ...prev, ...reqValues }));
            const fileListRaw = (
              res as {
                fileList?: { fileId: string; seq: number; orgfNm?: string }[];
              }
            ).fileList;
            setExistingFiles(Array.isArray(fileListRaw) ? fileListRaw : []);
            setPendingFiles([]);
          } else {
            setLoadedReqId("");
            setLoadedProSeq("0");
            setLoadedSttusCode("");
            resetApplicationFields();
            UserArmuserService.getDetail(selectedStudentId).then((r) => {
              const u = r.detail;
              if (!u) return;
              if (AuthService.getUserSe() === "SNR") {
                setStudentSelfDisplayName(u.userNm ?? "");
              }
              setStudentZip(u.zip ?? "");
              setStudentAdres(u.adres ?? "");
              setStudentDetailAdres(u.detailAdres ?? "");
              setStudentGender((u.sexdstnCode || "M") === "F" ? "F" : "M");
              setSchoolNm(u.schoolNm ?? "");
              setSchoolLvl(String(u.schoolLvl ?? ""));
              setSchoolNo(String(u.schoolNo ?? ""));
              setSchoolId("");
              setClassListForSchool([]);
              setGradeOptions([]);
              setClassOptions([]);
              fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
            });
          }
        })
        .catch(() => {
          setLoadedReqId("");
          setLoadedProSeq("0");
          setLoadedSttusCode("");
          resetApplicationFields();
          UserArmuserService.getDetail(selectedStudentId).then((r) => {
            const u = r.detail;
            if (!u) return;
            if (AuthService.getUserSe() === "SNR") {
              setStudentSelfDisplayName(u.userNm ?? "");
            }
            setStudentZip(u.zip ?? "");
            setStudentAdres(u.adres ?? "");
            setStudentDetailAdres(u.detailAdres ?? "");
            setStudentGender((u.sexdstnCode || "M") === "F" ? "F" : "M");
            setSchoolNm(u.schoolNm ?? "");
            setSchoolLvl(String(u.schoolLvl ?? ""));
            setSchoolNo(String(u.schoolNo ?? ""));
            setSchoolId("");
            setClassListForSchool([]);
            setGradeOptions([]);
            setClassOptions([]);
            fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
          });
        });
    } else {
      setLoadedReqId("");
      setLoadedProSeq("0");
      setLoadedSttusCode("");
      resetApplicationFields();
      UserArmuserService.getDetail(selectedStudentId).then((r) => {
        const u = r.detail;
        if (!u) return;
        if (AuthService.getUserSe() === "SNR") {
          setStudentSelfDisplayName(u.userNm ?? "");
        }
        setStudentZip(u.zip ?? "");
        setStudentAdres(u.adres ?? "");
        setStudentDetailAdres(u.detailAdres ?? "");
        setStudentGender((u.sexdstnCode || "M") === "F" ? "F" : "M");
        setSchoolNm(u.schoolNm ?? "");
        setSchoolLvl(String(u.schoolLvl ?? ""));
        setSchoolNo(String(u.schoolNo ?? ""));
        setSchoolId("");
        setClassListForSchool([]);
        setGradeOptions([]);
        setClassOptions([]);
        fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
      });
    }
  }, [selectedStudentId, proId, fromMypage, initialReqId, reqEsntlIdProp]);

  return (
    <section className="inner">
      <div className="mainBg">
        <div className="registrationContainer bizInput">
          <div
            className="tabWrapper"
            role="radiogroup"
            aria-label="?êµ¬ ? í˜• ? íƒ"
          >
            <label className="tabLabel">
              <input
                type="radio"
                name="explorationType"
                value="single"
                className="tabInput"
                checked={explorationType === "single"}
                onChange={() => setExplorationType("single")}
              />
              <div className="tabButton">
                <span
                  className={`iconCheck ${explorationType === "single" ? "ico_radio_check_on" : "ico_radio_check_off"}`}
                  aria-hidden="true"
                />
                <span>1???êµ¬??/span>
              </div>
            </label>
            <label className="tabLabel">
              <input
                type="radio"
                name="explorationType"
                value="group"
                className="tabInput"
                checked={explorationType === "group"}
                onChange={() => setExplorationType("group")}
              />
              <div className="tabButton">
                <span
                  className={`iconCheck ${explorationType === "group" ? "ico_radio_check_on" : "ico_radio_check_off"}`}
                  aria-hidden="true"
                />
                <span>ëª¨ë‘  ?êµ¬??/span>
              </div>
            </label>
          </div>
          <form className="mainForm" onSubmit={handleSubmit}>
            <section
              className="formSection"
              ref={guardianSectionRef}
              aria-labelledby="guardianSectionTitle"
            >
              <div className="sectionHeader">
                <div className="titleWrapper">
                  <div className="sectionTitle" id="guardianSectionTitle">
                    ë³´í˜¸?ì •ë³?
                  </div>
                  <span
                    className={`subTextBlue ${!guardianCertified ? "certRequired" : ""}`.trim()}
                    role="status"
                    aria-live="polite"
                  >
                    {guardianCertified
                      ? "?¸ì¦???„ë£Œ?˜ì—ˆ?µë‹ˆ??"
                      : "ë³´í˜¸?ë? ?¸ì¦?˜ì„¸??}
                  </span>
                </div>
                <button
                  ref={certButtonRef}
                  type="button"
                  className="btnRed"
                  onClick={() => {
                    (
                      window as Window & {
                        __onGuardianCertSuccess?: (data: {
                          userName: string;
                          celNo: string;
                          birYMD: string;
                          di?: string;
                        }) => void;
                      }
                    ).__onGuardianCertSuccess = (data) => {
                      const certDi = (data.di ?? "").trim();
                      console.log("?”‘ ?¸ì¦ ê²°ê³¼ di:", certDi);
                      const userSe = AuthService.getUserSe();
                      const esntlId = AuthService.getEsntlId();

                      const clearCertCallback = () => {
                        (
                          window as Window & {
                            __onGuardianCertSuccess?: (d: {
                              userName: string;
                              celNo: string;
                              birYMD: string;
                              di?: string;
                            }) => void;
                          }
                        ).__onGuardianCertSuccess = undefined;
                      };

                      const mismatchAlert = () =>
                        showAlert(
                          "?Œë¦¼",
                          "ë¡œê·¸?¸í•œ ë³´í˜¸?ì? ?¸ì¦??ë³¸ì¸???¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤. ë¡œê·¸?¸í•œ ê³„ì •??ë³´í˜¸?ë§Œ ?¸ì¦?????ˆìŠµ?ˆë‹¤.",
                          "danger",
                        );

                      if (!esntlId) {
                        mismatchAlert();
                        clearCertCallback();
                        return;
                      }

                      /** ?™ìƒ(SNR): GET /api/user/armchil/parents ???°ë™ ë³´í˜¸??DI?€ ?¸ì¦ DI ë¹„êµ */
                      if (userSe === "SNR") {
                        UserArmchilService.getParents()
                          .then((parentsRes) => {
                            const arr = Array.isArray(parentsRes.data)
                              ? parentsRes.data
                              : [];
                            const preferred = linkedParentEsntlId.trim();
                            const fromList =
                              preferred &&
                              arr.some(
                                (p) =>
                                  (p.esntlId ?? "").trim() === preferred,
                              )
                                ? preferred
                                : (arr[0]?.esntlId ?? "").trim();
                            const parentId = fromList;
                            if (!parentId) {
                              showAlert(
                                "?Œë¦¼",
                                "?°ë™??ë³´í˜¸???•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤. ë§ˆì´?˜ì´ì§€?ì„œ ?ë? ?°ë™???•ì¸?????¤ì‹œ ?œë„??ì£¼ì„¸??",
                                "danger",
                              );
                              return;
                            }
                            return UserArmuserService.getDetail(parentId);
                          })
                          .then((res) => {
                            if (!res?.detail) return;
                            const storedDi = (
                              res.detail.crtfcDnValue ?? ""
                            ).trim();
                            console.log(
                              "?”‘ ?°ë™ ë³´í˜¸??CRTFC_DN_VALUE:",
                              storedDi,
                            );
                            if (certDi && storedDi && certDi === storedDi) {
                              setGuardianCertified(true);
                              setGuardianCertDi(certDi);
                              showAlert(
                                "?Œë¦¼",
                                "ë³¸ì¸?¸ì¦???„ë£Œ?˜ì—ˆ?µë‹ˆ??",
                                "success",
                              );
                            } else {
                              mismatchAlert();
                            }
                          })
                          .catch(() => {
                            showAlert(
                              "?Œë¦¼",
                              "ë³¸ì¸?¸ì¦ ?•ì¸ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„??ì£¼ì„¸??",
                              "danger",
                            );
                          })
                          .finally(clearCertCallback);
                        return;
                      }

                      UserArmuserService.getDetail(esntlId)
                        .then((res) => {
                          const storedDi = (
                            res.detail?.crtfcDnValue ?? ""
                          ).trim();
                          console.log(
                            "?”‘ ë¡œê·¸??ë³´í˜¸??CRTFC_DN_VALUE:",
                            storedDi,
                          );
                          if (certDi && storedDi && certDi === storedDi) {
                            setGuardianCertified(true);
                            setGuardianCertDi(certDi);
                            showAlert(
                              "?Œë¦¼",
                              "ë³¸ì¸?¸ì¦???„ë£Œ?˜ì—ˆ?µë‹ˆ??",
                              "success",
                            );
                          } else {
                            mismatchAlert();
                          }
                        })
                        .catch(() => {
                          mismatchAlert();
                        })
                        .finally(clearCertCallback);
                    };
                    createToken();
                  }}
                  aria-label="ë³´í˜¸??ë³¸ì¸?¸ì¦ ?˜ê¸°"
                >
                  ?¸ì¦?˜ê¸°
                </button>
              </div>
              <div className="formGrid">
                <div className="formRow split bizStdSplitRow">
                  <div className="fieldUnit">
                    <label htmlFor="guardianName" className="formLabel">
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
                    <label htmlFor="guardianContact" className="formLabel">
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
                <div className="formRow bizStdApplyRow">
                  <label htmlFor="guardianBirth" className="formLabel">
                    ?ë…„?”ì¼
                  </label>
                  <div className="formControl">
                    <input
                      type="date"
                      id="guardianBirth"
                      className="inputField bgGray"
                      value={guardianBirth}
                      readOnly
                      aria-label="?ë…„?”ì¼"
                    />
                  </div>
                </div>
                <div className="formRow bizStdApplyRow">
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
                            item.code ? `${item.code}-${idx}` : `bank-${idx}`
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
              </div>
            </section>
            <section className="formSection">
              <div className="sectionHeader">
                <div className="sectionTitle">?™ìƒ?•ë³´</div>
              </div>
              <div className="formGrid">
                <div className="formRow split bizStdSplitRow">
                  <div className="fieldUnit">
                    <label
                      htmlFor={
                        AuthService.getUserSe() === "SNR"
                          ? "studentNameReadonly"
                          : "studentSelect"
                      }
                      className="formLabel"
                    >
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      ?™ìƒëª?
                    </label>
                    <div className="formControl">
                      {AuthService.getUserSe() === "SNR" ? (
                        <input
                          ref={studentNameReadonlyRef}
                          type="text"
                          id="studentNameReadonly"
                          className="inputField bgGray"
                          value={studentSelfDisplayName}
                          readOnly
                          aria-readonly="true"
                          aria-label="?™ìƒëª?
                          tabIndex={0}
                        />
                      ) : (
                        <select
                          ref={studentSelectRef}
                          id="studentSelect"
                          className={`selectField ${fromMypage ? "bgGray" : ""}`}
                          value={selectedStudentId}
                          onChange={(e) =>
                            setSelectedStudentId(e.target.value)
                          }
                          disabled={fromMypage}
                          aria-label="?™ìƒëª?? íƒ"
                        >
                          <option value="">?´ë¦„??? íƒ?´ì£¼?¸ìš”</option>
                          {children.map((c) => (
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
                    <span className="formLabel" id="lblGender">
                      ?±ë³„
                    </span>
                    <div
                      className="customGroup formControl"
                      role="radiogroup"
                      aria-labelledby="lblGender"
                    >
                      <label className="customItem">
                        <input
                          type="radio"
                          name="gender"
                          className="customInput"
                          checked={studentGender === "M"}
                          onChange={() => setStudentGender("M")}
                          disabled
                          readOnly
                          aria-readonly="true"
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">??/span>
                        </div>
                      </label>
                      <label className="customItem">
                        <input
                          type="radio"
                          name="gender"
                          className="customInput"
                          checked={studentGender === "F"}
                          onChange={() => setStudentGender("F")}
                          disabled
                          readOnly
                          aria-readonly="true"
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">??/span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="formRow bizStdApplyRow">
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
                <div className="formRow bizStdApplyRow">
                  <span className="formLabel" id="lblSchoolName">
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
                <div className="titleWrapper">
                  <div className="sectionTitle">? ì²­ë¶„ì•¼</div>
                  <span className="subTextBlue" id="descDuplicate">
                    ì¤‘ë³µ? íƒ ê°€?¥í•©?ˆë‹¤
                  </span>
                </div>
              </div>
              <div
                className="formGrid"
                role="group"
                aria-describedby="descDuplicate"
              >
                <div className="formRow">
                  <span className="formLabel">ë¶„ì•¼? íƒ</span>
                  <div className="formControl fieldSelectGroup">
                    {FIELD_OPTIONS.map((opt) => (
                      <div key={opt.value} className="fieldRow">
                        <label className="customItem">
                          <input
                            type="checkbox"
                            name={opt.name}
                            value={opt.value}
                            className="customInput"
                            checked={fieldChecked[opt.value] ?? false}
                            onChange={(e) =>
                              handleFieldCheck(opt.value, e.target.checked)
                            }
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">{opt.label}</span>
                          </div>
                        </label>
                        <input
                          type="text"
                          className="inputField"
                          placeholder={opt.placeholder}
                          readOnly={!fieldChecked[opt.value]}
                          disabled={!fieldChecked[opt.value]}
                          aria-label={opt.ariaLabel}
                          value={fieldValues[opt.value] ?? ""}
                          onChange={(e) =>
                            setFieldValues((prev) => ({
                              ...prev,
                              [opt.value]: e.target.value,
                            }))
                          }
                          style={{
                            backgroundColor: fieldChecked[opt.value]
                              ? "#fff"
                              : "#f9f9f9",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="formSection">
              <div className="sectionHeader">
                <div className="sectionTitle">?œë™ê³„íš??/div>
              </div>
              <div className="formGrid">
                <div className="formRow bizStdApplyRow">
                  <span className="formLabel" id="lblRange">
                    ?œë™ë²”ìœ„
                  </span>
                  <div
                    className="formControl customGroup"
                    role="radiogroup"
                    aria-labelledby="lblRange"
                  >
                    <label className="customItem">
                      <input
                        type="radio"
                        name="activityRange"
                        className="customInput"
                        checked={activityRange === "01"}
                        onChange={() => setActivityRange("01")}
                      />
                      <div className="customBox">
                        <span className="customIcon" aria-hidden="true" />
                        <span className="customText">êµ°ì‚° ??/span>
                      </div>
                    </label>
                    <label className="customItem">
                      <input
                        type="radio"
                        name="activityRange"
                        className="customInput"
                        checked={activityRange === "02"}
                        onChange={() => setActivityRange("02")}
                      />
                      <div className="customBox">
                        <span className="customIcon" aria-hidden="true" />
                        <span className="customText">êµ°ì‚° ??/span>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="activityPurpose" className="formLabel">
                    ëª©ì 
                  </label>
                  <div className="formControl">
                    <textarea
                      id="activityPurpose"
                      className="textAreaField"
                      placeholder="?œë™ëª©ì ???…ë ¥?´ì£¼?¸ìš”"
                      value={activityPurpose}
                      onChange={(e) => setActivityPurpose(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="activityContent" className="formLabel">
                    ?œë™?´ìš©
                  </label>
                  <div className="formControl">
                    <textarea
                      id="activityContent"
                      className="textAreaField"
                      placeholder="?œë™?´ìš©???…ë ¥?´ì£¼?¸ìš”"
                      value={activityContent}
                      onChange={(e) => setActivityContent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="budgetPlan" className="formLabel">
                    ?ˆì‚° ?¬ìš©ê³„íš
                  </label>
                  <div className="formControl">
                    <textarea
                      id="budgetPlan"
                      className="textAreaField"
                      placeholder="?ˆì‚° ?¬ìš©ê³„íš???…ë ¥?´ì£¼?¸ìš”"
                      value={budgetPlan}
                      onChange={(e) => setBudgetPlan(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="formSection">
              <div className="sectionHeader">
                <div className="sectionTitle">ê¸°í?</div>
              </div>
              <div className="formGrid">
                <div className="formRow">
                  <label htmlFor="etcContent" className="formLabel">
                    ê¸°í?
                  </label>
                  <div className="formControl">
                    <textarea
                      id="etcContent"
                      className="textAreaField"
                      placeholder="ê¸°í? ?´ìš©???…ë ¥?´ì£¼?¸ìš”"
                      value={etcContent}
                      onChange={(e) => setEtcContent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow bizStdAttachRow">
                  <span className="formLabel">
                    ì²¨ë??Œì¼
                    {canSaveOrApply && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="fileInput"
                          className="hiddenInput"
                          multiple
                          onChange={handleFileSelect}
                        />
                        <label
                          htmlFor="fileInput"
                          className="btnFileAdd"
                          aria-label="?Œì¼ ì²¨ë??˜ê¸°"
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
                    {existingFiles.length === 0 && pendingFiles.length === 0 ? (
                      <span className="fileListEmpty">
                        ì²¨ë????Œì¼???†ìŠµ?ˆë‹¤.
                      </span>
                    ) : (
                      <>
                        {existingFiles.map((file) => {
                          const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                          const label = file.orgfNm || `?Œì¼ ${file.seq}`;
                          const typeClass = getFileTypeClass(label);
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
                                      label || undefined,
                                    );
                                  }}
                                >
                                  {label}
                                </a>
                              </span>
                              <button
                                type="button"
                                className="btnFileDel"
                                aria-label={`${label} ?Œì¼ ?? œ`}
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
                            </div>
                          );
                        })}
                        {pendingFiles.map(({ id, file }) => {
                          const label = file.name;
                          const typeClass = getFileTypeClass(label);
                          return (
                            <div
                              key={id}
                              className={`file ${typeClass}`.trim()}
                            >
                              <span>{label}</span>
                              {canSaveOrApply && (
                                <button
                                  type="button"
                                  className="btnFileDel"
                                  aria-label={`${label} ?Œì¼ ?? œ`}
                                  onClick={() => removePendingFile(id)}
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <div className="formActions">
              {!fromMypage && (
                <button
                  type="button"
                  className="btnWhite"
                  onClick={handleReset}
                  aria-label="?™ìƒ ë°??…ë ¥ ?´ìš© ì´ˆê¸°??
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
                aria-label="? ì²­"
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
                      showAlert("?Œë¦¼", "?´ë? ì·¨ì†Œ??ê±´ì…?ˆë‹¤.", "danger");
                      return;
                    }
                    setShowCancelConfirm(true);
                  }}
                  aria-label="? ì²­ ì·¨ì†Œ"
                >
                  ì·¨ì†Œ
                </button>
              )}
            </div>
          </form>
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

export default BizInputSection;
