"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "@/shared/lib";
import { API_CONFIG, API_ENDPOINTS } from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import type { ArmuserDTO } from "@/entities/adminWeb/armuser/api";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AlertModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import {
  GSTUDY_MENTOR_HOPE_TIME_OPTIONS,
  gstudyMentorApplySubjectRadioOptions,
  parseGstudyMentorApplySubjectFromApi,
  parseGstudyMentorHopeTimeFromApi,
  serializeGstudyMentorApplySubjectForApi,
  serializeGstudyMentorHopeTimeForApi,
  type GstudyMentorApplySubject,
  type GstudyMentorHopeTimeCode,
} from "@/widgets/userWeb/gstudyMentorSubjectTime";

const ICON = "/images/userWeb/icon";

function digitsOnly(s: string): string {
  return String(s ?? "").replace(/\D/g, "");
}

/** 학년 문자열에서 첫 정수 (예: "2학년" → 2) */
function parseSchoolYearDigits(s: string): number {
  const m = String(s).match(/\d+/);
  if (!m) return 0;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : 0;
}

/** 확장자 → biz.css .file.* 아이콘 클래스 */
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

function GstudyRadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  labelledBy,
  wide = true,
  firstInputId,
  disabled = false,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  labelledBy?: string;
  wide?: boolean;
  firstInputId?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className="householdRadioWrap"
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      {options.map((opt, i) => (
        <label key={opt.value} className="customItem">
          <input
            type="radio"
            id={i === 0 && firstInputId ? firstInputId : undefined}
            name={name}
            className="customInput"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
          />
          <div className={`customBox${wide ? " widePill" : ""}`.trim()}>
            <span className="customIcon" aria-hidden="true" />
            <span className="customText">{opt.label}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

function GstudyMultiCheckboxGroup<T extends string>({
  name,
  selected,
  onToggle,
  options,
  labelledBy,
  wide = true,
  firstInputId,
  disabled = false,
}: {
  name: string;
  selected: readonly T[];
  onToggle: (value: T, checked: boolean) => void;
  options: { value: T; label: string }[];
  labelledBy?: string;
  wide?: boolean;
  firstInputId?: string;
  disabled?: boolean;
}) {
  const sel = new Set(selected);
  return (
    <div
      className="householdRadioWrap"
      role="group"
      aria-labelledby={labelledBy}
    >
      {options.map((opt, i) => (
        <label key={opt.value} className="customItem">
          <input
            type="checkbox"
            id={i === 0 && firstInputId ? firstInputId : undefined}
            name={name}
            className="customInput"
            value={opt.value}
            checked={sel.has(opt.value)}
            onChange={(e) => onToggle(opt.value, e.target.checked)}
            disabled={disabled}
          />
          <div className={`customBox${wide ? " widePill" : ""}`.trim()}>
            <span className="customIcon" aria-hidden="true" />
            <span className="customText">{opt.label}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

function formatBrthdyForDateInput(raw: string | undefined): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 8)
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return "";
}

function buildAddressDisplay(u: ArmuserDTO | undefined): string {
  if (!u) return "";
  const zip = String(u.zip ?? "").trim();
  const base = String(u.adres ?? "").trim();
  const det = String(u.detailAdres ?? "").trim();
  const head =
    zip && base ? `(${zip}) ${base}` : base || (zip ? `(${zip})` : "");
  return [head, det].filter(Boolean).join(" ");
}

type EnrollStatus = "" | "enrolled" | "leave";

type PendingMentorFile = { id: string; file: File };

type MentorMypageServerFile = {
  fileId: string;
  seq: number;
  orgfNm: string;
};

/**
 * 멘토 전용 — 공부의 명수 온라인 튜터링(proGb 08) 신청 UI
 * 멘토정보: ARMUSER 조회값 표시(읽기 전용) / 기타정보: 대학·재학상태·학과·학번·학년·고등학교
 * 신청정보: 희망과목·희망시간대(공고 PRO_TARGET 기준), 신청동기·자기소개, 자원봉사 멘토링 경력, 첨부
 * — POST `/api/user/artappm/mentor-applications/{proId}` 멀티파트(data JSON, mentorApplicationFiles)
 */
const BizInputGstudyMentorSection: React.FC<{
  proId?: string;
}> = ({ proId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useUserWebAuthOptional();
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mypageDetailLoading, setMypageDetailLoading] = useState(false);
  const [mypageViewOnly, setMypageViewOnly] = useState(false);
  const [serverFiles, setServerFiles] = useState<MentorMypageServerFile[]>([]);
  const mentorJoinTimeRawRef = useRef("");

  const [mentorName, setMentorName] = useState("");
  const [mentorBirth, setMentorBirth] = useState("");
  const [mentorPhone, setMentorPhone] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [mentorAddress, setMentorAddress] = useState("");

  const [univNm, setUnivNm] = useState("");
  const [enrollStatus, setEnrollStatus] = useState<EnrollStatus>("");
  const [deptNm, setDeptNm] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [highSchoolNm, setHighSchoolNm] = useState("");

  const [artpromProTarget, setArtpromProTarget] = useState("");
  const [artpromSchoolGb, setArtpromSchoolGb] = useState("");
  const [applySubject, setApplySubject] = useState<GstudyMentorApplySubject>("");
  const [hopeTimes, setHopeTimes] = useState<GstudyMentorHopeTimeCode[]>([]);

  const [applyMotivation, setApplyMotivation] = useState("");
  const [volunteerCareer, setVolunteerCareer] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingMentorFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("danger");
  const focusAfterAlertRef = useRef<string | null>(null);
  const afterMentorAlertRef = useRef<(() => void) | null>(null);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: AlertModalType,
      focusId?: string,
      after?: () => void,
    ) => {
      focusAfterAlertRef.current = focusId ?? null;
      afterMentorAlertRef.current = after ?? null;
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      setShowAlertModal(true);
    },
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || !AuthService.isAuthenticated()) {
      setLoading(false);
      setLoadError("로그인 후 이용해 주세요.");
      return;
    }
    if (AuthService.getUserSe() !== "MNR") {
      setLoading(false);
      setLoadError("멘토 회원만 신청할 수 있습니다.");
      return;
    }
    const esntlId = AuthService.getEsntlId();
    if (!esntlId) {
      setLoading(false);
      setLoadError("회원 정보를 확인할 수 없습니다.");
      return;
    }
    let cancelled = false;
    setLoadError(null);
    setLoading(true);
    UserArmuserService.getDetail(esntlId)
      .then((res) => {
        if (cancelled) return;
        const u = res?.detail;
        if (!u) {
          setLoadError("회원 정보를 불러오지 못했습니다.");
          return;
        }
        setMentorName(String(u.userNm ?? "").trim());
        setMentorBirth(formatBrthdyForDateInput(String(u.brthdy ?? "")));
        const phone = formatPhoneWithHyphen(
          String(u.mbtlnum ?? u.usrTelno ?? "").trim(),
        );
        setMentorPhone(phone);
        setMentorEmail(String(u.emailAdres ?? "").trim());
        setMentorAddress(buildAddressDisplay(u));
      })
      .catch(() => {
        if (!cancelled) setLoadError("회원 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const pageProId = proId?.trim() || "";

  const buildMentorFileViewUrl = (fileId: string, seq: number) => {
    const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
    return `${base}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(String(seq))}`;
  };

  useEffect(() => {
    if (!pageProId) {
      setArtpromProTarget("");
      setArtpromSchoolGb("");
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ detail?: { proTarget?: string; schoolGb?: string } }>(
        `${API_ENDPOINTS.USER_ARTPROM.DETAIL}/${encodeURIComponent(pageProId)}`,
      )
      .then((r) => {
        if (cancelled) return;
        const d = r?.detail;
        setArtpromProTarget(String(d?.proTarget ?? "").trim());
        setArtpromSchoolGb(String(d?.schoolGb ?? "").trim());
      })
      .catch(() => {
        if (!cancelled) {
          setArtpromProTarget("");
          setArtpromSchoolGb("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pageProId]);

  const fromMypage = searchParams.get("from") === "mypage";
  const myReqId = (searchParams.get("reqId") ?? "").trim();

  useEffect(() => {
    if (!fromMypage || !myReqId) {
      setMypageDetailLoading(false);
      setMypageViewOnly(false);
      setServerFiles([]);
      mentorJoinTimeRawRef.current = "";
      return;
    }
    if (!isAuthenticated || !AuthService.isAuthenticated()) {
      setMypageDetailLoading(false);
      return;
    }
    if (AuthService.getUserSe() !== "MNR") {
      setMypageDetailLoading(false);
      return;
    }

    let cancelled = false;
    setMypageDetailLoading(true);
    setMypageViewOnly(false);
    setServerFiles([]);
    mentorJoinTimeRawRef.current = "";

    apiClient
      .get<{
        detail?: Record<string, unknown> | null;
        fileList?: Array<Record<string, unknown>>;
      }>(API_ENDPOINTS.USER_ARTAPPM.MENTOR_APPLICATION_BY_REQ_ID(myReqId))
      .then((res) => {
        if (cancelled) return;
        const d = res?.detail;
        if (d == null) {
          setLoadError("신청 정보를 찾을 수 없습니다.");
          return;
        }
        const dProId = String(d.proId ?? "").trim();
        if (pageProId && dProId && dProId !== pageProId) {
          setLoadError("요청한 사업과 신청 내역이 일치하지 않습니다.");
          return;
        }

        setUnivNm(String(d.collegeNm ?? "").trim());
        const ly = String(d.leaveYn ?? "").trim().toUpperCase();
        setEnrollStatus(ly === "Y" ? "leave" : "enrolled");
        setDeptNm(String(d.majorNm ?? "").trim());
        setStudentNo(String(d.studentId ?? "").trim());
        const lvlRaw = d.schoolLvl;
        const lvlNum =
          typeof lvlRaw === "number"
            ? lvlRaw
            : parseInt(String(lvlRaw ?? "").trim(), 10);
        if (Number.isFinite(lvlNum) && lvlNum > 0) {
          setSchoolYear(`${lvlNum}학년`);
        } else {
          setSchoolYear("");
        }
        setHighSchoolNm(String(d.hschoolNm ?? "").trim());
        setApplyMotivation(String(d.reqReason ?? "").trim());
        setVolunteerCareer(String(d.career ?? "").trim());
        setApplySubject(
          parseGstudyMentorApplySubjectFromApi(String(d.reqSub ?? "")),
        );
        const jt = String(d.joinTime ?? "");
        mentorJoinTimeRawRef.current = jt;
        setHopeTimes(
          parseGstudyMentorHopeTimeFromApi(jt, artpromProTarget, artpromSchoolGb),
        );

        const fl = res?.fileList;
        if (Array.isArray(fl) && fl.length > 0) {
          setServerFiles(
            fl
              .map((x) => ({
                fileId: String(x.fileId ?? ""),
                seq: Number(x.seq ?? 0),
                orgfNm: String(x.orgfNm ?? "").trim(),
              }))
              .filter((f) => f.fileId !== ""),
          );
        } else {
          setServerFiles([]);
        }

        setPendingFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setMypageViewOnly(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setLoadError("본인 신청만 조회할 수 있습니다.");
        } else {
          setLoadError("신청 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setMypageDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromMypage, myReqId, isAuthenticated, pageProId]);

  useEffect(() => {
    if (!fromMypage || !myReqId || !mentorJoinTimeRawRef.current) return;
    setHopeTimes(
      parseGstudyMentorHopeTimeFromApi(
        mentorJoinTimeRawRef.current,
        artpromProTarget,
        artpromSchoolGb,
      ),
    );
  }, [fromMypage, myReqId, artpromProTarget, artpromSchoolGb]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: PendingMentorFile[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      next.push({ id: `${Date.now()}_${i}_${file.name}`, file });
    }
    setPendingFiles((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReset = () => {
    if (mypageViewOnly) return;
    setUnivNm("");
    setEnrollStatus("");
    setDeptNm("");
    setStudentNo("");
    setSchoolYear("");
    setHighSchoolNm("");
    setApplySubject("");
    setHopeTimes([]);
    setApplyMotivation("");
    setVolunteerCareer("");
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateExtraInfo = (): boolean => {
    if (!univNm.trim()) {
      showAlert("안내", "대학명을 입력해 주세요.", "danger", "mentorUnivNm");
      return false;
    }
    if (enrollStatus === "") {
      showAlert(
        "안내",
        "재학 여부(재학·휴학)를 선택해 주세요.",
        "danger",
        "mentorEnrollEnrolled",
      );
      return false;
    }
    if (!deptNm.trim()) {
      showAlert("안내", "학과를 입력해 주세요.", "danger", "mentorDeptNm");
      return false;
    }
    if (!studentNo.trim()) {
      showAlert("안내", "학번을 입력해 주세요.", "danger", "mentorStudentNo");
      return false;
    }
    if (!schoolYear.trim()) {
      showAlert("안내", "학년을 입력해 주세요.", "danger", "mentorSchoolYear");
      return false;
    }
    if (!highSchoolNm.trim()) {
      showAlert(
        "안내",
        "고등학교명을 입력해 주세요.",
        "danger",
        "mentorHighSchoolNm",
      );
      return false;
    }
    return true;
  };

  /** 서버 registerUserMentorApplication: proGb 08은 reqSub·joinTime 필수 */
  const validateSubjectAndHopeTime = (): boolean => {
    if (!applySubject) {
      showAlert(
        "안내",
        "희망 과목을 선택해 주세요.",
        "danger",
        "gstudyMentorApplySubjectKorean",
      );
      return false;
    }
    if (hopeTimes.length === 0) {
      showAlert(
        "안내",
        "희망 시간대를 한 가지 이상 선택해 주세요.",
        "danger",
        "gstudyMentorHopeTimeFirst",
      );
      return false;
    }
    const reqSub = serializeGstudyMentorApplySubjectForApi(
      applySubject,
      artpromProTarget,
      artpromSchoolGb,
    );
    const joinTime = serializeGstudyMentorHopeTimeForApi(
      hopeTimes,
      artpromProTarget,
      artpromSchoolGb,
    );
    if (!reqSub.trim()) {
      showAlert(
        "안내",
        "희망 과목 코드를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        "danger",
        "gstudyMentorApplySubjectKorean",
      );
      return false;
    }
    if (!joinTime.trim()) {
      showAlert(
        "안내",
        "희망 시간대 코드를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        "danger",
        "gstudyMentorHopeTimeFirst",
      );
      return false;
    }
    return true;
  };

  const validateApplyInfo = (): boolean => {
    if (!applyMotivation.trim()) {
      showAlert(
        "안내",
        "신청동기·자기소개를 입력해 주세요.",
        "danger",
        "mentorApplyMotivation",
      );
      return false;
    }
    if (!volunteerCareer.trim()) {
      showAlert(
        "안내",
        "자원봉사·멘토링 경력을 입력해 주세요.",
        "danger",
        "mentorVolunteerCareer",
      );
      return false;
    }
    return true;
  };

  const loginId = AuthService.getEsntlId() ?? "";

  const buildUserMentorApplicationData = (): Record<string, unknown> => {
    const reqSub = serializeGstudyMentorApplySubjectForApi(
      applySubject,
      artpromProTarget,
      artpromSchoolGb,
    );
    const joinTime = serializeGstudyMentorHopeTimeForApi(
      hopeTimes,
      artpromProTarget,
      artpromSchoolGb,
    );
    return {
      proGb: "08",
      proSeq: 0,
      collegeNm: univNm.trim(),
      leaveYn: enrollStatus === "leave" ? "Y" : "N",
      majorNm: deptNm.trim(),
      schoolLvl: parseSchoolYearDigits(schoolYear),
      studentId: studentNo.trim(),
      hschoolNm: highSchoolNm.trim(),
      reqReason: applyMotivation.trim(),
      career: volunteerCareer.trim(),
      sttusCode: "A",
      reqSub,
      joinTime,
      fileId: "",
    };
  };

  const submitMentorInsert = () => {
    if (!pageProId) {
      showAlert("알림", "지원사업을 선택한 뒤 이용해 주세요.", "danger");
      return;
    }
    if (!loginId) {
      showAlert("알림", "로그인 정보를 확인할 수 없습니다.", "danger");
      return;
    }
    const data = buildUserMentorApplicationData();
    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    pendingFiles.forEach(({ file }) => {
      formData.append("mentorApplicationFiles", file);
    });
    apiClient
      .post<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTAPPM.MENTOR_APPLICATION_REGISTER(pageProId),
        formData,
      )
      .then((res) => {
        const result = res?.result ?? "";
        if (result === "40") {
          showAlert(
            "알림",
            res?.message ?? "로그인이 필요합니다.",
            "danger",
          );
          return;
        }
        if (result === "50") {
          showAlert(
            "알림",
            res?.message ?? "동일한 지원사업 신청 건이 이미 존재합니다.",
            "danger",
          );
          return;
        }
        if (result === "02") {
          showAlert(
            "알림",
            res?.message ?? "자격 조건을 충족하지 않습니다.",
            "danger",
          );
          return;
        }
        if (result === "00") {
          const reqGbPosition = searchParams.get("reqGbPosition");
          const typeParam = searchParams.get("type");
          const q = new URLSearchParams();
          if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
          if (typeParam === "mentor") q.set("type", "mentor");
          const mainUrl =
            "/userWeb/main" + (q.toString() ? "?" + q.toString() : "");
          // showAlert가 ref를 after ?? null로 덮어쓰므로, 이동은 5번째 인자로만 전달
          showAlert(
            "신청 완료",
            "신청이 완료되었습니다.",
            "success",
            undefined,
            () => {
              router.replace(mainUrl);
            },
          );
          setPendingFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        showAlert(
          "알림",
          res?.message ?? "처리 중 오류가 발생했습니다.",
          "danger",
        );
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          showAlert(
            "알림",
            "로그인이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.",
            "danger",
          );
          return;
        }
        showAlert("알림", "저장 중 오류가 발생했습니다.", "danger");
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mypageViewOnly) return;
    if (!pageProId) {
      showAlert("안내", "사업 정보(proId)가 없습니다.", "danger");
      return;
    }
    if (!validateExtraInfo()) return;
    if (!validateSubjectAndHopeTime()) return;
    if (!validateApplyInfo()) return;
    submitMentorInsert();
  };

  const qProGb = searchParams.get("proGb");

  return (
    <section className="inner">
      <div className="mainBg">
        <div className="registrationContainer bizInput">
          {pageProId ? (
            <p className="sr-only">지원사업 코드 {pageProId}</p>
          ) : null}
          {qProGb === "08" ? (
            <p className="sr-only">공부의 명수 온라인 튜터링</p>
          ) : null}
          {loadError ? (
            <p className="error" role="alert">
              {loadError}
            </p>
          ) : null}
          {loading || mypageDetailLoading ? (
            <p className="loading" role="status">
              정보를 불러오는 중입니다.
            </p>
          ) : null}
          {!loadError && !loading && !mypageDetailLoading ? (
            <form className="mainForm" onSubmit={handleSubmit} noValidate>
              <section
                className="formSection"
                aria-labelledby="mentorInfoGstudyTitle"
              >
                <div className="sectionHeader">
                  <div className="sectionTitle" id="mentorInfoGstudyTitle">
                    멘토정보
                  </div>
                </div>
                <div className="formGrid">
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="mentorDispName" className="formLabel">
                        이름
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="mentorDispName"
                          className="inputField bgGray"
                          readOnly
                          value={mentorName}
                          aria-label="이름"
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="mentorDispBirth" className="formLabel">
                        생년월일
                      </label>
                      <div className="formControl">
                        <input
                          type="date"
                          id="mentorDispBirth"
                          className="inputField bgGray"
                          readOnly
                          value={mentorBirth}
                          aria-label="생년월일"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="mentorDispPhone" className="formLabel">
                        연락처
                      </label>
                      <div className="formControl">
                        <input
                          type="tel"
                          id="mentorDispPhone"
                          className="inputField bgGray"
                          readOnly
                          value={mentorPhone}
                          aria-label="연락처"
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="mentorDispEmail" className="formLabel">
                        이메일
                      </label>
                      <div className="formControl">
                        <input
                          type="email"
                          id="mentorDispEmail"
                          className="inputField bgGray"
                          readOnly
                          value={mentorEmail}
                          aria-label="이메일"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <span className="formLabel">주소</span>
                    <div className="formControl addressContainer">
                      <input
                        type="text"
                        className="inputField bgGray"
                        readOnly
                        title="주소"
                        aria-label="주소"
                        value={mentorAddress}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="formSection"
                aria-labelledby="mentorExtraGstudyTitle"
              >
                <div className="sectionHeader">
                  <div className="sectionTitle" id="mentorExtraGstudyTitle">
                    기타정보
                  </div>
                </div>
                <div className="formGrid">
                  <div className="formRow">
                    <label htmlFor="mentorUnivNm" className="formLabel">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      대학명
                    </label>
                    <div className="formControl">
                      <input
                        type="text"
                        id="mentorUnivNm"
                        className="inputField"
                        value={univNm}
                        onChange={(e) => setUnivNm(e.target.value)}
                        placeholder="대학명을 입력해 주세요"
                        aria-required="true"
                        autoComplete="organization"
                        readOnly={mypageViewOnly}
                      />
                    </div>
                  </div>
                  <div className="formRow">
                    <span className="formLabel" id="mentorLblEnroll">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      재학 여부
                    </span>
                    <div className="formControl">
                      <div
                        className="customGroup"
                        role="radiogroup"
                        aria-labelledby="mentorLblEnroll"
                      >
                        <label className="customItem">
                          <input
                            type="radio"
                            name="mentorEnrollStatus"
                            id="mentorEnrollEnrolled"
                            className="customInput"
                            checked={enrollStatus === "enrolled"}
                            onChange={() => setEnrollStatus("enrolled")}
                            aria-required="true"
                            disabled={mypageViewOnly}
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">재학</span>
                          </div>
                        </label>
                        <label className="customItem">
                          <input
                            type="radio"
                            name="mentorEnrollStatus"
                            id="mentorEnrollLeave"
                            className="customInput"
                            checked={enrollStatus === "leave"}
                            onChange={() => setEnrollStatus("leave")}
                            aria-required="true"
                            disabled={mypageViewOnly}
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">휴학</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="mentorDeptNm" className="formLabel">
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                        학과
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="mentorDeptNm"
                          className="inputField"
                          value={deptNm}
                          onChange={(e) => setDeptNm(e.target.value)}
                          placeholder="학과를 입력해 주세요"
                          aria-required="true"
                          readOnly={mypageViewOnly}
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="mentorStudentNo" className="formLabel">
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                        학번
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="mentorStudentNo"
                          className="inputField"
                          inputMode="numeric"
                          value={studentNo}
                          onChange={(e) => setStudentNo(e.target.value)}
                          placeholder="학번을 입력해 주세요"
                          aria-required="true"
                          readOnly={mypageViewOnly}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="mentorSchoolYear" className="formLabel">
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                        학년
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="mentorSchoolYear"
                          className="inputField"
                          value={schoolYear}
                          onChange={(e) => setSchoolYear(e.target.value)}
                          placeholder="예) 2학년"
                          aria-required="true"
                          readOnly={mypageViewOnly}
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="mentorHighSchoolNm" className="formLabel">
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                        고등학교
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="mentorHighSchoolNm"
                          className="inputField"
                          value={highSchoolNm}
                          onChange={(e) => setHighSchoolNm(e.target.value)}
                          placeholder="출신 고등학교명"
                          aria-required="true"
                          readOnly={mypageViewOnly}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="formSection"
                aria-labelledby="mentorApplyGstudyTitle"
              >
                <div className="sectionHeader">
                  <div className="sectionTitle" id="mentorApplyGstudyTitle">
                    신청정보
                  </div>
                </div>
                <div className="formGrid">
                  <div className="formRow gstudyApplyRow">
                    <span className="formLabel" id="mentorGstudyLblApplySubject">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      희망 과목
                    </span>
                    <div className="formControl">
                      <GstudyRadioGroup<GstudyMentorApplySubject>
                        name="mentorGstudyApplySubject"
                        value={applySubject}
                        onChange={setApplySubject}
                        options={gstudyMentorApplySubjectRadioOptions(
                          artpromProTarget,
                          artpromSchoolGb,
                        )}
                        labelledBy="mentorGstudyLblApplySubject"
                        wide={false}
                        firstInputId="gstudyMentorApplySubjectKorean"
                        disabled={mypageViewOnly}
                      />
                    </div>
                  </div>
                  <div className="formRow gstudyApplyRow">
                    <span className="formLabel" id="mentorGstudyLblHopeTime">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      희망 시간대
                    </span>
                    <div className="formControl">
                      <div className="fieldSelectGroup">
                        <GstudyMultiCheckboxGroup<GstudyMentorHopeTimeCode>
                          name="mentorGstudyHopeTime"
                          selected={hopeTimes}
                          onToggle={(code, checked) => {
                            setHopeTimes((prev) => {
                              if (checked)
                                return prev.includes(code) ? prev : [...prev, code];
                              return prev.filter((c) => c !== code);
                            });
                          }}
                          options={GSTUDY_MENTOR_HOPE_TIME_OPTIONS}
                          labelledBy="mentorGstudyLblHopeTime"
                          firstInputId="gstudyMentorHopeTimeFirst"
                          disabled={mypageViewOnly}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <label
                      htmlFor="mentorApplyMotivation"
                      className="formLabel formLabelStack"
                    >
                      <span className="formLabelStackTop">
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                        <span className="formLabelLine">신청동기/</span>
                      </span>
                      <span className="formLabelLine">자기소개</span>
                    </label>
                    <div className="formControl">
                      <textarea
                        id="mentorApplyMotivation"
                        className="textAreaField mentorApplyLarge"
                        value={applyMotivation}
                        onChange={(e) => setApplyMotivation(e.target.value)}
                        placeholder="신청 동기와 자기소개를 입력해 주세요"
                        aria-label="신청동기 및 자기소개"
                        aria-required="true"
                        rows={8}
                        readOnly={mypageViewOnly}
                      />
                    </div>
                  </div>
                  <div className="formRow">
                    <label
                      htmlFor="mentorVolunteerCareer"
                      className="formLabel formLabelStack"
                    >
                      <span className="formLabelStackTop">
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                        <span className="formLabelLine">자원봉사</span>
                      </span>
                      <span className="formLabelLine">멘토링 경력</span>
                    </label>
                    <div className="formControl">
                      <textarea
                        id="mentorVolunteerCareer"
                        className="textAreaField mentorApplyLarge"
                        value={volunteerCareer}
                        onChange={(e) => setVolunteerCareer(e.target.value)}
                        placeholder="자원봉사 및 멘토링 관련 경력을 입력해 주세요"
                        aria-label="자원봉사 멘토링 경력"
                        aria-required="true"
                        rows={8}
                        readOnly={mypageViewOnly}
                      />
                    </div>
                  </div>
                  <div className="formRow gstudyAttachRow">
                    <span className="formLabel">
                      첨부파일
                      {!mypageViewOnly ? (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            id="mentorGstudyFileInput"
                            className="hiddenInput"
                            multiple
                            onChange={handleFileSelect}
                          />
                          <label
                            htmlFor="mentorGstudyFileInput"
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
                      ) : null}
                    </span>
                    <div className="formControl fileListContainer">
                      {serverFiles.length === 0 && pendingFiles.length === 0 ? (
                        <span className="fileListEmpty">
                          첨부된 파일이 없습니다.
                        </span>
                      ) : (
                        <>
                          {serverFiles.map((sf) => {
                            const label = sf.orgfNm || "첨부파일";
                            const typeClass = getFileTypeClass(label);
                            const viewUrl = buildMentorFileViewUrl(
                              sf.fileId,
                              sf.seq,
                            );
                            return (
                              <div
                                key={`s_${sf.fileId}_${sf.seq}`}
                                className={`file ${typeClass}`.trim()}
                              >
                                <a
                                  href={viewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {label}
                                </a>
                              </div>
                            );
                          })}
                          {!mypageViewOnly
                            ? pendingFiles.map((p) => {
                                const label = p.file.name;
                                const typeClass = getFileTypeClass(label);
                                return (
                                  <div
                                    key={p.id}
                                    className={`file ${typeClass}`.trim()}
                                  >
                                    <span>{label}</span>
                                    <button
                                      type="button"
                                      className="btnFileDel"
                                      aria-label={`${label} 삭제`}
                                      onClick={() => removePendingFile(p.id)}
                                    >
                                      <img
                                        src={`${ICON}/ico_file_del.png`}
                                        alt=""
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </div>
                                );
                              })
                            : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {!mypageViewOnly ? (
                <div className="formActions">
                  <button
                    type="button"
                    className="btnWhite"
                    onClick={handleReset}
                    aria-label="신청 입력 내용 초기화"
                  >
                    초기화
                  </button>
                  <button type="submit" className="btnSubmit" aria-label="신청">
                    신청
                  </button>
                </div>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={() => {
          setShowAlertModal(false);
          const id = focusAfterAlertRef.current;
          focusAfterAlertRef.current = null;
          const after = afterMentorAlertRef.current;
          afterMentorAlertRef.current = null;
          if (after) {
            requestAnimationFrame(() => after());
          } else if (id) {
            requestAnimationFrame(() => document.getElementById(id)?.focus());
          }
        }}
      />
    </section>
  );
};

export default BizInputGstudyMentorSection;
