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
import { API_CONFIG, API_ENDPOINTS, WATER_CERT_SIREN } from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { UserArmchilService } from "@/entities/userWeb/armchil/api";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import SchoolSearchModal, {
  type SchoolItem,
} from "@/widgets/userWeb/SchoolSearchModal";

/** gunsan bizInput.html과 동일: 첨부파일 아이콘은 userWeb/icon (ico_file_add, ico_file_del, ico_file_*) */
const ICON = "/images/userWeb/icon";

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

/** 확장자로 gunsan 스타일 파일 타입 클래스 반환 (.file.hwp, .file.pdf 등) */
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

/* 본인인증 */
const fetchData = async () => {
  try {
    console.log("🔵 본인인증 요청 시작");

    // URLSearchParams를 사용하여 x-www-form-urlencoded 형식으로 변환
    const params = new URLSearchParams();
    params.append("srvNo", "017001");
    params.append("retUrl", getSirenTokenAuthRetUrlForApply());

    console.log("📤 요청 데이터:", params.toString());

    // /backend 경로를 사용하여 rewrites로 백엔드 API 호출
    const response = await axios.post(
      WATER_CERT_SIREN.TOKEN_AUTH,
      params, // URLSearchParams 객체
      {
        // Config 객체 (헤더 설정)
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: TokenUtils.getToken(),
        },
        timeout: 10000, // 10초 타임아웃
        withCredentials: true, // 쿠키 포함
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

    console.log("✅ 성공:", response.data);
    console.log("✅ 응답 상태:", response.status);
    console.log("✅ 응답 헤더:", response.headers);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Axios 에러 발생");
      console.error("상태 코드:", error.response?.status);
      console.error("응답 데이터:", error.response?.data);
      console.error("응답 헤더:", error.response?.headers);
      console.error("요청 URL:", error.config?.url);
      console.error("요청 메서드:", error.config?.method);
      console.error("요청 헤더:", error.config?.headers);
      console.error("요청 바디:", error.config?.data);
    } else {
      console.error("❌ 일반 에러:", error);
    }
  }
};

const createToken = async () => {
  const passPopup = openSirenPassBlankWindow();
  if (!passPopup || passPopup.closed) {
    console.error("본인인증 팝업이 차단되었습니다.");
    return;
  }
  try {
    const formElements = document.getElementsByName("reqCBAForm");
    const formElement = formElements[0] as HTMLFormElement;
    if (!formElement) {
      console.error("폼을 찾을 수 없습니다.");
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
    console.error("❌ 일반 에러:", error);
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
 * bizInput.html 본문 구조 유지 (클래스명·id·접근성·DOM 구조 동일)
 * 원본: source/gunsan/bizInput.html
 * 동작: 신청분야 체크 시 해당 행 input 활성화/비활성화 (원본 스크립트와 동일)
 * 표시 순서: 인문, 과학, 예체능, 인성, 기타 (DB REQ_PART 순서는 인문, 예체능, 과학, 인성, 기타)
 */
const FIELD_OPTIONS = [
  {
    name: "field",
    value: "humanities",
    label: "인문",
    placeholder: "ex)문학, 어학, 역사, 문화행사 등",
    ariaLabel: "인문 분야 상세 내용",
  },
  {
    name: "field",
    value: "science",
    label: "과학",
    placeholder: "ex)기계, 공학, 환경, 컴퓨터, 통신, 방송 미디어 등",
    ariaLabel: "과학 분야 상세 내용",
  },
  {
    name: "field",
    value: "arts",
    label: "예체능",
    placeholder: "ex)음악, 미술, 건축, 사진, 스포츠 등",
    ariaLabel: "예체능 분야 상세 내용",
  },
  {
    name: "field",
    value: "character",
    label: "인성",
    placeholder: "ex)봉사, 상담, 환경보호, 캠페인활동 등",
    ariaLabel: "인성 분야 상세 내용",
  },
  {
    name: "field",
    value: "etc",
    label: "기타",
    placeholder: "ex)트래킹, 국토대장정, 베이킹, 조사활동 등",
    ariaLabel: "기타 분야 상세 내용",
  },
] as const;

/** DB REQ_PART 필드 순서: 인문, 과학, 예체능, 인성, 기타. 구분자 single |, N=미체크, Y|값=체크+텍스트 */
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

/** 생년월일 8자리 → input[type=date] (YYYY-MM-DD) */
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
  /** 사업구분(ARTPROM.PRO_GB). 01=일반(bizInput), 02=사전지원(bizInputPr) */
  proGb?: string;
  /** MY PAGE 신청현황에서 진입 시 true. 상태 01(임시저장)일 때만 임시저장/신청하기 허용 */
  fromMypage?: boolean;
  /** MY PAGE 진입 시 해당 신청 건의 학생(요청자) ID. 있으면 학생 자동 선택·변경 불가 */
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
  /** 학생(SNR) 신청 시 매칭 보호자 esntlId (저장 시 pEsntlId) */
  const [linkedParentEsntlId, setLinkedParentEsntlId] = useState("");
  /** 학생(SNR) 로그인 시 학생명 표시(읽기 전용 인풋). 학부모는 셀렉트만 사용 */
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
  /** 새로 선택한 파일 (아직 서버 미업로드). 임시저장/신청하기 시 전송 예정 */
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; file: File }[]
  >([]);
  /** 학생·사업별 기존 신청 건 로드 시 보관 (reqId: REQ_ID 단일 PK, proSeq, sttusCode). 없으면 reqId "", proSeq "0", sttusCode "" */
  const [loadedReqId, setLoadedReqId] = useState("");
  const [loadedProSeq, setLoadedProSeq] = useState("");
  const [loadedSttusCode, setLoadedSttusCode] = useState("");
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

  /** 알림 모달 (사용자웹) */
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  /** 첨부파일 삭제 확인 모달 (DB 기존 파일만) */
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

  /** 학교검색 모달에서 학교 선택 시: 학교명 반영 후 해당 학교 학년/반 옵션 조회 (관리자페이지와 동일) */
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

  /** 신청분야·활동계획서·기타·첨부파일만 초기화 (학생 변경 시 해당 학생 신청 건이 없을 때 사용). 탐구 유형은 1인 탐구형으로. */
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

  /** 초기화: 학생명 해제 → 학생 기준으로 불러온 값들 모두 초기화 (useEffect에서 처리) */
  const handleReset = () => {
    setSelectedStudentId("");
  };

  const handleCertClick = () => {
    setGuardianCertified(true);
    setShowCertError(false);
  };

  /** 저장·신청 가능: 데이터 없음("")이면 항상 가능. 01(임시저장)이면 MY PAGE 진입(fromMypage)일 때만 가능. 02/03/04/05/99는 불가 */
  const canSaveOrApply =
    loadedSttusCode === "" || (loadedSttusCode === "01" && fromMypage);
  const handleSubmitArtappm = (sttusCode: "01" | "02") => {
    if (!proId) {
      showAlert("알림", "지원사업을 선택하고 학생을 선택해주세요.", "danger");
      return;
    }
    if (!selectedStudentId) {
      showAlert("알림", "학생을 선택한 후 저장해 주세요.", "danger");
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
        "자녀 연동이 필요합니다",
        "학부모님이 마이페이지에서 자녀 연동을 완료한 뒤 다시 신청해 주세요.",
        "danger",
      );
      return;
    }
    /** 공고 진입: 저장/신청 전 해당 학생+proId 기존 신청 여부 확인. 있으면 막고 MY PAGE 안내 */
    if (!fromMypage) {
      // 다회 신청 가능 사업(03/05/07)은 학생+proId만으로 선차단하면 안 됨(슬롯: proSeq/workDt 등으로 구분).
      // 중복 차단은 저장 시 백엔드에서 슬롯 기준으로 처리한다.
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
    runInsert(sttusCode);
  };

  const runInsert = (sttusCode: "01" | "02" | "99") => {
    /** 신청하기(02)일 때만 보호자인증 필수. 임시저장(01)·취소(99)는 인증 없이 가능 */
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
    /** REQ_ESNTL_ID = 실제 신청(로그인) 주체. 마이페이지 목록은 이 값으로 조회됨 */
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
            "알림",
            (res as { message?: string })?.message ??
              (isUpdate
                ? "수정은 MY PAGE에서만 가능합니다."
                : "동일한 지원사업 신청 건이 이미 존재합니다."),
            "danger",
          );
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
          if (sttusCode === "02") {
            showAlert("신청 완료", "신청이 완료되었습니다.", "success");
            setLoadedSttusCode("02");
          } else {
            showAlert("임시저장", "임시저장되었습니다.", "success");
            setLoadedSttusCode("01");
          }
          setPendingFiles([]);
          setLoadedProSeq(proSeq);
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
              setAlertTitle("자녀 연동이 필요합니다");
              setAlertMessage(
                "학부모님이 마이페이지에서 자녀 연동을 완료한 뒤 다시 신청해 주세요.",
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

  /** 인증이 준비된 뒤 자녀 목록 조회 (학부모용). 학생(SNR)은 스킵 */
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

  /** MY PAGE 진입 시 reqEsntlId가 있으면 자녀 목록 로드 후 해당 학생 자동 선택(학생 본인 건은 자녀 목록 없이 선택) */
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
    /** 공고 진입: 기존 신청 데이터는 로드하지 않고, 해당 학생 기본 정보만 로드 (저장/신청은 최초 1회만 가능). 인증 상태는 유지 */
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
            aria-label="탐구 유형 선택"
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
                <span>1인 탐구형</span>
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
                <span>모둠 탐구형</span>
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
                    보호자정보
                  </div>
                  <span
                    className={`subTextBlue ${!guardianCertified ? "certRequired" : ""}`.trim()}
                    role="status"
                    aria-live="polite"
                  >
                    {guardianCertified
                      ? "인증이 완료되었습니다."
                      : "보호자를 인증하세요"}
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
                      console.log("🔑 인증 결과 di:", certDi);
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
                          "알림",
                          "로그인한 보호자와 인증한 본인이 일치하지 않습니다. 로그인한 계정의 보호자만 인증할 수 있습니다.",
                          "danger",
                        );

                      if (!esntlId) {
                        mismatchAlert();
                        clearCertCallback();
                        return;
                      }

                      /** 학생(SNR): GET /api/user/armchil/parents 후 연동 보호자 DI와 인증 DI 비교 */
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
                                "알림",
                                "연동된 보호자 정보를 찾을 수 없습니다. 마이페이지에서 자녀 연동을 확인한 뒤 다시 시도해 주세요.",
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
                              "🔑 연동 보호자 CRTFC_DN_VALUE:",
                              storedDi,
                            );
                            if (certDi && storedDi && certDi === storedDi) {
                              setGuardianCertified(true);
                              setGuardianCertDi(certDi);
                              showAlert(
                                "알림",
                                "본인인증이 완료되었습니다.",
                                "success",
                              );
                            } else {
                              mismatchAlert();
                            }
                          })
                          .catch(() => {
                            showAlert(
                              "알림",
                              "본인인증 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
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
                            "🔑 로그인 보호자 CRTFC_DN_VALUE:",
                            storedDi,
                          );
                          if (certDi && storedDi && certDi === storedDi) {
                            setGuardianCertified(true);
                            setGuardianCertDi(certDi);
                            showAlert(
                              "알림",
                              "본인인증이 완료되었습니다.",
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
                  aria-label="보호자 본인인증 하기"
                >
                  인증하기
                </button>
              </div>
              <div className="formGrid">
                <div className="formRow split bizStdSplitRow">
                  <div className="fieldUnit">
                    <label htmlFor="guardianName" className="formLabel">
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
                    <label htmlFor="guardianContact" className="formLabel">
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
                <div className="formRow bizStdApplyRow">
                  <label htmlFor="guardianBirth" className="formLabel">
                    생년월일
                  </label>
                  <div className="formControl">
                    <input
                      type="date"
                      id="guardianBirth"
                      className="inputField bgGray"
                      value={guardianBirth}
                      readOnly
                      aria-label="생년월일"
                    />
                  </div>
                </div>
                <div className="formRow bizStdApplyRow">
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
              </div>
            </section>
            <section className="formSection">
              <div className="sectionHeader">
                <div className="sectionTitle">학생정보</div>
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
                      학생명
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
                          aria-label="학생명"
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
                          aria-label="학생명 선택"
                        >
                          <option value="">이름을 선택해주세요</option>
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
                      성별
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
                          <span className="customText">남</span>
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
                          <span className="customText">여</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="formRow bizStdApplyRow">
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
                <div className="formRow bizStdApplyRow">
                  <span className="formLabel" id="lblSchoolName">
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
                <div className="titleWrapper">
                  <div className="sectionTitle">신청분야</div>
                  <span className="subTextBlue" id="descDuplicate">
                    중복선택 가능합니다
                  </span>
                </div>
              </div>
              <div
                className="formGrid"
                role="group"
                aria-describedby="descDuplicate"
              >
                <div className="formRow">
                  <span className="formLabel">분야선택</span>
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
                <div className="sectionTitle">활동계획서</div>
              </div>
              <div className="formGrid">
                <div className="formRow bizStdApplyRow">
                  <span className="formLabel" id="lblRange">
                    활동범위
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
                        <span className="customText">군산 내</span>
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
                        <span className="customText">군산 외</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="activityPurpose" className="formLabel">
                    목적
                  </label>
                  <div className="formControl">
                    <textarea
                      id="activityPurpose"
                      className="textAreaField"
                      placeholder="활동목적을 입력해주세요"
                      value={activityPurpose}
                      onChange={(e) => setActivityPurpose(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="activityContent" className="formLabel">
                    활동내용
                  </label>
                  <div className="formControl">
                    <textarea
                      id="activityContent"
                      className="textAreaField"
                      placeholder="활동내용을 입력해주세요"
                      value={activityContent}
                      onChange={(e) => setActivityContent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="budgetPlan" className="formLabel">
                    예산 사용계획
                  </label>
                  <div className="formControl">
                    <textarea
                      id="budgetPlan"
                      className="textAreaField"
                      placeholder="예산 사용계획을 입력해주세요"
                      value={budgetPlan}
                      onChange={(e) => setBudgetPlan(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="formSection">
              <div className="sectionHeader">
                <div className="sectionTitle">기타</div>
              </div>
              <div className="formGrid">
                <div className="formRow">
                  <label htmlFor="etcContent" className="formLabel">
                    기타
                  </label>
                  <div className="formControl">
                    <textarea
                      id="etcContent"
                      className="textAreaField"
                      placeholder="기타 내용을 입력해주세요"
                      value={etcContent}
                      onChange={(e) => setEtcContent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow bizStdAttachRow">
                  <span className="formLabel">
                    첨부파일
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
                          aria-label="파일 첨부하기"
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
                        첨부된 파일이 없습니다.
                      </span>
                    ) : (
                      <>
                        {existingFiles.map((file) => {
                          const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(file.fileId)}&seq=${encodeURIComponent(file.seq)}`;
                          const label = file.orgfNm || `파일 ${file.seq}`;
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
                                aria-label={`${label} 파일 삭제`}
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
                                  aria-label={`${label} 파일 삭제`}
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
                  aria-label="학생 및 입력 내용 초기화"
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
                aria-label="신청"
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
                      showAlert("알림", "이미 취소된 건입니다.", "danger");
                      return;
                    }
                    setShowCancelConfirm(true);
                  }}
                  aria-label="신청 취소"
                >
                  취소
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

export default BizInputSection;
