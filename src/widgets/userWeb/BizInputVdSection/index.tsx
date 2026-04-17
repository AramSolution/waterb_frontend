"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import {
  apiClient,
  downloadWaterbAttachmentOrOpenView,
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

/** ?ïÏû•?êÎ≥Ñ ?åÏùº ?ÑÏù¥ÏΩ??¥Îûò??(biz_pr.css .file.hwp/.img/.pdf ?? */
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

/** ?ùÎÖÑ?îÏùº 8?êÎ¶¨ ??input[type=date] ?ïÏãù (YYYY-MM-DD) */
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

/** gunsan bizInputÍ≥??ôÏùº: Ï≤®Î??åÏùº ?ÑÏù¥ÏΩòÏ? userWeb/icon (ico_file_add, ico_file_del) */
const ICON = "/images/userWeb/icon";

/** "1Î∞?, "11Î∞? ?±Ïóê???´ÏûêÎß?Ï∂îÏ∂ú (?ôÍ∏â Î∞?Î≤àÌò∏) ??BizInputPrSectionÍ≥??ôÏùº */
function parseClassNumber(classNm: string): number {
  const digits = (classNm || "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Î∞??úÏãú: "2" ??"2Î∞?, "2Î∞? ??"2Î∞? ??BizInputPrSectionÍ≥??ôÏùº */
function formatClassLabel(classNm: string): string {
  const s = (classNm ?? "").trim();
  if (!s) return "";
  return /Î∞?s*$/.test(s) ? s : `${s}Î∞?;
}

/** Î≥∏Ïù∏?∏Ï¶ù: ?ºÏóê hidden input Ï∂îÍ? (Ï≤?Üå???êÍ∏∞Í≥ÑÎ∞ú ?∞ÏàòÏßÄ??bizInputÍ≥??ôÏùº) */
function addHiddenInput(formId: string, name: string, value: string) {
  const form = document.getElementById(formId);
  if (!form) return;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

/** Î≥∏Ïù∏?∏Ï¶ù: ?†ÌÅ∞ ?îÏ≤≠ ??reqCBAForm ?ùÏÑ± (Ï≤?Üå???êÍ∏∞Í≥ÑÎ∞ú ?∞ÏàòÏßÄ??bizInputÍ≥??ôÏùº) */
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

/** Î≥∏Ïù∏?∏Ï¶ù: ?¥Î¶≠ ÏßÅÌõÑ Îπ??ùÏóÖ??????createToken (?ùÏóÖ Ï∞®Îã® Î∞©Ï?) */
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
 * 1:1 ?êÏñ¥ÎØ??îÏÉÅ?ÅÏñ¥(04) ?ÑÏö© ?†Ï≤≠ ??
 * Î≥¥Ìò∏??Î≥∏Ïù∏?∏Ï¶ù(?∏Ï¶ù?òÍ∏∞) ??Ï≤?Üå???êÍ∏∞Í≥ÑÎ∞ú ?∞ÏàòÏßÄ??bizInput)Í≥??ôÏùº.
 * API: BY_STUDENT Î°úÎìú, POST /api/user/artappm/ (?ôÍµêÍµ¨Î∂Ñ¬∑?ôÍµê?åÏû¨ÏßÄ ÎØ∏Ï†Ñ??.
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

  /** ?Ä?•Îêú ?ôÍµêÎ™ÖÏúºÎ°?NEIS ?ôÍµê Ï°∞Ìöå ???ôÎÖÑ/Î∞??µÏÖò ?§Ï†ï (BY_STUDENT Î°úÎìú ?? */
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
            label: `${g}?ôÎÖÑ`,
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

  /** Î≥¥Ìò∏?? ?ôÎ?Î™?PNR)=Î°úÍ∑∏?∏Ïûê, ?ôÏÉù(SNR)=ÎßàÏù¥?òÏù¥ÏßÄ ?êÎ??∞Îèô Î≥¥Ìò∏??PARENTS[0]) */
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
                "?êÎ? ?∞Îèô???ÑÏöî?©Îãà??,
                "?ôÎ?Î™®Îãò??ÎßàÏù¥?òÏù¥ÏßÄ?êÏÑú ?êÎ? ?∞Îèô???ÑÎ£å?????§Ïãú ?†Ï≤≠??Ï£ºÏÑ∏??",
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

  /** ?êÎ? Î™©Î°ù Î°úÎìú (?ôÎ?Î™®Îßå) */
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

  /** MY PAGE ÏßÑÏûÖ ???¥Îãπ ?êÎ?Î°?Ï¥àÍ∏∞ ?†ÌÉù */
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

  /** ?ôÏÉù ?†ÌÉù ?? fromMypage+proIdÎ©?BY_STUDENT Î°úÎìú, ?ÑÎãàÎ©??êÎ? ?ÅÏÑ∏Îß?Î°úÎìú */
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

  /** ?ôÍµêÍ≤Ä??Î™®Îã¨?êÏÑú ?ôÍµê ?†ÌÉù ?? ?ôÍµêÎ™?Î∞òÏòÅ ???¥Îãπ ?ôÍµê ?ôÎÖÑ/Î∞??µÏÖò Ï°∞Ìöå (BizInputPrSection¬∑Í≥µÍ≥µ??ÏßÑÎ°úÏßÑÌïôÍ≥??ôÏùº) */
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
            label: `${g}?ôÎÖÑ`,
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

  /** ?ôÎÖÑ Î≥ÄÍ≤????¥Îãπ ?ôÎÖÑ Î∞?Î™©Î°ù?ºÎ°ú classOptions Í∞±Ïã† (BizInputPrSectionÍ≥??ôÏùº) */
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

  /** Í∏∞Ï°¥ Ï≤®Î??åÏùº 1Í±???†ú (reqId Í∏∞Ï?) */
  const removeExistingFile = (fileId: string, seq: number) => {
    if (!canSaveOrApply) {
      showAlertModal(
        "?åÎ¶º",
        "?¥Î? ?†Ï≤≠ ?ÑÎ£å??ÏßÄ?êÏÇ¨?ÖÏ? ?òÏ†ï?????ÜÏäµ?àÎã§.",
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
            "?åÎ¶º",
            res?.message ?? "?åÏùº ??†ú???§Ìå®?àÏäµ?àÎã§.",
            "danger",
          );
        }
      })
      .catch(() => {
        showAlertModal("?åÎ¶º", "?åÏùº ??†ú Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.", "danger");
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
            "?åÎ¶º",
            (res as { message?: string })?.message ??
              (isUpdate
                ? "?òÏ†ï?Ä MY PAGE?êÏÑúÎß?Í∞Ä?•Ìï©?àÎã§."
                : "?ôÏùº??ÏßÄ?êÏÇ¨???†Ï≤≠ Í±¥Ïù¥ ?¥Î? Ï°¥Ïû¨?©Îãà??"),
            "danger",
          );
          return;
        }
        if (result === "00") {
          if (sttusCode === "99") {
            showAlertModal("Ï∑®ÏÜå ?ÑÎ£å", "?†Ï≤≠??Ï∑®ÏÜå?òÏóà?µÎãà??", "success");
          } else if (sttusCode === "02") {
            showAlertModal("?†Ï≤≠ ?ÑÎ£å", "?†Ï≤≠???ÑÎ£å?òÏóà?µÎãà??", "success");
          } else {
            showAlertModal("?ÑÏãú?Ä??, "?ÑÏãú?Ä?•Îêò?àÏäµ?àÎã§.", "success");
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
            "?åÎ¶º",
            (res as { message?: string })?.message ?? "?Ä?•Ïóê ?§Ìå®?àÏäµ?àÎã§.",
            "danger",
          );
        }
      })
      .catch(() => {
        showAlertModal("?åÎ¶º", "?Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.", "danger");
      });
  };

  const handleSubmitArtappm = (sttusCode: "01" | "02" | "99") => {
    if (!proId) {
      showAlertModal(
        "?åÎ¶º",
        "ÏßÄ?êÏÇ¨?ÖÏùÑ ?†ÌÉù?òÍ≥† ?ôÏÉù???†ÌÉù?¥Ï£º?∏Ïöî.",
        "danger",
      );
      return;
    }
    if (!selectedStudentId) {
      showAlertModal("?åÎ¶º", "?ôÏÉù???†ÌÉù?????Ä?•Ìï¥ Ï£ºÏÑ∏??", "danger");
      focusAfterAlertRef.current = "studentSelect";
      return;
    }
    if (AuthService.getUserSe() === "SNR" && !linkedParentEsntlId.trim()) {
      showAlertModal(
        "?êÎ? ?∞Îèô???ÑÏöî?©Îãà??,
        "?ôÎ?Î™®Îãò??ÎßàÏù¥?òÏù¥ÏßÄ?êÏÑú ?êÎ? ?∞Îèô???ÑÎ£å?????§Ïãú ?†Ï≤≠??Ï£ºÏÑ∏??",
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
              "?åÎ¶º",
              "?òÏ†ï?Ä MY PAGE?êÏÑúÎß?Í∞Ä?•Ìï©?àÎã§.\n?¥Î? ?†Ï≤≠ ?ÑÎ£å??ÏßÄ?êÏÇ¨?ÖÏ? ?òÏ†ï?????ÜÏäµ?àÎã§.",
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
        "?åÎ¶º",
        "?¥Î? ?†Ï≤≠ ?ÑÎ£å??ÏßÄ?êÏÇ¨?ÖÏ? ?òÏ†ï?????ÜÏäµ?àÎã§.",
        "danger",
      );
      return;
    }
    runInsert(sttusCode);
  };

  const handleTempSave = () => {
    if (!schoolNm?.trim()) {
      showAlertModal("?àÎÇ¥", "?ôÍµêÎ•?Í≤Ä?âÌïò???†ÌÉù??Ï£ºÏÑ∏??", "danger");
      return;
    }
    if (!schoolLvl) {
      showAlertModal("?àÎÇ¥", "?ôÎÖÑ???†ÌÉù??Ï£ºÏÑ∏??", "danger", "schoolLvl");
      return;
    }
    if (!schoolNo && classOptions.length > 0) {
      showAlertModal("?àÎÇ¥", "Î∞òÏùÑ ?†ÌÉù??Ï£ºÏÑ∏??", "danger", "schoolNo");
      return;
    }
    handleSubmitArtappm("01");
  };

  /** Î≥∏Ïù∏?∏Ï¶ù ?†ÌÅ∞ Ï§ÄÎπ?(Ï≤?Üå???êÍ∏∞Í≥ÑÎ∞ú ?∞ÏàòÏßÄ?êÍ≥º ?ôÏùº, ÎßàÏö¥????1?? */
  useEffect(() => {
    fetchCertToken();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianCertified) {
      showAlertModal("?àÎÇ¥", "Î≥¥Ìò∏???∏Ï¶ù???ÑÎ£å??Ï£ºÏÑ∏??", "danger");
      return;
    }
    if (!schoolNm?.trim()) {
      showAlertModal("?àÎÇ¥", "?ôÍµêÎ•?Í≤Ä?âÌïò???†ÌÉù??Ï£ºÏÑ∏??", "danger");
      return;
    }
    if (!schoolLvl) {
      showAlertModal("?àÎÇ¥", "?ôÎÖÑ???†ÌÉù??Ï£ºÏÑ∏??", "danger", "schoolLvl");
      return;
    }
    if (!schoolNo && classOptions.length > 0) {
      showAlertModal("?àÎÇ¥", "Î∞òÏùÑ ?†ÌÉù??Ï£ºÏÑ∏??", "danger", "schoolNo");
      return;
    }
    if (!schoolGb) {
      showAlertModal("?àÎÇ¥", "?ôÍµêÍµ¨Î∂Ñ???†ÌÉù??Ï£ºÏÑ∏??", "danger", "schoolGb");
      return;
    }
    if (!schoolAddr?.trim()) {
      showAlertModal(
        "?àÎÇ¥",
        "?ôÍµê?åÏû¨ÏßÄÎ•??ÖÎ†•??Ï£ºÏÑ∏??",
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
                      ?ôÎ?Î™®Ï†ïÎ≥?
                    </div>
                    <span
                      className={`subTextBlue ${!guardianCertified ? "certRequired" : ""}`.trim()}
                      role="status"
                      aria-live="polite"
                    >
                      {guardianCertified
                        ? "?∏Ï¶ù???ÑÎ£å?òÏóà?µÎãà??"
                        : "Î≥¥Ìò∏?êÎ? ?∏Ï¶ù?òÏÑ∏??}
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
                            "?åÎ¶º",
                            "Î°úÍ∑∏?∏Ìïú Î≥¥Ìò∏?êÏ? ?∏Ï¶ù??Î≥∏Ïù∏???ºÏπò?òÏ? ?äÏäµ?àÎã§. Î°úÍ∑∏?∏Ìïú Í≥ÑÏ†ï??Î≥¥Ìò∏?êÎßå ?∏Ï¶ù?????àÏäµ?àÎã§.",
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
                                  "?åÎ¶º",
                                  "?∞Îèô??Î≥¥Ìò∏???ïÎ≥¥Î•?Ï∞æÏùÑ ???ÜÏäµ?àÎã§. ÎßàÏù¥?òÏù¥ÏßÄ?êÏÑú ?êÎ? ?∞Îèô???ïÏù∏?????§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??",
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
                                  "?åÎ¶º",
                                  "Î≥∏Ïù∏?∏Ï¶ù???ÑÎ£å?òÏóà?µÎãà??",
                                  "success",
                                );
                              } else {
                                mismatchAlert();
                              }
                            })
                            .catch(() => {
                              showAlertModal(
                                "?åÎ¶º",
                                "Î≥∏Ïù∏?∏Ï¶ù ?ïÏù∏ Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??",
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
                                "?åÎ¶º",
                                "Î≥∏Ïù∏?∏Ï¶ù???ÑÎ£å?òÏóà?µÎãà??",
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
                    aria-label="Î≥¥Ìò∏??Î≥∏Ïù∏?∏Ï¶ù ?òÍ∏∞"
                  >
                    ?∏Ï¶ù?òÍ∏∞
                  </button>
                </div>
                <div className="formGrid bizInput">
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="guardianName" className="formLabel">
                        Î≥¥Ìò∏?êÎ™Ö
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
                          aria-label="Î≥¥Ìò∏?êÎ™Ö"
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="guardianContact" className="formLabel">
                        ?∞ÎùΩÏ≤?
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
                          aria-label="?∞ÎùΩÏ≤?
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="guardianBirth" className="formLabel">
                        ?ùÎÖÑ?îÏùº
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
                          aria-label="?ùÎÖÑ?îÏùº"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="formSection">
                <div className="sectionHeader">
                  <div className="sectionTitle">?ôÏÉù?ïÎ≥¥</div>
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
                        ?ôÏÉùÎ™?
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
                            aria-label="?ôÏÉùÎ™??†ÌÉù"
                          >
                            <option value="">?ôÏÉù???†ÌÉù?òÏÑ∏??/option>
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
                            aria-label="?ôÏÉùÎ™?
                          />
                        )}
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <span className="formLabel">?±Î≥Ñ</span>
                      <div className="formControl">
                        <div
                          className="customGroup"
                          role="radiogroup"
                          id="studentGender"
                          aria-required="true"
                          aria-label="?±Î≥Ñ"
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
                              <span className="customText">??/span>
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
                              <span className="customText">??/span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="studentContact" className="formLabel">
                        ?∞ÎùΩÏ≤?
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
                          aria-label="?ôÏÉù ?∞ÎùΩÏ≤?
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="studentBirth" className="formLabel">
                        ?ùÎÖÑ?îÏùº
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
                          aria-label="?ùÎÖÑ?îÏùº"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <div className="fieldUnit">
                      <label htmlFor="studentAddr" className="formLabel">
                        Ï£ºÏÜå
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
                          aria-label="Ï£ºÏÜå"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="lowIncome" className="formLabel">
                        ?Ä?åÎìùÏ∏?
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="lowIncome"
                          className="inputField bgGray"
                          value={lowIncome}
                          readOnly
                          aria-label="?Ä?åÎìùÏ∏?(?ΩÍ∏∞?ÑÏö©)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="formSection">
                <div className="sectionHeader">
                  <div className="sectionTitle">?ôÍµê?ïÎ≥¥</div>
                </div>
                <div className="formGrid bizInput">
                  <div className="formRow">
                    <span className="formLabel" id="lblSchoolNameVd">
                      ?ôÍµêÎ™?
                    </span>
                    <div className="formControl">
                      <input
                        type="text"
                        className="inputField bgGray"
                        readOnly
                        title="?ôÍµêÎ™?Î∞??ôÎÖÑ?ïÎ≥¥"
                        aria-label="?ôÍµêÎ™?Î∞??ôÎÖÑ?ïÎ≥¥"
                        value={[
                          schoolNm,
                          schoolLvl ? `${schoolLvl}?ôÎÖÑ` : "",
                          schoolNo ? `${schoolNo}Î∞? : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-readonly="true"
                      />
                    </div>
                  </div>
                  <div className="formRow">
                    <span className="formLabel">?ôÍµêÍµ¨Î∂Ñ</span>
                    <div className="formControl">
                      <div
                        className="customGroup"
                        role="radiogroup"
                        id="schoolGb"
                        aria-label="?ôÍµêÍµ¨Î∂Ñ (?ΩÍ∏∞?ÑÏö©)"
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
                            aria-label="?çÏñ¥Ï¥?
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">?çÏñ¥Ï¥?/span>
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
                            aria-label="?úÎÇ¥Í∂?
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">?úÎÇ¥Í∂?/span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <div className="fieldUnit">
                      <label htmlFor="schoolAddr" className="formLabel">
                        ?ôÍµê?åÏû¨ÏßÄ
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="schoolAddr"
                          className="inputField bgGray"
                          value={schoolAddr}
                          readOnly
                          aria-readonly="true"
                          aria-label="?ôÍµê?åÏû¨ÏßÄ (?ΩÍ∏∞?ÑÏö©)"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <span className="formLabel">
                      Ï≤®Î??åÏùº
                      {canSaveOrApply && (
                        <label
                          className="btnFileAdd"
                          htmlFor="bizVdFileInput"
                          aria-label="?åÏùº Ï∂îÍ?"
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
                        aria-label="Ï≤®Î??åÏùº ?†ÌÉù"
                      />
                      <div className="formControl fileListContainer">
                        {existingFiles.length === 0 &&
                        pendingFiles.length === 0 ? (
                          <span className="fileListEmpty">
                            Ï≤®Î????åÏùº???ÜÏäµ?àÎã§.
                          </span>
                        ) : (
                          <>
                            {existingFiles.map((f) => {
                              const viewUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(f.fileId)}&seq=${encodeURIComponent(f.seq)}`;
                              const label = f.orgfNm ?? `?åÏùº ${f.seq}`;
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
                                        void downloadWaterbAttachmentOrOpenView(
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
                                      aria-label={`${label} ?åÏùº ??†ú`}
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
                                      aria-label={`${label} ?åÏùº ?úÍ±∞`}
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
                    aria-label="?ÖÎ†• ?¥Ïö© Ï¥àÍ∏∞??
                  >
                    Ï¥àÍ∏∞??
                  </button>
                )}
                <button
                  type="button"
                  className="btnWhite"
                  onClick={handleTempSave}
                  aria-label="?ÑÏãú?Ä??
                  disabled={!canSaveOrApply}
                >
                  ?ÑÏãú?Ä??
                </button>
                <button
                  type="submit"
                  className="btnSubmit"
                  disabled={!canSaveOrApply}
                >
                  ?†Ï≤≠
                </button>
                {fromMypage && (
                  <button
                    type="button"
                    className="btnSubmit"
                    onClick={() => {
                      if (loadedSttusCode === "99") {
                        showAlertModal(
                          "?åÎ¶º",
                          "?¥Î? Ï∑®ÏÜå??Í±¥ÏûÖ?àÎã§.",
                          "danger",
                        );
                        return;
                      }
                      setShowCancelConfirm(true);
                    }}
                    aria-label="?†Ï≤≠ Ï∑®ÏÜå"
                  >
                    Ï∑®ÏÜå
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
        title="?ïÏù∏"
        message="Ï≤®Î??åÏùº????†ú?òÏãúÍ≤†Ïäµ?àÍπå?"
        cancelText="?´Í∏∞"
        confirmText="??†ú"
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
        title="?ïÏù∏"
        message="?†Ï≤≠??Ï∑®ÏÜå?òÏãúÍ≤†Ïäµ?àÍπå?"
        cancelText="?´Í∏∞"
        confirmText="Ï∑®ÏÜå"
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
