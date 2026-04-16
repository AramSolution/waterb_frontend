"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { openDaumPostcode } from "@/shared/lib/daumPostcode";
import { NeisService } from "@/entities/adminWeb/neis/api";
import type { SchoolItem } from "@/entities/adminWeb/neis/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { UserMemberService } from "@/entities/userWeb/member/api/memberApi";
import { UserGpkiService } from "@/entities/userWeb/gpki/api";
import type {
  ArmuserInsertRequest,
  ArmuserUpdateRequest,
  ArmuserDetailResponse,
} from "@/entities/adminWeb/armuser/api";
import { API_ENDPOINTS, API_CONFIG } from "@/shared/config/apiUser";
import { ApiError } from "@/shared/lib/apiClient";
import { apiClient } from "@/shared/lib";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import { AuthService } from "@/entities/auth/api";

type SelectOption = { value: string; label: string };

const IMG = "/images/userWeb";
const SCHOOL_PAGE_SIZE = 15;

const today = new Date().toISOString().slice(0, 10);

const MEMBER_STATUS_OPTIONS = [
  { value: "A", label: "신청" },
  { value: "P", label: "승인" },
  { value: "D", label: "탈퇴" },
];

const DEFAULT_SELECT_OPTION: SelectOption = { value: "", label: "선택" };

/** NEIS 학교종류명(schulKndScNm) → SCHOOL_GB 코드: 초등 E, 중학교 J, 고등학교 H, 대학교 U, 기타 T */
function mapSchoolGb(schulKndScNm: string): string {
  const name = (schulKndScNm || "").trim();
  if (name.includes("초등")) return "E";
  if (name.includes("중학교") || name === "중학교") return "J";
  if (name.includes("고등") || name.includes("고등학교")) return "H";
  if (name.includes("대학교") || name.includes("대학")) return "U";
  return "T";
}

function formatIhidnumForDisplay(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

function formatIhidnumMasked(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 6)}-${digits[6]}******`;
}

function getIhidnumDisplayValue(raw: string, focused: boolean): string {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 13);
  if (focused) return formatIhidnumForDisplay(digits);
  if ((raw || "").includes("*")) return raw;
  return formatIhidnumMasked(raw);
}

function formatMypageCertDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function isUnder14ByBirthdate(brdtValue: string): boolean | null {
  const digits = (brdtValue || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const birth = new Date(year, month - 1, day);
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return null;
  }
  const todayDate = new Date();
  const cutOff = new Date(
    todayDate.getFullYear() - 14,
    todayDate.getMonth(),
    todayDate.getDate(),
  );
  return birth > cutOff;
}

/** MY PAGE: 예·아니오 대신 학교검색과 동일(btnSearch) 단일 인증 버튼 + 프론트 전용 인증일 표시 */
function MypageYnCertButton(props: {
  pressed: boolean;
  certifiedAt: string | null;
  onClick: () => void;
  name: string;
  disabled?: boolean;
  /** true면 인증완료 후에도 인증 버튼 유지(나의정보 MY PAGE) */
  alwaysShowButton?: boolean;
}) {
  const {
    pressed,
    certifiedAt,
    onClick,
    name,
    disabled = false,
    alwaysShowButton,
  } = props;
  const hasCertRecord = Boolean(certifiedAt);
  const certDateLabel = certifiedAt
    ? formatMypageCertDateLabel(certifiedAt)
    : "";
  /** 기본: 인증완료(해당·인증일 있음)일 때 버튼 숨김. alwaysShowButton 시 항상 노출 */
  const isResultLocked =
    !alwaysShowButton && pressed && hasCertRecord;
  const ariaDate =
    pressed && certifiedAt
      ? `인증완료 ${formatMypageCertDateLabel(certifiedAt)}`
      : !pressed && certifiedAt
        ? `해당없음 ${formatMypageCertDateLabel(certifiedAt)}`
        : pressed
          ? "인증완료 정보 없음"
          : "미인증";
  return (
    <div
      className="formControl mypageYnCertControl"
      role="group"
      aria-label={name}
    >
      {!isResultLocked ? (
        <button
          type="button"
          className="btnSearch mypageYnCertBtn"
          aria-pressed={pressed}
          aria-busy={disabled}
          disabled={disabled}
          aria-label={
            alwaysShowButton
              ? pressed && hasCertRecord
                ? `${name} 인증완료. 클릭하면 조회를 다시 실행합니다. ${ariaDate}`
                : hasCertRecord
                  ? `${name} 해당없음. 클릭하면 조회를 다시 실행합니다. ${ariaDate}`
                  : `${name} 미인증. 클릭하면 행정 조회로 인증합니다.`
              : pressed
                ? `${name} 인증됨. 클릭하면 미해당으로 변경합니다. ${ariaDate}`
                : hasCertRecord
                  ? `${name} 해당없음. 클릭하면 해당으로 표시합니다. ${ariaDate}`
                  : `${name} 미인증. 클릭하면 해당으로 표시합니다.`
          }
          onClick={onClick}
        >
          {disabled ? "확인 중…" : "인증"}
        </button>
      ) : null}
      <span className="mypageYnCertDate" aria-live="polite">
        {pressed && hasCertRecord ? (
          <span className="mypageYnCertDatePrefix">
            {certDateLabel ? `인증완료 ${certDateLabel}` : "인증완료"}
          </span>
        ) : !pressed && hasCertRecord ? (
          <span className="mypageYnCertDatePrefix">해당없음</span>
        ) : pressed ? (
          <span className="mypageYnCertDatePlaceholder">인증완료</span>
        ) : (
          <span className="mypageYnCertDateMuted" />
        )}
      </span>
    </div>
  );
}

/**
 * 학생 회원가입 폼 (학생정보 입력)
 * join_ac.css + bizInput 패턴(select, radio customBox) 사용
 * mode="mypage": MY PAGE 나의정보에서 사용 시 상단 제목·section 래퍼 없이 폼만 렌더
 * initialData: MY PAGE에서 GET 상세 조회 후 전달 시 폼 초기값으로 사용
 */
const JoinStudentSection: React.FC<{
  mode?: "join" | "mypage";
  initialData?: ArmuserDetailResponse | null;
  onDetailUpdated?: () => void;
}> = ({ mode = "join", initialData, onDetailUpdated }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [userNm, setUserNm] = useState("");
  const [telno, setTelno] = useState("");
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [rrn, setRrn] = useState("");
  const [rrnFocused, setRrnFocused] = useState(false);
  const [email, setEmail] = useState("");
  const [genderCode, setGenderCode] = useState("M");
  const [brdt, setBrdt] = useState(today);
  const [memberSttus, setMemberSttus] = useState("A");
  const [schoolId, setSchoolId] = useState("");
  const [schoolNm, setSchoolNm] = useState("");
  const [schoolGb, setSchoolGb] = useState("");
  const [grade, setGrade] = useState("");
  const [classNm, setClassNm] = useState("");
  const [gradeOptions, setGradeOptions] = useState<SelectOption[]>([
    DEFAULT_SELECT_OPTION,
  ]);
  const [classOptions, setClassOptions] = useState<SelectOption[]>([
    DEFAULT_SELECT_OPTION,
  ]);
  const [classLoading, setClassLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [citizenCertYn, setCitizenCertYn] = useState("N");
  const [singleParentYn, setSingleParentYn] = useState("N");
  const [under14Yn, setUnder14Yn] = useState("N");
  const [basicLivelihoodYn, setBasicLivelihoodYn] = useState("N");
  const [nextTierYn, setNextTierYn] = useState("N");
  const [ruralSchoolYn, setRuralSchoolYn] = useState("N");
  /** MY PAGE 전용: 서버 미연동, 토글 시에만 채워지는 인증일(ISO) */
  const [citizenCertAt, setCitizenCertAt] = useState<string | null>(null);
  const [singleParentCertAt, setSingleParentCertAt] = useState<string | null>(
    null,
  );
  const [under14CertAt, setUnder14CertAt] = useState<string | null>(null);
  const [basicLivelihoodCertAt, setBasicLivelihoodCertAt] = useState<
    string | null
  >(null);
  const [nextTierCertAt, setNextTierCertAt] = useState<string | null>(null);
  const [ruralSchoolCertAt, setRuralSchoolCertAt] = useState<string | null>(
    null,
  );
  /** 회원가입: 약관 페이지 본인인증 후 전달된 데이터로 채운 경우 수정 불가 */
  const [certDataFromJoin, setCertDataFromJoin] = useState(false);
  /** 회원가입: 본인인증 완료 후 저장된 DI(개인식별코드) - 가입 API 전송용 */
  const [certDi, setCertDi] = useState("");
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  /** 부분 인증: 클릭한 버튼만 로딩(비활성) 처리 */
  const [gpkiYnCertLoadingKey, setGpkiYnCertLoadingKey] = useState<
    "citizen" | "single" | "basic" | "poor" | null
  >(null);
  /** 시민·감면 인증 버튼: 주민 13자리·회원명 없을 때 필드 빨간 강조 */
  const [gpkiPrereqErrorRrn, setGpkiPrereqErrorRrn] = useState(false);
  const [gpkiPrereqErrorUserNm, setGpkiPrereqErrorUserNm] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState("");
  const [isDuplicateUserId, setIsDuplicateUserId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  /** MY PAGE: 상세 조회로 받은 시민·감면 Y/N (인증 클릭 시 해당없음 복원용) */
  const serverGpkiYnSnapshotRef = useRef<{
    citizen: "Y" | "N" | null;
    single: "Y" | "N" | null;
    basic: "Y" | "N" | null;
    poor: "Y" | "N" | null;
  }>({ citizen: null, single: null, basic: null, poor: null });

  /** 회원가입: 약관 페이지 본인인증 후 sessionStorage에 저장된 데이터 적용 */
  useEffect(() => {
    if (mode !== "join" || typeof window === "undefined") return;
    let cancelled = false;
    try {
      const raw = sessionStorage.getItem("joinCertData");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        userName?: string;
        celNo?: string;
        birYMD?: string;
        gender?: string;
        di?: string;
      };
      sessionStorage.removeItem("joinCertData");
      const userName = (parsed.userName ?? "").trim();
      const celNo = (parsed.celNo ?? "").trim().replace(/\D/g, "");
      const birYMD = (parsed.birYMD ?? "").trim().replace(/\D/g, "");
      const gender = (parsed.gender ?? "").trim().toUpperCase();
      const di = (parsed.di ?? "").trim();
      if (userName) setUserNm(userName);
      if (celNo) setTelno(formatPhoneWithHyphen(celNo));
      if (birYMD.length >= 8) {
        setBrdt(
          `${birYMD.slice(0, 4)}-${birYMD.slice(4, 6)}-${birYMD.slice(6, 8)}`,
        );
      }
      if (gender === "M" || gender === "F") setGenderCode(gender);
      if (gender === "1") setGenderCode("M");
      if (gender === "2") setGenderCode("F");
      if (di) setCertDi(di);
      if (di) {
        (async () => {
          try {
            const res = await apiClient.get<{ exist?: number }>(
              "/api/user/armuser/crtfc-dn-value-check?crtfcDnValue=" +
                encodeURIComponent(di),
            );
            if (cancelled) return;
            if (res?.exist === 1) {
              afterAlertCloseRef.current = () => {
                if (window.history.length > 1) window.history.back();
                else window.location.href = "/";
              };
              showAlert(
                "알림",
                "이미 본인인증으로 가입된 회원입니다.",
                "danger",
              );
            }
          } catch {
            // 중복확인 실패는 UX 차단하지 않음
          }
        })();
      }
      if (userName || celNo || birYMD || gender) setCertDataFromJoin(true);
    } catch {
      // 파싱 오류 등 무시
    }
    return () => {
      cancelled = true;
    };
  }, [mode]);

  /** 회원가입 + 본인인증 완료: 생년월일 기준으로 14세미만여부 자동 산정 및 고정 */
  useEffect(() => {
    if (mode !== "join" || !certDataFromJoin) return;
    const isUnder14 = isUnder14ByBirthdate(brdt);
    if (isUnder14 == null) return;
    setUnder14Yn(isUnder14 ? "Y" : "N");
  }, [mode, certDataFromJoin, brdt]);

  // 학교검색 모달 (join_ac.html과 동일)
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [schoolSearchKeyword, setSchoolSearchKeyword] = useState("");
  const [schoolList, setSchoolList] = useState<SchoolItem[]>([]);
  const [schoolCurrentPage, setSchoolCurrentPage] = useState(1);
  const [schoolTotalPages, setSchoolTotalPages] = useState(0);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  const afterAlertCloseRef = useRef<(() => void) | null>(null);
  const focusAfterAlertRef = useRef<string | null>(null);
  const schoolSearchKeywordRef = useRef(schoolSearchKeyword);
  const [showConfirmDeletePic, setShowConfirmDeletePic] = useState(false);
  const [confirmUnlinkService, setConfirmUnlinkService] = useState<
    "naver" | "kakao" | null
  >(null);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: AlertModalType = "success",
      focusId?: string,
    ) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      focusAfterAlertRef.current = focusId ?? null;
      setShowAlertModal(true);
    },
    [],
  );

  const handleAlertConfirm = useCallback(() => {
    setShowAlertModal(false);
    afterAlertCloseRef.current?.();
    afterAlertCloseRef.current = null;
    const focusId = focusAfterAlertRef.current;
    focusAfterAlertRef.current = null;
    if (focusId) {
      requestAnimationFrame(() => {
        document.getElementById(focusId)?.focus();
      });
    }
  }, []);

  /** MY PAGE: 백엔드 OAuth 리다이렉트 후 연결 결과 쿼리 처리 */
  useEffect(() => {
    if (mode !== "mypage" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ok = params.get("oauth_link");
    const oauthErr = params.get("oauth_link_error");
    if (!ok && !oauthErr) return;
    const path = window.location.pathname;
    params.delete("oauth_link");
    params.delete("oauth_link_error");
    const q = params.toString();
    window.history.replaceState(null, "", q ? `${path}?${q}` : path);
    if (ok === "ok") {
      showAlert("알림", "SNS 계정이 연결되었습니다.");
      onDetailUpdated?.();
    } else if (oauthErr) {
      const msg =
        oauthErr === "already_linked"
          ? "이미 다른 계정에 연결된 SNS 계정입니다."
          : oauthErr === "user_mismatch"
            ? "본인 확인에 실패했습니다. 다시 로그인 후 시도해 주세요."
            : oauthErr === "invalid_link_token"
              ? "연결 시간이 만료되었거나 유효하지 않은 요청입니다. 다시 시도해 주세요."
              : oauthErr === "no_oauth_id"
                ? "SNS에서 계정 식별 정보를 받지 못했습니다."
                : oauthErr === "cancelled"
                  ? "SNS 연결을 취소했습니다."
                  : oauthErr === "no_code"
                    ? "SNS 인증 코드를 받지 못했습니다. 다시 시도해 주세요."
                    : "SNS 연결에 실패했습니다.";
      showAlert("알림", msg, "danger");
    }
  }, [mode, showAlert, onDetailUpdated]);

  useEffect(() => {
    schoolSearchKeywordRef.current = schoolSearchKeyword;
  }, [schoolSearchKeyword]);

  /** MY PAGE: 상세 조회 데이터로 폼 초기값 채우기 */
  useEffect(() => {
    if (mode !== "mypage" || !initialData?.detail) return;
    const d = initialData.detail;
    const restoredAt = new Date().toISOString();
    setUserId((d.userId ?? "").trim());
    setUserNm((d.userNm ?? "").trim());
    setTelno((d.mbtlnum ?? "").trim());
    setZip((d.zip ?? "").trim());
    setAddress((d.adres ?? "").trim());
    setDetailAddress((d.detailAdres ?? "").trim());
    setRrn((d.ihidnum ?? "").trim());
    setEmail((d.emailAdres ?? "").trim());
    setGenderCode(d.sexdstnCode === "F" ? "F" : "M");
    const b = (d.brthdy ?? "").trim().replace(/\D/g, "");
    if (b.length >= 8) {
      setBrdt(`${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6, 8)}`);
    } else if (b) {
      setBrdt(b);
    }
    setMemberSttus((d.mberSttus ?? "A").trim() || "A");
    const sid = (d.schoolId ?? "").trim();
    setSchoolId(sid);
    setSchoolNm((d.schoolNm ?? "").trim());
    setSchoolGb((d.schoolGb ?? "").trim());
    const savedGrade = d.schoolLvl != null ? String(d.schoolLvl) : "";
    const savedClassNm = d.schoolNo != null ? String(d.schoolNo) : "";
    setGrade(savedGrade);
    setClassNm(savedClassNm);
    setCitizenCertYn(d.citizenYn === "Y" ? "Y" : "N");
    setSingleParentYn(d.singleYn === "Y" ? "Y" : "N");
    setUnder14Yn(d.minorYn === "Y" ? "Y" : "N");
    setBasicLivelihoodYn(d.basicYn === "Y" ? "Y" : "N");
    setNextTierYn(d.poorYn === "Y" ? "Y" : "N");
    setRuralSchoolYn(d.farmYn === "Y" ? "Y" : "N");
    setCitizenCertAt(
      d.citizenYn === "Y" || d.citizenYn === "N" ? restoredAt : null,
    );
    setSingleParentCertAt(
      d.singleYn === "Y" || d.singleYn === "N" ? restoredAt : null,
    );
    setUnder14CertAt(null);
    setBasicLivelihoodCertAt(
      d.basicYn === "Y" || d.basicYn === "N" ? restoredAt : null,
    );
    setNextTierCertAt(d.poorYn === "Y" || d.poorYn === "N" ? restoredAt : null);
    setRuralSchoolCertAt(null);
    const ynOrNull = (v: unknown): "Y" | "N" | null =>
      v === "Y" || v === "N" ? v : null;
    serverGpkiYnSnapshotRef.current = {
      citizen: ynOrNull(d.citizenYn),
      single: ynOrNull(d.singleYn),
      basic: ynOrNull(d.basicYn),
      poor: ynOrNull(d.poorYn),
    };
    const pics = initialData.userPicFiles;
    if (
      pics &&
      pics.length > 0 &&
      pics[0].fileId != null &&
      pics[0].seq != null
    ) {
      const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
      const viewUrl = base
        ? `${base}/api/v1/files/view?fileId=${encodeURIComponent(String(pics[0].fileId))}&seq=${encodeURIComponent(String(pics[0].seq))}`
        : "";
      if (viewUrl) setPhotoPreview(viewUrl);
    }
    /** 마이페이지: 저장된 학교가 있으면 학년/반 옵션 로드 */
    if (!sid) return;
    let cancelled = false;
    (async () => {
      try {
        setClassLoading(true);
        const classList = await NeisService.getClassInfo({
          sdSchulCode: sid,
        });
        if (cancelled) return;
        const gradeSet = new Set<string>();
        classList.forEach((item) => {
          if (item.grade) gradeSet.add(item.grade);
        });
        setGradeOptions([
          DEFAULT_SELECT_OPTION,
          ...Array.from(gradeSet)
            .sort()
            .map((g) => ({ value: g, label: `${g}학년` })),
        ]);
        if (savedGrade) {
          const filtered = classList.filter(
            (item) => item.grade === savedGrade,
          );
          setClassOptions([
            DEFAULT_SELECT_OPTION,
            ...filtered
              .map((item) => ({
                value: item.classNm || "",
                label: item.classNm || "",
              }))
              .filter((item) => item.value !== ""),
          ]);
        } else {
          setClassOptions([DEFAULT_SELECT_OPTION]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("학급 정보 조회 실패:", err);
          setGradeOptions([DEFAULT_SELECT_OPTION]);
          setClassOptions([DEFAULT_SELECT_OPTION]);
        }
      } finally {
        if (!cancelled) setClassLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, initialData]);

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
      }
    },
    [],
  );

  /** MY PAGE: 서버에 저장된 사진 삭제 시 확인 후 API 호출 */
  const handleConfirmDeleteUserPic = useCallback(async () => {
    setShowConfirmDeletePic(false);
    const esntlId = initialData?.detail?.esntlId;
    const pic = initialData?.userPicFiles?.[0];
    if (!esntlId || pic?.fileId == null || pic?.seq == null) return;
    try {
      await UserArmuserService.deleteUserPic(
        esntlId,
        Number(pic.fileId),
        Number(pic.seq),
      );
      setPhotoFile(null);
      if (photoPreview && photoPreview.startsWith("blob:"))
        URL.revokeObjectURL(photoPreview);
      setPhotoPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      showAlert("삭제 완료", "사진로고가 삭제되었습니다.");
      onDetailUpdated?.();
    } catch (e) {
      console.error("사진로고 삭제 실패:", e);
      showAlert(
        "삭제 실패",
        e instanceof Error
          ? e.message
          : "사진로고 삭제 중 오류가 발생했습니다.",
        "danger",
      );
    }
  }, [
    initialData?.detail?.esntlId,
    initialData?.userPicFiles,
    photoPreview,
    onDetailUpdated,
  ]);

  const handlePhotoRemove = useCallback(() => {
    if (
      mode === "mypage" &&
      initialData?.userPicFiles?.[0] &&
      initialData.userPicFiles[0].fileId != null &&
      initialData.userPicFiles[0].seq != null &&
      photoPreview &&
      !photoPreview.startsWith("blob:")
    ) {
      setShowConfirmDeletePic(true);
      return;
    }
    setPhotoFile(null);
    if (photoPreview && photoPreview.startsWith("blob:"))
      URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [mode, initialData?.userPicFiles, photoPreview]);

  const handleRrnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 13);
    setRrn(v);
    if (v.length === 13) setGpkiPrereqErrorRrn(false);
  };

  const ensureGpkiCertPrereqs = useCallback((): boolean => {
    const ihidnum = (rrn || "").replace(/\D/g, "").slice(0, 13);
    const okRrn = ihidnum.length === 13;
    const okNm = Boolean(userNm.trim());
    setGpkiPrereqErrorRrn(!okRrn);
    setGpkiPrereqErrorUserNm(!okNm);
    return okRrn && okNm;
  }, [rrn, userNm]);

  type GpkiRestoreKind = "citizen" | "single" | "basic" | "poor";
  /**
   * MY PAGE: 서버에서 받은 스냅샷이 N인데 화면만 Y로 잠긴 비정상 상태일 때만, 클릭으로 N으로 맞춤(API 없음).
   * 인증 API 성공 시 serverGpkiYnSnapshotRef를 같은 값으로 갱신하므로, 조회 직후 재클릭은 needApi(재조회)로 이어짐.
   * 주민번호·이름 미충족 시에는 항상 blocked_prereq(알림 후 입력 유도).
   */
  const tryRestoreMypageGpkiN = useCallback(
    (
      kind: GpkiRestoreKind,
      opts: {
        pressed: boolean;
        certAt: string | null;
        setYn: (v: string) => void;
        setCertAt: (iso: string) => void;
      },
    ): "done" | "needApi" | "blocked_prereq" => {
      if (mode !== "mypage") {
        if (!ensureGpkiCertPrereqs()) return "blocked_prereq";
        return "needApi";
      }
      const snap = serverGpkiYnSnapshotRef.current;
      const snapVal =
        kind === "citizen"
          ? snap.citizen
          : kind === "single"
            ? snap.single
            : kind === "basic"
              ? snap.basic
              : snap.poor;

      if (opts.pressed && opts.certAt && snapVal === "N") {
        setGpkiPrereqErrorRrn(false);
        setGpkiPrereqErrorUserNm(false);
        opts.setYn("N");
        opts.setCertAt(new Date().toISOString());
        return "done";
      }
      if (!ensureGpkiCertPrereqs()) {
        return "blocked_prereq";
      }
      return "needApi";
    },
    [mode, ensureGpkiCertPrereqs],
  );

  const alertGpkiPrereqBlocked = useCallback(() => {
    const ihidnum = (rrn || "").replace(/\D/g, "").slice(0, 13);
    const okRrn = ihidnum.length === 13;
    const okNm = Boolean(userNm.trim());

    let message: string;
    let focusId: string;

    if (!okRrn && !okNm) {
      message =
        "부분 인증을 하려면 이름과 주민등록번호 숫자 13자리를 모두 입력해 주세요.";
      focusId = "joinRrn";
    } else if (!okRrn) {
      message = "주민등록번호는 숫자 13자리를 입력해 주세요.";
      focusId = "joinRrn";
    } else {
      message = "이름을 입력해 주세요.";
      focusId = "joinUserNm";
    }

    showAlert("알림", message, "danger", focusId);
  }, [rrn, userNm, showAlert]);

  const handleUserIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextUserId = e.target.value;
      setUserId(nextUserId);
      if (checkedUserId && checkedUserId !== nextUserId.trim()) {
        setCheckedUserId("");
      }
    },
    [checkedUserId],
  );

  const handleTelnoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setTelno(formatPhoneWithHyphen(digits));
  };

  const handleCheckUserId = useCallback(async () => {
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      showAlert("알림", "아이디를 입력하세요.", "danger", "joinUserId");
      return;
    }
    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailLike.test(trimmedUserId)) {
      showAlert("알림", "이메일 형식을 확인해주세요.", "danger", "joinUserId");
      return;
    }

    setIsCheckingUserId(true);
    try {
      const res = await UserMemberService.checkMemberId(trimmedUserId);
      if (res.result === "01") {
        showAlert(
          "알림",
          res.message || "아이디 중복 확인에 실패했습니다.",
          "danger",
          "joinUserId",
        );
        return;
      }
      if (res.exist === 1) {
        setCheckedUserId("");
        setIsDuplicateUserId(true);
        showAlert(
          "알림",
          "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.",
          "danger",
          "joinUserId",
        );
        return;
      }
      if (res.exist === 0) {
        setCheckedUserId(trimmedUserId);
        setIsDuplicateUserId(false);
        showAlert("알림", "사용 가능한 아이디입니다.", "success");
        return;
      }
      showAlert(
        "알림",
        res.message || "아이디 중복 확인에 실패했습니다.",
        "danger",
        "joinUserId",
      );
    } catch (err) {
      console.error("학생 회원가입 아이디 중복확인 실패:", err);
      showAlert(
        "알림",
        err instanceof ApiError
          ? err.message || "아이디 중복 확인에 실패했습니다."
          : "아이디 중복 확인 중 오류가 발생했습니다.",
        "danger",
        "joinUserId",
      );
    } finally {
      setIsCheckingUserId(false);
    }
  }, [showAlert, userId]);

  const handleAddressSearch = useCallback(() => {
    openDaumPostcode((data) => {
      const fullAddress =
        data.userSelectedType === "R"
          ? data.roadAddress
          : data.jibunAddress || data.roadAddress;
      const extra = data.buildingName ? ` ${data.buildingName}` : "";
      setZip(data.zonecode || "");
      setAddress(fullAddress + extra);
    });
  }, []);

  const fetchSchoolList = useCallback(async () => {
    try {
      setSchoolLoading(true);
      const response = await NeisService.getGunsanSchools({
        page: schoolCurrentPage - 1,
        size: SCHOOL_PAGE_SIZE,
        text: schoolSearchKeywordRef.current?.trim() || undefined,
      });
      let schools: SchoolItem[] = [];
      let total = 0;
      if (Array.isArray(response)) {
        schools = response;
        total = response.length;
      } else if (response && typeof response === "object") {
        if (Array.isArray(response.content)) schools = response.content;
        else if (Array.isArray(response.data)) schools = response.data;
        else if (Array.isArray(response.list)) schools = response.list;
        total =
          Number((response as { totalElements?: number }).totalElements) ??
          schools.length;
      }
      setSchoolList(schools);
      setSchoolTotalPages(Math.max(1, Math.ceil(total / SCHOOL_PAGE_SIZE)));
    } catch (err) {
      console.error("학교 목록 조회 실패:", err);
      setSchoolList([]);
      setSchoolTotalPages(0);
    } finally {
      setSchoolLoading(false);
    }
  }, [schoolCurrentPage]);

  const fetchSchoolListRef = useRef(fetchSchoolList);
  useEffect(() => {
    fetchSchoolListRef.current = fetchSchoolList;
  }, [fetchSchoolList]);

  useEffect(() => {
    if (showSchoolModal) fetchSchoolListRef.current();
  }, [showSchoolModal, schoolCurrentPage]);

  const handleOpenSchoolModal = useCallback(() => {
    setSchoolSearchKeyword("");
    setSchoolCurrentPage(1);
    setShowSchoolModal(true);
  }, []);

  const handleCloseSchoolModal = useCallback(() => {
    setShowSchoolModal(false);
    setSchoolSearchKeyword("");
  }, []);

  /** 초기화: 회원가입 폼 전체를 초기값으로 되돌림 */
  const handleReset = useCallback(() => {
    setCertDataFromJoin(false);
    setCertDi("");
    setCheckedUserId("");
    setIsDuplicateUserId(false);
    // 기본정보
    setUserId("");
    setPassword("");
    setPasswordConfirm("");
    setUserNm("");
    setTelno("");
    setZip("");
    setAddress("");
    setDetailAddress("");
    setRrn("");
    setRrnFocused(false);
    setEmail("");
    setGenderCode("M");
    setBrdt(today);
    setMemberSttus("A");
    // 학교/학년/반
    setSchoolId("");
    setSchoolNm("");
    setSchoolGb("");
    setGrade("");
    setClassNm("");
    setGradeOptions([DEFAULT_SELECT_OPTION]);
    setClassOptions([DEFAULT_SELECT_OPTION]);
    setClassLoading(false);
    // 사진
    handlePhotoRemove();
    // 시민인증·한부모 등 여부
    setCitizenCertYn("N");
    setSingleParentYn("N");
    setUnder14Yn("N");
    setBasicLivelihoodYn("N");
    setNextTierYn("N");
    setRuralSchoolYn("N");
    setCitizenCertAt(null);
    setSingleParentCertAt(null);
    setUnder14CertAt(null);
    setBasicLivelihoodCertAt(null);
    setNextTierCertAt(null);
    setRuralSchoolCertAt(null);
    // 학교검색 모달 관련
    setShowSchoolModal(false);
    setSchoolSearchKeyword("");
    setSchoolList([]);
    setSchoolCurrentPage(1);
    setSchoolTotalPages(0);
    setSchoolLoading(false);
  }, [handlePhotoRemove]);

  /** 신청하기: 유효성 검사 후 회원가입 API 호출 (상태 A, 가입일자는 서버 기본값 사용) */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const ihidnum = (rrn || "").replace(/\D/g, "").slice(0, 13);
      if (!userId.trim()) {
        showAlert("알림", "아이디를 입력하세요.", "danger", "joinUserId");
        return;
      }
      if (mode !== "mypage") {
        const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailLike.test(userId.trim())) {
          showAlert(
            "알림",
            "아이디는 이메일 형식으로 입력해주세요.",
            "danger",
            "joinUserId",
          );
          return;
        }
        if (checkedUserId !== userId.trim()) {
          showAlert(
            "알림",
            "아이디 중복 확인을 해주세요.",
            "danger",
            "joinUserId",
          );
          return;
        }
      }
      if (mode !== "mypage") {
        if (!password) {
          showAlert("알림", "비밀번호를 입력하세요.", "danger", "joinPassword");
          return;
        }
        if (!passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호 확인을 입력하세요.",
            "danger",
            "joinPasswordConfirm",
          );
          return;
        }
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "joinPasswordConfirm",
          );
          return;
        }
      } else if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "joinPasswordConfirm",
          );
          return;
        }
      }
      if (!userNm.trim()) {
        showAlert("알림", "회원명을 입력하세요.", "danger", "joinUserNm");
        return;
      }
      if (!telno.trim()) {
        showAlert("알림", "연락처를 입력하세요.", "danger", "joinTelno");
        return;
      }
      if (!email.trim()) {
        showAlert("알림", "이메일을 입력하세요.", "danger", "joinEmail");
        return;
      }
      if (ihidnum.length !== 13) {
        showAlert(
          "알림",
          "주민등록번호 13자리를 입력하세요.",
          "danger",
          "joinRrn",
        );
        return;
      }
      if (!brdt) {
        showAlert("알림", "생년월일을 선택하세요.", "danger", "joinBrdt");
        return;
      }

      setSubmitLoading(true);
      try {
        if (mode === "mypage") {
          const esntlId = initialData?.detail?.esntlId?.trim();
          if (!esntlId) {
            showAlert("알림", "회원 정보를 불러올 수 없습니다.", "danger");
            return;
          }
          const updateRequest: ArmuserUpdateRequest = {
            esntlId,
            userSe: "SNR",
            userId: userId.trim(),
            userNm: userNm.trim(),
            ihidnum: ihidnum || undefined,
            mbtlnum: telno.trim() || undefined,
            emailAdres: email.trim() || undefined,
            zip: zip.trim() || undefined,
            adres: address.trim() || undefined,
            detailAdres: detailAddress.trim() || undefined,
            brthdy: (brdt || "").replace(/-/g, "") || undefined,
            sexdstnCode: genderCode || undefined,
            schoolId: schoolId.trim() || undefined,
            schoolGb: schoolGb.trim() || undefined,
            schoolNm: schoolNm.trim() || undefined,
            schoolLvl: grade ? parseInt(grade, 10) : undefined,
            schoolNo: classNm ? parseInt(classNm, 10) : undefined,
            singleYn: singleParentYn || undefined,
            basicYn: basicLivelihoodYn || undefined,
            poorYn: nextTierYn || undefined,
            citizenYn: citizenCertYn || undefined,
            minorYn: under14Yn || undefined,
            farmYn: ruralSchoolYn || undefined,
          };
          if (password && password.trim()) {
            updateRequest.password = password;
          }
          const res = await UserArmuserService.updateArmuserMultipart(
            esntlId,
            updateRequest,
            photoFile ?? undefined,
          );
          if (res.result === "01") {
            showAlert("알림", res.message || "수정에 실패했습니다.", "danger");
            return;
          }
          showAlert("알림", "수정이 완료되었습니다.", "success");
        } else {
          const request: ArmuserInsertRequest = {
            userSe: "SNR",
            userId: userId.trim(),
            password,
            userNm: userNm.trim(),
            ihidnum: ihidnum || undefined,
            mbtlnum: telno.trim() || undefined,
            emailAdres: email.trim() || undefined,
            zip: zip.trim() || undefined,
            adres: address.trim() || undefined,
            detailAdres: detailAddress.trim() || undefined,
            brthdy: brdt || undefined,
            sexdstnCode: genderCode || undefined,
            mberSttus: memberSttus || "A",
            sbscrbDe: today,
            schoolId: schoolId.trim() || undefined,
            schoolGb: schoolGb.trim() || undefined,
            schoolNm: schoolNm.trim() || undefined,
            schoolLvl: grade ? parseInt(grade, 10) : undefined,
            schoolNo: classNm ? parseInt(classNm, 10) : undefined,
            singleYn: singleParentYn || undefined,
            basicYn: basicLivelihoodYn || undefined,
            poorYn: nextTierYn || undefined,
            citizenYn: citizenCertYn || undefined,
            minorYn: under14Yn || undefined,
            farmYn: ruralSchoolYn || undefined,
            crtfcDnValue: certDi || undefined,
          };
          const res = await UserArmuserService.insertArmuserMultipart(
            request,
            photoFile ?? undefined,
          );
          if (res.result === "50") {
            showAlert(
              "알림",
              res.message || "이미 사용 중인 아이디입니다.",
              "danger",
              "joinUserId",
            );
            return;
          }
          if (res.result === "01") {
            showAlert("알림", res.message || "등록에 실패했습니다.", "danger");
            return;
          }
          if (res.result === "51") {
            showAlert(
              "알림",
              res.message || "이미 본인인증으로 가입된 회원입니다.",
              "danger",
            );
            return;
          }
          afterAlertCloseRef.current = handleReset;
          showAlert("알림", "신청이 완료되었습니다.", "success");
        }
      } catch (err) {
        console.error(
          mode === "mypage" ? "학생 정보 수정 실패:" : "회원가입 실패:",
          err,
        );
        if (err instanceof ApiError) {
          showAlert(
            "알림",
            err.message ||
              (mode === "mypage"
                ? "수정 중 오류가 발생했습니다."
                : "회원가입 중 오류가 발생했습니다."),
            "danger",
          );
        } else {
          showAlert(
            "알림",
            mode === "mypage"
              ? "수정 중 오류가 발생했습니다."
              : "회원가입 중 오류가 발생했습니다.",
            "danger",
          );
        }
      } finally {
        setSubmitLoading(false);
      }
    },
    [
      mode,
      initialData?.detail?.esntlId,
      userId,
      checkedUserId,
      password,
      passwordConfirm,
      userNm,
      telno,
      email,
      rrn,
      brdt,
      memberSttus,
      genderCode,
      zip,
      address,
      detailAddress,
      schoolId,
      schoolNm,
      schoolGb,
      grade,
      photoFile,
      classNm,
      singleParentYn,
      basicLivelihoodYn,
      nextTierYn,
      citizenCertYn,
      under14Yn,
      ruralSchoolYn,
      certDi,
      handleReset,
      showAlert,
    ],
  );

  const handleSchoolSearch = useCallback(() => {
    setSchoolCurrentPage(1);
    fetchSchoolListRef.current();
  }, []);

  const handleSchoolSelect = useCallback(async (school: SchoolItem) => {
    const schoolCode = school.sdSchulCode ?? "";
    const typeName = school.schulKndScNm ?? "";
    setSchoolId(schoolCode);
    setSchoolNm(school.schulNm || "");
    setSchoolGb(mapSchoolGb(typeName));
    setGrade("");
    setClassNm("");
    setShowSchoolModal(false);
    setSchoolSearchKeyword("");
    if (schoolCode) {
      try {
        setClassLoading(true);
        const classList = await NeisService.getClassInfo({
          sdSchulCode: schoolCode,
        });
        const gradeSet = new Set<string>();
        classList.forEach((item) => {
          if (item.grade) gradeSet.add(item.grade);
        });
        setGradeOptions([
          DEFAULT_SELECT_OPTION,
          ...Array.from(gradeSet)
            .sort()
            .map((g) => ({ value: g, label: `${g}학년` })),
        ]);
        setClassOptions([DEFAULT_SELECT_OPTION]);
      } catch (err) {
        console.error("학급 정보 조회 실패:", err);
        setGradeOptions([DEFAULT_SELECT_OPTION]);
        setClassOptions([DEFAULT_SELECT_OPTION]);
      } finally {
        setClassLoading(false);
      }
    } else {
      setGradeOptions([DEFAULT_SELECT_OPTION]);
      setClassOptions([DEFAULT_SELECT_OPTION]);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSchoolModal) handleCloseSchoolModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSchoolModal, handleCloseSchoolModal]);

  useEffect(() => {
    if (showSchoolModal) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showSchoolModal]);

  // 학년 변경 시 해당 학년 반 목록으로 classOptions 갱신 (현재 반이 새 옵션에 없을 때만 반 초기화)
  useEffect(() => {
    if (!schoolId || !grade) {
      setClassOptions([DEFAULT_SELECT_OPTION]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setClassLoading(true);
        const classList = await NeisService.getClassInfo({
          sdSchulCode: schoolId,
        });
        if (cancelled) return;
        const filtered = classList.filter((item) => item.grade === grade);
        const newOptions = [
          DEFAULT_SELECT_OPTION,
          ...filtered
            .map((item) => ({
              value: item.classNm || "",
              label: item.classNm || "",
            }))
            .filter((item) => item.value !== ""),
        ];
        setClassOptions(newOptions);
        setClassNm((prev) => {
          const optionValues = new Set(
            newOptions.filter((o) => o.value !== "").map((o) => o.value),
          );
          return optionValues.has(prev) ? prev : "";
        });
      } catch (err) {
        if (!cancelled) setClassOptions([DEFAULT_SELECT_OPTION]);
      } finally {
        if (!cancelled) setClassLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, grade]);

  const formBlock = (
    <div className="mainBg">
      <div className="registrationContainer joinInput">
        <form className="mainForm" onSubmit={handleSubmit}>
          <section className="formSection">
            {mode !== "mypage" && (
              <div
                className={`joinStatus ${
                  initialData?.detail?.mberSttus === "P"
                    ? "join"
                    : initialData?.detail?.mberSttus === "D"
                      ? "out"
                      : "register"
                }`}
              >
                {initialData?.detail?.mberSttus === "P"
                  ? "사용"
                  : initialData?.detail?.mberSttus === "D"
                    ? "탈퇴"
                    : "신청"}
              </div>
            )}
            <div className="sectionHeader">
              <div className="sectionTitle">학생정보 입력</div>
            </div>
            <div className="formGrid">
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="joinUserId" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    아이디
                  </label>
                  <div className="formControl">
                    {mode === "join" ? (
                      <div className="inputWithBtn">
                        <input
                          type="text"
                          id="joinUserId"
                          className="inputField"
                          placeholder="이메일 형식으로 입력해주세요"
                          value={userId}
                          onChange={handleUserIdChange}
                          style={
                            isDuplicateUserId
                              ? {
                                  borderColor: "#ef4444",
                                  backgroundColor: "#fef2f2",
                                }
                              : undefined
                          }
                        />
                        <button
                          type="button"
                          className="btnSearch"
                          onClick={handleCheckUserId}
                          disabled={isCheckingUserId}
                          style={
                            isDuplicateUserId
                              ? {
                                  borderColor: "#ef4444",
                                  backgroundColor: "#fee2e2",
                                  color: "#dc2626",
                                }
                              : undefined
                          }
                        >
                          {isCheckingUserId ? "확인 중..." : "중복확인"}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        id="joinUserId"
                        className="inputField"
                        placeholder="이메일 형식으로 입력해주세요"
                        value={userId}
                        onChange={handleUserIdChange}
                        readOnly
                        aria-readonly="true"
                      />
                    )}
                  </div>
                </div>
                <div
                  className={`fieldUnit${gpkiPrereqErrorUserNm ? " fieldMissing" : ""}`}
                >
                  <label htmlFor="joinUserNm" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    회원명
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="joinUserNm"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="회원명을 입력해주세요"
                      value={userNm}
                      onChange={(e) => {
                        setUserNm(e.target.value);
                        if (e.target.value.trim())
                          setGpkiPrereqErrorUserNm(false);
                      }}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                      aria-invalid={gpkiPrereqErrorUserNm}
                    />
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="joinPassword" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    비밀번호
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="joinPassword"
                      className="inputField"
                      placeholder="비밀번호를 입력해주세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="joinPasswordConfirm" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    비밀번호 확인
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="joinPasswordConfirm"
                      className="inputField"
                      placeholder="비밀번호를 다시 입력해주세요"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="joinTelno" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    연락처
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="joinTelno"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="010-1234-5678"
                      value={telno}
                      onChange={handleTelnoChange}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                    />
                  </div>
                </div>
                <div
                  className={`fieldUnit${gpkiPrereqErrorRrn ? " fieldMissing" : ""}`}
                >
                  <label htmlFor="joinRrn" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    주민등록번호
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="joinRrn"
                      className="inputField"
                      placeholder="000000-0000000"
                      value={getIhidnumDisplayValue(rrn, rrnFocused)}
                      onChange={handleRrnChange}
                      onFocus={() => setRrnFocused(true)}
                      onBlur={() => setRrnFocused(false)}
                      aria-label="주민등록번호"
                      aria-invalid={gpkiPrereqErrorRrn}
                    />
                  </div>
                </div>
              </div>
              <div className="formRow">
                <label className="formLabel" id="lblAddress">
                  주소
                </label>
                <div className="formControl addressContainer">
                  <div className="inputWithBtn">
                    <input
                      type="text"
                      className="inputField bgGray addressZip"
                      readOnly
                      title="우편번호"
                      value={zip}
                      placeholder="우편번호"
                      aria-label="우편번호"
                    />
                    <input
                      type="text"
                      className="inputField bgGray"
                      readOnly
                      title="기본주소"
                      value={address}
                      placeholder="주소"
                      aria-label="기본주소"
                    />
                    <button
                      type="button"
                      className="btnSearch"
                      onClick={handleAddressSearch}
                      title="주소 검색"
                      aria-label="주소 검색"
                    >
                      주소검색
                    </button>
                  </div>
                  <input
                    type="text"
                    className="inputField"
                    placeholder="상세주소를 입력해주세요"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    aria-label="상세주소"
                  />
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="joinEmail" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    이메일
                  </label>
                  <div className="formControl">
                    <input
                      type="email"
                      id="joinEmail"
                      className="inputField"
                      placeholder="이메일을 입력해주세요"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="joinBrdt" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    생년월일
                  </label>
                  <div className="formControl">
                    <input
                      type="date"
                      id="joinBrdt"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      value={brdt}
                      onChange={(e) => setBrdt(e.target.value)}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                    />
                  </div>
                </div>
              </div>
              <div className="formRow">
                <span className="formLabel" id="lblGender">
                  성별
                </span>
                <div
                  className={`customGroup formControl${certDataFromJoin ? " certReadOnly" : ""}`}
                  role="radiogroup"
                  aria-labelledby="lblGender"
                >
                  <label className="customItem">
                    <input
                      type="radio"
                      name="gender"
                      className="customInput"
                      value="M"
                      checked={genderCode === "M"}
                      onChange={(e) => setGenderCode(e.target.value)}
                      disabled={certDataFromJoin}
                      aria-labelledby="lblGender"
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
                      value="F"
                      checked={genderCode === "F"}
                      onChange={(e) => setGenderCode(e.target.value)}
                      disabled={certDataFromJoin}
                      aria-labelledby="lblGender"
                    />
                    <div className="customBox">
                      <span className="customIcon" aria-hidden="true" />
                      <span className="customText">여</span>
                    </div>
                  </label>
                </div>
              </div>
              <div className="formRow">
                <label htmlFor="joinSchoolNm" className="formLabel">
                  학교명
                </label>
                <div className="formControl">
                  <div className="inputWithBtn">
                    <input
                      type="text"
                      id="joinSchoolNm"
                      className="inputField bgGray"
                      readOnly
                      title="학교를 선택해주세요"
                      placeholder="학교를 선택해주세요"
                      value={schoolNm}
                      aria-label="학교명"
                    />
                    <button
                      type="button"
                      className="btnSearch"
                      onClick={handleOpenSchoolModal}
                      title="학교 검색"
                      aria-label="학교 검색"
                    >
                      학교검색
                    </button>
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="joinGrade" className="formLabel">
                    학년
                  </label>
                  <div className="formControl">
                    <select
                      id="joinGrade"
                      className="selectField"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      disabled={!schoolId || classLoading}
                      aria-busy={classLoading}
                    >
                      {gradeOptions.map((opt) => (
                        <option key={opt.value || "empty"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="joinClass" className="formLabel">
                    반
                  </label>
                  <div className="formControl">
                    <select
                      id="joinClass"
                      className="selectField"
                      value={classNm}
                      onChange={(e) => setClassNm(e.target.value)}
                      disabled={!grade || classLoading}
                      aria-busy={classLoading}
                    >
                      {classOptions.map((opt) => (
                        <option key={opt.value || "empty"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="formRow">
                <label htmlFor="joinPhoto" className="formLabel">
                  사진로고
                </label>
                <div className="formControl">
                  <div className="imageUploadContainer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="joinPhoto"
                      className="hiddenInput"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                    <label
                      htmlFor="joinPhoto"
                      className="btnImageAdd"
                      role="button"
                      aria-label="이미지 첨부"
                    >
                      <img
                        src={photoPreview || `${IMG}/img_noImg.png`}
                        alt=""
                        aria-hidden="true"
                        onClick={(e) => {
                          if (!photoPreview) return;
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(
                            photoPreview,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                        className={photoPreview ? "cursor-pointer" : undefined}
                      />
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        className="btnImageDel"
                        aria-label="첨부 이미지 삭제"
                        onClick={handlePhotoRemove}
                      >
                        <span className="iconDel sr-only" aria-hidden="true">
                          삭제
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="formGridToggleTwoCol">
                <div className="formRow">
                  <span className="formLabel" id="lblUnder14">
                    14세미만여부
                  </span>
                  <div
                    className={`customGroup formControl${certDataFromJoin ? " certReadOnly" : ""}`}
                    role="radiogroup"
                    aria-labelledby="lblUnder14"
                  >
                    {(["Y", "N"] as const).map((val) => (
                      <label key={val} className="customItem">
                        <input
                          type="radio"
                          name="under14Yn"
                          className="customInput"
                          value={val}
                          checked={under14Yn === val}
                          disabled={certDataFromJoin}
                          onChange={() => setUnder14Yn(val)}
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">
                            {val === "Y" ? "예" : "아니오"}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="formRow">
                  <span className="formLabel" id="lblRuralSchool">
                    농어촌학교여부
                  </span>
                  <div
                    className="customGroup formControl"
                    role="radiogroup"
                    aria-labelledby="lblRuralSchool"
                  >
                    {(["Y", "N"] as const).map((val) => (
                      <label key={val} className="customItem">
                        <input
                          type="radio"
                          name="ruralSchoolYn"
                          className="customInput"
                          value={val}
                          checked={ruralSchoolYn === val}
                          onChange={() => setRuralSchoolYn(val)}
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">
                            {val === "Y" ? "예" : "아니오"}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="formRow">
                  <span className="formLabel" id="lblCitizenCert">
                    시민인증여부
                  </span>
                  <MypageYnCertButton
                    pressed={citizenCertYn === "Y"}
                    certifiedAt={citizenCertAt}
                    name="시민인증여부"
                    alwaysShowButton={mode === "mypage"}
                    disabled={gpkiYnCertLoadingKey === "citizen"}
                    onClick={async () => {
                      const step = tryRestoreMypageGpkiN("citizen", {
                        pressed: citizenCertYn === "Y",
                        certAt: citizenCertAt,
                        setYn: setCitizenCertYn,
                        setCertAt: setCitizenCertAt,
                      });
                      if (step === "blocked_prereq") {
                        alertGpkiPrereqBlocked();
                        return;
                      }
                      if (step !== "needApi") return;
                      const ihidnum = (rrn || "")
                        .replace(/\D/g, "")
                        .slice(0, 13);
                      const memberName = userNm.trim();

                      setGpkiYnCertLoadingKey("citizen");
                      try {
                        const { isCitizen, reason, message } =
                          await UserGpkiService.checkCitizenByResideCode(
                            ihidnum,
                            memberName,
                          );
                        if (reason === "service_unavailable") {
                          showAlert(
                            "알림",
                            message ||
                              "시민인증 조회를 할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                            "danger",
                          );
                          return;
                        }
                        const next = isCitizen ? "Y" : "N";
                        setCitizenCertYn(next);
                        setCitizenCertAt(new Date().toISOString());
                        if (mode === "mypage") {
                          serverGpkiYnSnapshotRef.current.citizen = next;
                        }
                      } finally {
                        setGpkiYnCertLoadingKey(null);
                      }
                    }}
                  />
                </div>
                <div className="formRow">
                  <span className="formLabel" id="lblBasicLivelihood">
                    기초생활수급자여부
                  </span>
                  <MypageYnCertButton
                    pressed={basicLivelihoodYn === "Y"}
                    certifiedAt={basicLivelihoodCertAt}
                    name="기초생활수급자여부"
                    alwaysShowButton={mode === "mypage"}
                    disabled={gpkiYnCertLoadingKey === "basic"}
                    onClick={async () => {
                      const step = tryRestoreMypageGpkiN("basic", {
                        pressed: basicLivelihoodYn === "Y",
                        certAt: basicLivelihoodCertAt,
                        setYn: setBasicLivelihoodYn,
                        setCertAt: setBasicLivelihoodCertAt,
                      });
                      if (step === "blocked_prereq") {
                        alertGpkiPrereqBlocked();
                        return;
                      }
                      if (step !== "needApi") return;
                      const ihidnum = (rrn || "")
                        .replace(/\D/g, "")
                        .slice(0, 13);
                      const memberName = userNm.trim();

                      setGpkiYnCertLoadingKey("basic");
                      try {
                        const { isEligible, reason, message } =
                          await UserGpkiService.checkBasicLivelihoodYn(
                            ihidnum,
                            memberName,
                          );

                        if (reason === "service_unavailable") {
                          showAlert(
                            "알림",
                            message ||
                              "기초생활수급자 여부 조회를 할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                            "danger",
                          );
                          return;
                        }
                        const next = isEligible ? "Y" : "N";
                        setBasicLivelihoodYn(next);
                        setBasicLivelihoodCertAt(new Date().toISOString());
                        if (mode === "mypage") {
                          serverGpkiYnSnapshotRef.current.basic = next;
                        }
                      } finally {
                        setGpkiYnCertLoadingKey(null);
                      }
                    }}
                  />
                </div>
                <div className="formRow">
                  <span className="formLabel" id="lblNextTier">
                    차상위계층여부
                  </span>
                  <MypageYnCertButton
                    pressed={nextTierYn === "Y"}
                    certifiedAt={nextTierCertAt}
                    name="차상위계층여부"
                    alwaysShowButton={mode === "mypage"}
                    disabled={gpkiYnCertLoadingKey === "poor"}
                    onClick={async () => {
                      const step = tryRestoreMypageGpkiN("poor", {
                        pressed: nextTierYn === "Y",
                        certAt: nextTierCertAt,
                        setYn: setNextTierYn,
                        setCertAt: setNextTierCertAt,
                      });
                      if (step === "blocked_prereq") {
                        alertGpkiPrereqBlocked();
                        return;
                      }
                      if (step !== "needApi") return;
                      const ihidnum = (rrn || "")
                        .replace(/\D/g, "")
                        .slice(0, 13);
                      const memberName = userNm.trim();

                      setGpkiYnCertLoadingKey("poor");
                      try {
                        const { isEligible, reason, message } =
                          await UserGpkiService.checkPoorYn(
                            ihidnum,
                            memberName,
                          );

                        if (reason === "service_unavailable") {
                          showAlert(
                            "알림",
                            message ||
                              "차상위계층 여부 조회를 할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                            "danger",
                          );
                          return;
                        }
                        const next = isEligible ? "Y" : "N";
                        setNextTierYn(next);
                        setNextTierCertAt(new Date().toISOString());
                        if (mode === "mypage") {
                          serverGpkiYnSnapshotRef.current.poor = next;
                        }
                      } finally {
                        setGpkiYnCertLoadingKey(null);
                      }
                    }}
                  />
                </div>
                <div className="formRow">
                  <span className="formLabel" id="lblSingleParent">
                    한부모가족여부
                  </span>
                  <MypageYnCertButton
                    pressed={singleParentYn === "Y"}
                    certifiedAt={singleParentCertAt}
                    name="한부모가족여부"
                    alwaysShowButton={mode === "mypage"}
                    disabled={gpkiYnCertLoadingKey === "single"}
                    onClick={async () => {
                      const step = tryRestoreMypageGpkiN("single", {
                        pressed: singleParentYn === "Y",
                        certAt: singleParentCertAt,
                        setYn: setSingleParentYn,
                        setCertAt: setSingleParentCertAt,
                      });
                      if (step === "blocked_prereq") {
                        alertGpkiPrereqBlocked();
                        return;
                      }
                      if (step !== "needApi") return;
                      const ihidnum = (rrn || "")
                        .replace(/\D/g, "")
                        .slice(0, 13);
                      const memberName = userNm.trim();

                      setGpkiYnCertLoadingKey("single");
                      try {
                        const { isEligible, reason, message } =
                          await UserGpkiService.checkSingleParentYn(
                            ihidnum,
                            memberName,
                          );

                        if (reason === "service_unavailable") {
                          showAlert(
                            "알림",
                            message ||
                              "한부모가족 여부 조회를 할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                            "danger",
                          );
                          return;
                        }
                        const next = isEligible ? "Y" : "N";
                        setSingleParentYn(next);
                        setSingleParentCertAt(new Date().toISOString());
                        if (mode === "mypage") {
                          serverGpkiYnSnapshotRef.current.single = next;
                        }
                      } finally {
                        setGpkiYnCertLoadingKey(null);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="formRow mypageSnsLinkRow">
                <span className="formLabel">간편로그인연결</span>
                <div className="formControl mypageSnsLinkControl">
                  <div className="mypageSnsLinkItem">
                    <span className="mypageSnsLinkBadge mypageBadgeNaver">
                      <img
                        src="/images/userWeb/icon/ico_sns_naver.png"
                        alt="네이버"
                      />
                      네이버
                    </span>
                    {String(initialData?.detail?.naverAuthId ?? "").trim() !==
                    "" ? (
                      <button
                        type="button"
                        className="btnSearch mypageSnsConnectBtn mypageSnsUnlinkBtn"
                        onClick={() => setConfirmUnlinkService("naver")}
                      >
                        해지
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btnSearch mypageSnsConnectBtn"
                        onClick={async () => {
                          try {
                            const url = await AuthService.getOAuthUrl(
                              "naver",
                              "student",
                            );
                            if (url) window.location.href = url;
                          } catch {
                            showAlert(
                              "알림",
                              "네이버 연결 중 오류가 발생했습니다.",
                              "danger",
                            );
                          }
                        }}
                      >
                        연결
                      </button>
                    )}
                  </div>
                  <div className="mypageSnsLinkItem">
                    <span className="mypageSnsLinkBadge mypageBadgeKakao">
                      <img
                        src="/images/userWeb/icon/ico_sns_kakao.png"
                        alt="카카오"
                      />
                      카카오
                    </span>
                    {String(initialData?.detail?.kakaoAuthId ?? "").trim() !==
                    "" ? (
                      <button
                        type="button"
                        className="btnSearch mypageSnsConnectBtn mypageSnsUnlinkBtn"
                        onClick={() => setConfirmUnlinkService("kakao")}
                      >
                        해지
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btnSearch mypageSnsConnectBtn"
                        onClick={async () => {
                          try {
                            const url = await AuthService.getOAuthUrl(
                              "kakao",
                              "student",
                              { mode: "mypage_link" },
                            );
                            if (url) window.location.href = url;
                          } catch {
                            showAlert(
                              "알림",
                              "카카오 연결 중 오류가 발생했습니다.",
                              "danger",
                            );
                          }
                        }}
                      >
                        연결
                      </button>
                    )}
                    {mode === "mypage" && (
                      <a
                        href="#"
                        className="mypageWithdrawPlain"
                        onClick={(e) => e.preventDefault()}
                      >
                        회원탈퇴
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div className="formActions">
            {mode !== "mypage" && (
              <button
                type="button"
                className="btnWhite"
                onClick={handleReset}
                disabled={submitLoading}
                aria-label="입력 내용 초기화"
              >
                초기화
              </button>
            )}
            <button
              type="submit"
              className="btnSubmit"
              disabled={submitLoading}
              aria-label={mode === "mypage" ? "저장하기" : "신청하기"}
              aria-busy={submitLoading}
            >
              {submitLoading
                ? "처리 중..."
                : mode === "mypage"
                  ? "저장하기"
                  : "신청하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const modals = (
    <>
      {/* 학교검색 모달 (join_ac.html과 동일 구조) */}
      <div
        className={`modalOverlay ${showSchoolModal ? "active" : ""}`}
        aria-hidden={!showSchoolModal}
        onClick={(e) =>
          e.target === e.currentTarget && handleCloseSchoolModal()
        }
      >
        <div
          className="modalContent"
          role="dialog"
          aria-labelledby="schoolModalTitle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modalHeader">
            <div id="schoolModalTitle">학교목록</div>
            <button
              type="button"
              className="closeBtn"
              onClick={handleCloseSchoolModal}
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
          <div className="modalBody">
            <div className="schoolSearchBar">
              <input
                type="text"
                className="inputField"
                placeholder="학교명 검색"
                value={schoolSearchKeyword}
                onChange={(e) => setSchoolSearchKeyword(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(), handleSchoolSearch())
                }
                aria-label="학교명 검색"
              />
              <button
                type="button"
                className="btnSearch"
                onClick={handleSchoolSearch}
                disabled={schoolLoading}
              >
                검색
              </button>
            </div>
            {schoolLoading ? (
              <p className="schoolListEmpty">불러오는 중...</p>
            ) : schoolList.length === 0 ? (
              <p className="schoolListEmpty">검색 결과가 없습니다.</p>
            ) : (
              <ul className="schoolList">
                {schoolList.map((school, index) => (
                  <li
                    key={school.sdSchulCode ?? index}
                    className="schoolItem"
                    onClick={() => handleSchoolSelect(school)}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      (e.preventDefault(), handleSchoolSelect(school))
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <div className="schoolInfo">
                      <strong className="schoolName">
                        {school.schulNm ?? ""}{" "}
                        <span className="categoryTag">
                          {school.schulKndScNm ?? ""}
                        </span>
                      </strong>
                      <p className="schoolAddr">
                        <span className="iconLocBg" aria-hidden="true" />
                        <span className="sr-only">주소:</span>{" "}
                        {school.orgRdnma ?? ""}
                        <button
                          type="button"
                          className="mapBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            const addr = school.orgRdnma ?? "";
                            if (addr)
                              window.open(
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`,
                                "_blank",
                              );
                          }}
                        >
                          지도보기
                        </button>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {schoolTotalPages > 1 && (
              <div className="schoolModalPagination">
                <button
                  type="button"
                  className="btnWhite"
                  disabled={schoolCurrentPage <= 1}
                  onClick={() =>
                    setSchoolCurrentPage((p) => Math.max(1, p - 1))
                  }
                >
                  이전
                </button>
                <span className="schoolPageInfo">
                  {schoolCurrentPage} / {schoolTotalPages}
                </span>
                <button
                  type="button"
                  className="btnWhite"
                  disabled={schoolCurrentPage >= schoolTotalPages}
                  onClick={() =>
                    setSchoolCurrentPage((p) =>
                      Math.min(schoolTotalPages, p + 1),
                    )
                  }
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={handleAlertConfirm}
      />
      <ConfirmModal
        isOpen={showConfirmDeletePic}
        title="사진로고 삭제"
        message="사진로고를 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="닫기"
        onConfirm={handleConfirmDeleteUserPic}
        onCancel={() => setShowConfirmDeletePic(false)}
      />
      <ConfirmModal
        isOpen={confirmUnlinkService !== null}
        title="간편로그인 연결 해지"
        message="연결을 해지하시겠습니까?"
        confirmText="해지"
        cancelText="닫기"
        onConfirm={async () => {
          const svc = confirmUnlinkService;
          setConfirmUnlinkService(null);
          if (!svc) return;
          try {
            await AuthService.unlinkOAuthLink(svc);
            showAlert(
              "알림",
              svc === "naver"
                ? "네이버 연결 해지되었습니다."
                : "카카오 연결 해지되었습니다.",
            );
            onDetailUpdated?.();
          } catch {
            showAlert(
              "알림",
              svc === "naver"
                ? "네이버 연결 해지 중 오류가 발생했습니다."
                : "카카오 연결 해지 중 오류가 발생했습니다.",
              "danger",
            );
          }
        }}
        onCancel={() => setConfirmUnlinkService(null)}
      />
    </>
  );

  if (mode === "mypage")
    return (
      <>
        {formBlock}
        {modals}
      </>
    );

  return (
    <section className="inner">
      <div className="mainTitle">회원가입</div>
      {formBlock}
      {modals}
    </section>
  );
};

export default JoinStudentSection;
