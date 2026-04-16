"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import {
  apiClient,
  downloadEdreamAttachmentOrOpenView,
  TokenUtils,
  openSirenPassBlankWindow,
  tryCloseSirenPassWindow,
  postSirenCreateTokenAndSubmit,
  getSirenTokenAuthRetUrlForApply,
} from "@/shared/lib";
import { API_ENDPOINTS, API_CONFIG, EDREAM_CERT_SIREN } from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { UserArmchilService } from "@/entities/userWeb/armchil/api";
import SchoolSearchModal, {
  type SchoolItem,
} from "@/widgets/userWeb/SchoolSearchModal";

/** 확장자별 파일 아이콘 클래스 (biz_pr.css .file.hwp/.img/.pdf 등) */
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

/** 생년월일 8자리 → input[type=date] 형식 (YYYY-MM-DD) */
function formatBrthdyForInput(brthdy: string | undefined): string {
  if (!brthdy || brthdy.length < 8) return "";
  const d = brthdy.replace(/\D/g, "").slice(0, 8);
  if (d.length < 8) return "";
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

interface ArmchilChildItem {
  esntlId?: string;
  userNm?: string;
}

export interface BizInputVdSectionProps {
  proId?: string;
  fromMypage?: boolean;
  initialReqEsntlId?: string;
}

/** gunsan bizInput과 동일: 첨부파일 아이콘은 userWeb/icon (ico_file_add, ico_file_del) */
const ICON = "/images/userWeb/icon";

/** "1반", "11반" 등에서 숫자만 추출 (학급 반 번호) — BizInputPrSection과 동일 */
function parseClassNumber(classNm: string): number {
  const digits = (classNm || "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** 반 표시: "2" → "2반", "2반" → "2반" — BizInputPrSection과 동일 */
function formatClassLabel(classNm: string): string {
  const s = (classNm ?? "").trim();
  if (!s) return "";
  return /반\s*$/.test(s) ? s : `${s}반`;
}

/** 본인인증: 폼에 hidden input 추가 (청소년 자기계발 연수지원 bizInput과 동일) */
function addHiddenInput(formId: string, name: string, value: string) {
  const form = document.getElementById(formId);
  if (!form) return;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

/** 본인인증: 토큰 요청 후 reqCBAForm 생성 (청소년 자기계발 연수지원 bizInput과 동일) */
async function fetchCertToken(): Promise<void> {
  const params = new URLSearchParams();
  params.append("srvNo", "017001");
  params.append("retUrl", getSirenTokenAuthRetUrlForApply());
  const response = await axios.post(
    EDREAM_CERT_SIREN.TOKEN_AUTH,
    params,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: TokenUtils.getToken(),
      },
      timeout: 10000,
      withCredentials: true,
    },
  );
  let oldForm = document.getElementById("reqCBAForm");
  if (oldForm) oldForm.remove();
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
}

/** 본인인증: 클릭 직후 빈 팝업을 연 뒤 createToken (팝업 차단 방지) */
async function createCertToken(): Promise<void> {
  const passPopup = openSirenPassBlankWindow();
  if (!passPopup || passPopup.closed) return;
  const formElements = document.getElementsByName("reqCBAForm");
  const formElement = formElements[0] as HTMLFormElement;
  if (!formElement) {
    tryCloseSirenPassWindow(passPopup);
    return;
  }
  try {
    await postSirenCreateTokenAndSubmit(
      formElement,
      addHiddenInput,
      TokenUtils.getToken(),
    );
  } catch {
    tryCloseSirenPassWindow(passPopup);
  }
}

/**
 * 1:1 원어민 화상영어(04) 전용 신청 폼.
 * 보호자 본인인증(인증하기) — 청소년 자기계발 연수지원(bizInput)과 동일.
 * API: BY_STUDENT 로드, POST /api/user/artappm/ (학교구분·학교소재지 미전송).
 */
const BizInputVdSection: React.FC<BizInputVdSectionProps> = ({
  proId,
  fromMypage = false,
  initialReqEsntlId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReqId = (searchParams.get("reqId") ?? "").trim();
  const [guardianCertified, setGuardianCertified] = useState(false);
  const [guardianCertDi, setGuardianCertDi] = useState("");
  const [guardianId, setGuardianId] = useState("");

  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [guardianBirth, setGuardianBirth] = useState("");
  const [lowIncome, setLowIncome] = useState("");

  const [children, setChildren] = useState<ArmchilChildItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSelfOption, setStudentSelfOption] =
    useState<ArmchilChildItem | null>(null);
  const [linkedParentEsntlId, setLinkedParentEsntlId] = useState("");
  const snParentLinkAlertShownRef = useRef(false);
  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState<"M" | "F" | "">("M");
  const [studentContact, setStudentContact] = useState("");
  const [studentBirth, setStudentBirth] = useState("");
  const [studentAddr, setStudentAddr] = useState("");
  const [studentId, setStudentId] = useState("");

  const [schoolNm, setSchoolNm] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolLvl, setSchoolLvl] = useState("");
  const [schoolNo, setSchoolNo] = useState("");
  const [showSchoolModal, setShowSchoolModal] = useState(false);
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

  const [schoolGb, setSchoolGb] = useState<"rural" | "urban" | "">("");
  const [schoolAddr, setSchoolAddr] = useState("");

  const [existingFiles, setExistingFiles] = useState<
    { fileId: string; seq: number; orgfNm?: string }[]
  >([]);
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [loadedReqId, setLoadedReqId] = useState("");
  const [loadedProSeq, setLoadedProSeq] = useState("");
  const [loadedSttusCode, setLoadedSttusCode] = useState("");

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("danger");
  const [showDeleteFileConfirm, setShowDeleteFileConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string;
    seq: number;
  } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const focusAfterAlertRef = useRef<string | null>(null);
  const afterAlertCloseRef = useRef<(() => void) | null>(null);
  const studentSelectRef = useRef<HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialReqEsntlIdAppliedRef = useRef(false);

  const showAlertModal = (
    title: string,
    message: string,
    type: AlertModalType,
    focusId?: string,
  ) => {
    focusAfterAlertRef.current = focusId ?? null;
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  const handleReset = () => {
    setSelectedStudentId("");
    setLowIncome("");
    setSchoolNm("");
    setSchoolId("");
    setSchoolLvl("");
    setSchoolNo("");
    setClassListForSchool([]);
    setGradeOptions([]);
    setClassOptions([]);
    setSchoolGb("");
    setSchoolAddr("");
    setPendingFiles([]);
  };

  /** 저장된 학교명으로 NEIS 학교 조회 후 학년/반 옵션 설정 (BY_STUDENT 로드 시) */
  const fetchGradeOptionsBySchoolName = useCallback((name: string) => {
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
  }, []);

  /** 보호자: 학부모(PNR)=로그인자, 학생(SNR)=마이페이지 자녀연동 보호자(PARENTS[0]) */
  useEffect(() => {
    const esntlId = AuthService.getEsntlId();
    if (!esntlId) return;
    if (AuthService.getUserSe() === "SNR") {
      setSelectedStudentId(esntlId);
      setLinkedParentEsntlId("");
      setGuardianName("");
      setGuardianContact("");
      setGuardianBirth("");
      setGuardianId("");
      UserArmuserService.getDetail(esntlId)
        .then((r) => {
          const u = r.detail;
          if (u)
            setStudentSelfOption({
              esntlId,
              userNm: u.userNm ?? "",
            });
        })
        .catch(() => setStudentSelfOption({ esntlId, userNm: "" }));
      apiClient
        .get<{ data?: ArmchilChildItem[] }>(API_ENDPOINTS.USER_ARMCHIL.PARENTS)
        .then((res) => {
          const arr = Array.isArray(res?.data) ? res.data : [];
          const first = (arr[0]?.esntlId ?? "").trim();
          if (!first) {
            if (!snParentLinkAlertShownRef.current) {
              snParentLinkAlertShownRef.current = true;
              showAlertModal(
                "자녀 연동이 필요합니다",
                "학부모님이 마이페이지에서 자녀 연동을 완료한 뒤 다시 신청해 주세요.",
                "danger",
              );
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
              setGuardianId(
                (d.ihidnum ?? "").replace(/\D/g, "").slice(0, 13) ?? "",
              );
            })
            .catch(() => {});
        })
        .catch(() => {});
      return;
    }
    UserArmuserService.getDetail(esntlId)
      .then((r) => {
        const d = r.detail;
        if (!d) return;
        setGuardianName(d.userNm ?? "");
        setGuardianContact(d.mbtlnum ?? "");
        setGuardianBirth(formatBrthdyForInput(d.brthdy ?? ""));
        setGuardianId((d.ihidnum ?? "").replace(/\D/g, "").slice(0, 13) ?? "");
      })
      .catch(() => {});
  }, []);

  /** 자녀 목록 로드 (학부모만) */
  useEffect(() => {
    if (AuthService.getUserSe() === "SNR") return;
    apiClient
      .get<{ data?: ArmchilChildItem[] }>(API_ENDPOINTS.USER_ARMCHIL.CHILDREN)
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setChildren(arr);
        if (arr.length === 0) setSelectedStudentId("");
      })
      .catch(() => setChildren([]));
  }, []);

  /** MY PAGE 진입 시 해당 자녀로 초기 선택 */
  useEffect(() => {
    if (initialReqEsntlIdAppliedRef.current || !initialReqEsntlId) return;
    if (
      AuthService.getUserSe() === "SNR" &&
      AuthService.getEsntlId() === (initialReqEsntlId ?? "").trim()
    ) {
      setSelectedStudentId(initialReqEsntlId);
      initialReqEsntlIdAppliedRef.current = true;
      return;
    }
    if (children.some((c) => c.esntlId === initialReqEsntlId)) {
      setSelectedStudentId(initialReqEsntlId);
      initialReqEsntlIdAppliedRef.current = true;
    }
  }, [initialReqEsntlId, children]);

  const studentSelectOptions: ArmchilChildItem[] =
    AuthService.getUserSe() === "SNR"
      ? studentSelfOption
        ? [studentSelfOption]
        : []
      : children;

  /** 학생 선택 시: fromMypage+proId면 BY_STUDENT 로드, 아니면 자녀 상세만 로드 */
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentName("");
      setStudentGender("M");
      setStudentContact("");
      setStudentBirth("");
      setStudentAddr("");
      setStudentId("");
      setSchoolNm("");
      setSchoolLvl("");
      setSchoolNo("");
      setSchoolId("");
      setClassListForSchool([]);
      setGradeOptions([]);
      setClassOptions([]);
      setExistingFiles([]);
      setLoadedReqId("");
      setLoadedProSeq("");
      setLoadedSttusCode("");
      return;
    }
    if (fromMypage && proId) {
      const params = new URLSearchParams({
        proId,
        reqEsntlId: selectedStudentId,
      });
      const useReqId =
        initialReqId !== "" &&
        (initialReqEsntlId ?? "").trim() !== "" &&
        selectedStudentId === (initialReqEsntlId ?? "").trim();
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
            setGuardianCertified((d.certYn as string) === "Y");
            setGuardianCertDi((d.crtfcDnValue as string) ?? "");
            setGuardianName((d.pUserNm as string) ?? guardianName);
            if (AuthService.getUserSe() === "SNR") {
              const pe = String(
                (d as { pEsntlId?: unknown }).pEsntlId ?? "",
              ).trim();
              if (pe) setLinkedParentEsntlId(pe);
            }
            setStudentName((d.userNm as string) ?? "");
            setStudentBirth(formatBrthdyForInput((d.cBrthdy as string) ?? ""));
            setStudentContact((d.cMbtlnum as string) ?? "");
            setStudentId((d.cIhidnum as string) ?? "");
            setStudentGender(
              ((d.cSexdstnCode as string) ?? "M") === "F" ? "F" : "M",
            );
            const adres = [d.zip, d.adres, d.detailAdres]
              .filter(Boolean)
              .map((x) => String(x))
              .join(" ")
              .trim();
            setStudentAddr(adres);
            setSchoolNm((d.schoolNm as string) ?? "");
            setSchoolLvl(String(d.schoolLvl ?? ""));
            setSchoolNo(String(d.schoolNo ?? ""));
            setSchoolId((d.schoolId as string) ?? "");
            const farmYnVal = ((d as Record<string, unknown>)["FARM_YN"] ??
              (d as Record<string, unknown>).farmYn) as string;
            const farmYnStr = String(farmYnVal ?? "").trim();
            setSchoolGb(
              farmYnStr === "Y" ? "rural" : farmYnStr === "N" ? "urban" : "",
            );
            setSchoolAddr(
              String(
                (d as Record<string, unknown>)["FARM_DESC"] ??
                  (d as Record<string, unknown>).farmDesc ??
                  "",
              ).trim(),
            );
            setLowIncome(
              String(
                (d as Record<string, unknown>)["LOW_INCOME_NM"] ??
                  (d as Record<string, unknown>).lowIncomeNm ??
                  "",
              ).trim(),
            );
            setExistingFiles(Array.isArray(res.fileList) ? res.fileList : []);
            fetchGradeOptionsBySchoolName((d.schoolNm as string) ?? "");
          } else {
            UserArmuserService.getDetail(selectedStudentId)
              .then((r) => {
                const u = r.detail;
                if (!u) return;
                setStudentName(u.userNm ?? "");
                setStudentBirth(formatBrthdyForInput(u.brthdy ?? ""));
                setStudentContact(u.mbtlnum ?? "");
                setStudentId((u.ihidnum ?? "").replace(/\D/g, "").slice(0, 13));
                setStudentGender((u.sexdstnCode ?? "M") === "F" ? "F" : "M");
                setStudentAddr(
                  [u.zip, u.adres, u.detailAdres].filter(Boolean).join(" ") ||
                    "",
                );
                setSchoolNm(u.schoolNm ?? "");
                setSchoolLvl(String(u.schoolLvl ?? ""));
                setSchoolNo(String(u.schoolNo ?? ""));
                setSchoolId(u.schoolId ?? "");
                (() => {
                  const r = u as Record<string, unknown>;
                  const v = String(r["FARM_YN"] ?? r.farmYn ?? "").trim();
                  setSchoolGb(v === "Y" ? "rural" : v === "N" ? "urban" : "");
                })();
                setSchoolAddr(
                  String(
                    (u as Record<string, unknown>)["FARM_DESC"] ??
                      (u as Record<string, unknown>).farmDesc ??
                      "",
                  ).trim(),
                );
                setLowIncome(
                  String(
                    (u as Record<string, unknown>)["LOW_INCOME_NM"] ??
                      (u as Record<string, unknown>).lowIncomeNm ??
                      "",
                  ).trim(),
                );
                setLoadedReqId("");
                setLoadedProSeq("0");
                setLoadedSttusCode("");
                setExistingFiles([]);
                fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          UserArmuserService.getDetail(selectedStudentId)
            .then((r) => {
              const u = r.detail;
              if (!u) return;
              setStudentName(u.userNm ?? "");
              setStudentBirth(formatBrthdyForInput(u.brthdy ?? ""));
              setStudentContact(u.mbtlnum ?? "");
              setStudentId((u.ihidnum ?? "").replace(/\D/g, "").slice(0, 13));
              setStudentGender((u.sexdstnCode ?? "M") === "F" ? "F" : "M");
              setStudentAddr(
                [u.zip, u.adres, u.detailAdres].filter(Boolean).join(" ") || "",
              );
              setSchoolNm(u.schoolNm ?? "");
              setSchoolLvl(String(u.schoolLvl ?? ""));
              setSchoolNo(String(u.schoolNo ?? ""));
              setSchoolId(u.schoolId ?? "");
              (() => {
                const r = u as Record<string, unknown>;
                const v = String(r["FARM_YN"] ?? r.farmYn ?? "").trim();
                setSchoolGb(v === "Y" ? "rural" : v === "N" ? "urban" : "");
              })();
              setSchoolAddr(
                String(
                  (u as Record<string, unknown>)["FARM_DESC"] ??
                    (u as Record<string, unknown>).farmDesc ??
                    "",
                ).trim(),
              );
              setLowIncome(
                String(
                  (u as Record<string, unknown>)["LOW_INCOME_NM"] ??
                    (u as Record<string, unknown>).lowIncomeNm ??
                    "",
                ).trim(),
              );
              setExistingFiles([]);
              fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
            })
            .catch(() => {});
        });
      return;
    }
    UserArmuserService.getDetail(selectedStudentId)
      .then((r) => {
        const u = r.detail;
        if (!u) return;
        setStudentName(u.userNm ?? "");
        setStudentBirth(formatBrthdyForInput(u.brthdy ?? ""));
        setStudentContact(u.mbtlnum ?? "");
        setStudentId((u.ihidnum ?? "").replace(/\D/g, "").slice(0, 13));
        setStudentGender((u.sexdstnCode ?? "M") === "F" ? "F" : "M");
        setStudentAddr(
          [u.zip, u.adres, u.detailAdres].filter(Boolean).join(" ") || "",
        );
        setSchoolNm(u.schoolNm ?? "");
        setSchoolLvl(String(u.schoolLvl ?? ""));
        setSchoolNo(String(u.schoolNo ?? ""));
        setSchoolId(u.schoolId ?? "");
        (() => {
          const r = u as Record<string, unknown>;
          const v = String(r["FARM_YN"] ?? r.farmYn ?? "").trim();
          setSchoolGb(v === "Y" ? "rural" : v === "N" ? "urban" : "");
        })();
        setSchoolAddr(
          String(
            (u as Record<string, unknown>)["FARM_DESC"] ??
              (u as Record<string, unknown>).farmDesc ??
              "",
          ).trim(),
        );
        setLowIncome(
          String(
            (u as Record<string, unknown>)["LOW_INCOME_NM"] ??
              (u as Record<string, unknown>).lowIncomeNm ??
              "",
          ).trim(),
        );
        setExistingFiles([]);
        setLoadedReqId("");
        setLoadedProSeq("0");
        setLoadedSttusCode("");
        fetchGradeOptionsBySchoolName(u.schoolNm ?? "");
      })
      .catch(() => {});
  }, [
    selectedStudentId,
    fromMypage,
    proId,
    guardianName,
    fetchGradeOptionsBySchoolName,
  ]);

  /** 학교검색 모달에서 학교 선택 시: 학교명 반영 후 해당 학교 학년/반 옵션 조회 (BizInputPrSection·공공형 진로진학과 동일) */
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

  /** 학년 변경 시 해당 학년 반 목록으로 classOptions 갱신 (BizInputPrSection과 동일) */
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

  const canSaveOrApply =
    loadedSttusCode === "" || (loadedSttusCode === "01" && fromMypage);

  /** 기존 첨부파일 1건 삭제 (reqId 기준) */
  const removeExistingFile = (fileId: string, seq: number) => {
    if (!canSaveOrApply) {
      showAlertModal(
        "알림",
        "이미 신청 완료된 지원사업은 수정할 수 없습니다.",
        "danger",
      );
      return;
    }
    if (!loadedReqId) {
      setExistingFiles((prev) =>
        prev.filter((f) => !(f.fileId === fileId && f.seq === seq)),
      );
      return;
    }
    apiClient
      .delete<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTAPPM.DELETE_FILE_BY_REQ_ID(
          loadedReqId,
          fileId,
          seq,
        ),
      )
      .then((res) => {
        if (res?.result === "00") {
          setExistingFiles((prev) =>
            prev.filter((f) => !(f.fileId === fileId && f.seq === seq)),
          );
        } else {
          showAlertModal(
            "알림",
            res?.message ?? "파일 삭제에 실패했습니다.",
            "danger",
          );
        }
      })
      .catch(() => {
        showAlertModal("알림", "파일 삭제 중 오류가 발생했습니다.", "danger");
      });
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const runInsert = (sttusCode: "01" | "02" | "99") => {
    const isSn = AuthService.getUserSe() === "SNR";
    const pEsntlId = isSn
      ? (linkedParentEsntlId || "")
      : (AuthService.getEsntlId() ?? "");
    const proSeq = loadedProSeq && loadedProSeq !== "" ? loadedProSeq : "0";
    const fileId = existingFiles[0]?.fileId ?? "";
    const fileSeqs =
      pendingFiles.length > 0 ? pendingFiles.map((_, i) => i + 1) : undefined;

    const loginEsntlId = AuthService.getEsntlId() ?? "";
    const data: Record<string, unknown> = {
      ...(loadedReqId ? { reqId: loadedReqId } : {}),
      proId: proId ?? "",
      proSeq,
      proGb: "04",
      reqEsntlId: loginEsntlId,
      cEsntlId: selectedStudentId,
      proType: "01",
      pEsntlId,
      headNm: "",
      pUserNm: guardianName,
      mbtlnum: guardianContact?.replace(/\D/g, "") ?? "",
      brthdy: studentBirth ? studentBirth.replace(/-/g, "").slice(0, 8) : "",
      pIhidnum: guardianId?.replace(/\D/g, "") ?? "",
      cIhidnum: studentId?.replace(/\D/g, "") ?? "",
      certYn: guardianCertified ? "Y" : "N",
      crtfcDnValue: guardianCertDi ?? "",
      schoolId: schoolId ?? "",
      schoolGb: schoolGb === "rural" ? "Y" : schoolGb === "urban" ? "N" : "",
      schoolNm: schoolNm ?? "",
      schoolLvl: schoolLvl ? parseInt(schoolLvl, 10) : 0,
      schoolNo: schoolNo ? parseInt(schoolNo, 10) : 0,
      payBankCode: "",
      payBank: "",
      holderNm: "",
      reqPart: "",
      playPart: "",
      reqObj: "",
      reqPlay: "",
      reqPlan: "",
      mchilYn: "N",
      mchilNm: "",
      reqDesc: "",
      fileId,
      fileSeqs,
      sttusCode,
    };

    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
      "data.json",
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
          showAlertModal(
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
            showAlertModal("취소 완료", "신청이 취소되었습니다.", "success");
          } else if (sttusCode === "02") {
            showAlertModal("신청 완료", "신청이 완료되었습니다.", "success");
          } else {
            showAlertModal("임시저장", "임시저장되었습니다.", "success");
          }
          setLoadedSttusCode(sttusCode);
          setPendingFiles([]);
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
        } else {
          showAlertModal(
            "알림",
            (res as { message?: string })?.message ?? "저장에 실패했습니다.",
            "danger",
          );
        }
      })
      .catch(() => {
        showAlertModal("알림", "저장 중 오류가 발생했습니다.", "danger");
      });
  };

  const handleSubmitArtappm = (sttusCode: "01" | "02" | "99") => {
    if (!proId) {
      showAlertModal(
        "알림",
        "지원사업을 선택하고 학생을 선택해주세요.",
        "danger",
      );
      return;
    }
    if (!selectedStudentId) {
      showAlertModal("알림", "학생을 선택한 후 저장해 주세요.", "danger");
      focusAfterAlertRef.current = "studentSelect";
      return;
    }
    if (AuthService.getUserSe() === "SNR" && !linkedParentEsntlId.trim()) {
      showAlertModal(
        "자녀 연동이 필요합니다",
        "학부모님이 마이페이지에서 자녀 연동을 완료한 뒤 다시 신청해 주세요.",
        "danger",
      );
      return;
    }
    if (!fromMypage) {
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
            showAlertModal(
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
      showAlertModal(
        "알림",
        "이미 신청 완료된 지원사업은 수정할 수 없습니다.",
        "danger",
      );
      return;
    }
    runInsert(sttusCode);
  };

  const handleTempSave = () => {
    if (!schoolNm?.trim()) {
      showAlertModal("안내", "학교를 검색하여 선택해 주세요.", "danger");
      return;
    }
    if (!schoolLvl) {
      showAlertModal("안내", "학년을 선택해 주세요.", "danger", "schoolLvl");
      return;
    }
    if (!schoolNo && classOptions.length > 0) {
      showAlertModal("안내", "반을 선택해 주세요.", "danger", "schoolNo");
      return;
    }
    handleSubmitArtappm("01");
  };

  /** 본인인증 토큰 준비 (청소년 자기계발 연수지원과 동일, 마운트 시 1회) */
  useEffect(() => {
    fetchCertToken();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianCertified) {
      showAlertModal("안내", "보호자 인증을 완료해 주세요.", "danger");
      return;
    }
    if (!schoolNm?.trim()) {
      showAlertModal("안내", "학교를 검색하여 선택해 주세요.", "danger");
      return;
    }
    if (!schoolLvl) {
      showAlertModal("안내", "학년을 선택해 주세요.", "danger", "schoolLvl");
      return;
    }
    if (!schoolNo && classOptions.length > 0) {
      showAlertModal("안내", "반을 선택해 주세요.", "danger", "schoolNo");
      return;
    }
    if (!schoolGb) {
      showAlertModal("안내", "학교구분을 선택해 주세요.", "danger", "schoolGb");
      return;
    }
    if (!schoolAddr?.trim()) {
      showAlertModal(
        "안내",
        "학교소재지를 입력해 주세요.",
        "danger",
        "schoolAddr",
      );
      return;
    }
    handleSubmitArtappm("02");
  };

  const focusField = (id: string) => {
    requestAnimationFrame(() => {
      document.getElementById(id)?.focus();
    });
  };

  const handleAlertConfirm = () => {
    setShowAlert(false);
    const id = focusAfterAlertRef.current;
    focusAfterAlertRef.current = null;
    if (id) {
      if (id === "studentSelect") {
        studentSelectRef.current?.focus();
      } else {
        focusField(id);
      }
    }
    const after = afterAlertCloseRef.current;
    afterAlertCloseRef.current = null;
    if (after) after();
  };

  return (
    <>
      <section className="inner">
        <div className="mainBg">
          <div className="registrationContainer bizInput">
            <form className="mainForm" onSubmit={handleSubmit}>
              <section
                className="formSection"
                aria-labelledby="bizVdGuardianSectionTitle"
              >
                <div className="sectionHeader">
                  <div className="titleWrapper">
                    <div
                      className="sectionTitle"
                      id="bizVdGuardianSectionTitle"
                    >
                      학부모정보
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
                          showAlertModal(
                            "알림",
                            "로그인한 보호자와 인증한 본인이 일치하지 않습니다. 로그인한 계정의 보호자만 인증할 수 있습니다.",
                            "danger",
                          );

                        if (!esntlId) {
                          mismatchAlert();
                          clearCertCallback();
                          return;
                        }

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
                                  (p) => (p.esntlId ?? "").trim() === preferred,
                                )
                                  ? preferred
                                  : (arr[0]?.esntlId ?? "").trim();
                              const parentId = fromList;
                              if (!parentId) {
                                showAlertModal(
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
                              if (certDi && storedDi && certDi === storedDi) {
                                setGuardianCertified(true);
                                setGuardianCertDi(certDi);
                                showAlertModal(
                                  "알림",
                                  "본인인증이 완료되었습니다.",
                                  "success",
                                );
                              } else {
                                mismatchAlert();
                              }
                            })
                            .catch(() => {
                              showAlertModal(
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
                            if (certDi && storedDi && certDi === storedDi) {
                              setGuardianCertified(true);
                              setGuardianCertDi(certDi);
                              showAlertModal(
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
                      createCertToken();
                    }}
                    aria-label="보호자 본인인증 하기"
                  >
                    인증하기
                  </button>
                </div>
                <div className="formGrid bizInput">
                  <div className="formRow split">
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
                          onChange={(e) => setGuardianName(e.target.value)}
                          readOnly
                          aria-readonly="true"
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
                          onChange={(e) => setGuardianContact(e.target.value)}
                          readOnly
                          aria-readonly="true"
                          aria-label="연락처"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="guardianBirth" className="formLabel">
                        생년월일
                      </label>
                      <div className="formControl">
                        <input
                          type="date"
                          id="guardianBirth"
                          className="inputField bgGray"
                          value={guardianBirth}
                          onChange={(e) => setGuardianBirth(e.target.value)}
                          readOnly
                          aria-readonly="true"
                          aria-label="생년월일"
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
                <div className="formGrid bizInput">
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label
                        htmlFor="studentName"
                        className="formLabel"
                        id="lblStudentNameVd"
                      >
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                        학생명
                      </label>
                      <div className="formControl">
                        {children.length > 0 ? (
                          <select
                            ref={studentSelectRef}
                            id="studentSelect"
                            className={`selectField ${fromMypage ? "bgGray" : ""}`}
                            value={selectedStudentId}
                            onChange={(e) =>
                              setSelectedStudentId(e.target.value)
                            }
                            disabled={fromMypage}
                            aria-required="true"
                            aria-label="학생명 선택"
                          >
                            <option value="">학생을 선택하세요</option>
                            {studentSelectOptions.map((c) => (
                              <option
                                key={c.esntlId ?? ""}
                                value={c.esntlId ?? ""}
                              >
                                {c.userNm ?? c.esntlId ?? ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            id="studentName"
                            className="inputField bgGray"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            readOnly
                            aria-readonly="true"
                            aria-label="학생명"
                          />
                        )}
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <span className="formLabel">성별</span>
                      <div className="formControl">
                        <div
                          className="customGroup"
                          role="radiogroup"
                          id="studentGender"
                          aria-required="true"
                          aria-label="성별"
                        >
                          <label className="customItem">
                            <input
                              type="radio"
                              name="studentGender"
                              className="customInput"
                              value="M"
                              checked={studentGender === "M"}
                              onChange={() => setStudentGender("M")}
                              disabled
                            />
                            <div className="customBox">
                              <span className="customIcon" aria-hidden="true" />
                              <span className="customText">남</span>
                            </div>
                          </label>
                          <label className="customItem">
                            <input
                              type="radio"
                              name="studentGender"
                              className="customInput"
                              value="F"
                              checked={studentGender === "F"}
                              onChange={() => setStudentGender("F")}
                              disabled
                            />
                            <div className="customBox">
                              <span className="customIcon" aria-hidden="true" />
                              <span className="customText">여</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="studentContact" className="formLabel">
                        연락처
                      </label>
                      <div className="formControl">
                        <input
                          type="tel"
                          id="studentContact"
                          className="inputField bgGray"
                          value={studentContact}
                          onChange={(e) => setStudentContact(e.target.value)}
                          readOnly
                          aria-readonly="true"
                          aria-label="학생 연락처"
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="studentBirth" className="formLabel">
                        생년월일
                      </label>
                      <div className="formControl">
                        <input
                          type="date"
                          id="studentBirth"
                          className="inputField bgGray"
                          value={studentBirth}
                          onChange={(e) => setStudentBirth(e.target.value)}
                          readOnly
                          aria-readonly="true"
                          aria-label="생년월일"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <div className="fieldUnit">
                      <label htmlFor="studentAddr" className="formLabel">
                        주소
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="studentAddr"
                          className="inputField bgGray"
                          value={studentAddr}
                          onChange={(e) => setStudentAddr(e.target.value)}
                          readOnly
                          aria-readonly="true"
                          aria-label="주소"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="lowIncome" className="formLabel">
                        저소득층
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="lowIncome"
                          className="inputField bgGray"
                          value={lowIncome}
                          readOnly
                          aria-label="저소득층 (읽기전용)"
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
                <div className="formGrid bizInput">
                  <div className="formRow">
                    <span className="formLabel" id="lblSchoolNameVd">
                      학교명
                    </span>
                    <div className="formControl">
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
                  <div className="formRow">
                    <span className="formLabel">학교구분</span>
                    <div className="formControl">
                      <div
                        className="customGroup"
                        role="radiogroup"
                        id="schoolGb"
                        aria-label="학교구분 (읽기전용)"
                        aria-readonly="true"
                      >
                        <label className="customItem">
                          <input
                            type="radio"
                            name="schoolGb"
                            className="customInput"
                            value="rural"
                            checked={schoolGb === "rural"}
                            disabled
                            readOnly
                            aria-label="농어촌"
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">농어촌</span>
                          </div>
                        </label>
                        <label className="customItem">
                          <input
                            type="radio"
                            name="schoolGb"
                            className="customInput"
                            value="urban"
                            checked={schoolGb === "urban"}
                            disabled
                            readOnly
                            aria-label="시내권"
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">시내권</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <div className="fieldUnit">
                      <label htmlFor="schoolAddr" className="formLabel">
                        학교소재지
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="schoolAddr"
                          className="inputField bgGray"
                          value={schoolAddr}
                          readOnly
                          aria-readonly="true"
                          aria-label="학교소재지 (읽기전용)"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <span className="formLabel">
                      첨부파일
                      {canSaveOrApply && (
                        <label
                          className="btnFileAdd"
                          htmlFor="bizVdFileInput"
                          aria-label="파일 추가"
                        >
                          <img
                            src={`${ICON}/ico_file_add.png`}
                            alt=""
                            aria-hidden="true"
                          />
                        </label>
                      )}
                    </span>
                    <div className="formControl">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="bizVdFileInput"
                        className="blind"
                        multiple
                        accept=".hwp,.hwpx,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileSelect}
                        disabled={!canSaveOrApply}
                        aria-label="첨부파일 선택"
                      />
                      <div className="formControl fileListContainer">
                        {existingFiles.length === 0 &&
                        pendingFiles.length === 0 ? (
                          <span className="fileListEmpty">
                            첨부된 파일이 없습니다.
                          </span>
                        ) : (
                          <>
                            {existingFiles.map((f) => {
                              const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(f.fileId)}&seq=${encodeURIComponent(f.seq)}`;
                              const label = f.orgfNm ?? `파일 ${f.seq}`;
                              const typeClass = getFileTypeClass(label);
                              return (
                                <div
                                  key={`${f.fileId}-${f.seq}`}
                                  className={`file ${typeClass}`.trim()}
                                >
                                  <span>
                                    <a
                                      href={viewUrl}
                                      className="fileLink"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        void downloadEdreamAttachmentOrOpenView(
                                          f.fileId,
                                          f.seq,
                                          viewUrl,
                                          label || undefined,
                                        );
                                      }}
                                    >
                                      {label}
                                    </a>
                                  </span>
                                  {canSaveOrApply && (
                                    <button
                                      type="button"
                                      className="btnFileDel"
                                      onClick={(ev) => {
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        setFileToDelete({
                                          fileId: f.fileId,
                                          seq: f.seq,
                                        });
                                        setShowDeleteFileConfirm(true);
                                      }}
                                      aria-label={`${label} 파일 삭제`}
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
                            {pendingFiles.map((p) => {
                              const label = p.file.name;
                              const typeClass = getFileTypeClass(label);
                              return (
                                <div
                                  key={p.id}
                                  className={`file ${typeClass}`.trim()}
                                >
                                  <span>{label}</span>
                                  {canSaveOrApply && (
                                    <button
                                      type="button"
                                      className="btnFileDel"
                                      onClick={() => removePendingFile(p.id)}
                                      aria-label={`${label} 파일 제거`}
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
                </div>
              </section>

              <div className="formActions">
                {!fromMypage && (
                  <button
                    type="button"
                    className="btnWhite"
                    onClick={handleReset}
                    aria-label="입력 내용 초기화"
                  >
                    초기화
                  </button>
                )}
                <button
                  type="button"
                  className="btnWhite"
                  onClick={handleTempSave}
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
                        showAlertModal(
                          "알림",
                          "이미 취소된 건입니다.",
                          "danger",
                        );
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
      </section>

      <SchoolSearchModal
        isOpen={showSchoolModal}
        onClose={() => setShowSchoolModal(false)}
        onSelect={handleSchoolSelect}
      />

      <AlertModal
        isOpen={showAlert}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={handleAlertConfirm}
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
    </>
  );
};

export default BizInputVdSection;
