"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { openDaumPostcode } from "@/shared/lib/daumPostcode";
import {
  apiClient,
  TokenUtils,
  openSirenPassBlankWindow,
  tryCloseSirenPassWindow,
  postSirenCreateTokenAndSubmit,
} from "@/shared/lib";
import { API_ENDPOINTS, API_CONFIG, WATER_CERT_SIREN } from "@/shared/config/apiUser";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { UserMemberService } from "@/entities/userWeb/member/api/memberApi";
import { UserGpkiService } from "@/entities/userWeb/gpki/api";
import type {
  ArmuserInsertRequest,
  ArmuserDetailResponse,
  ArmuserUpdateRequest,
} from "@/entities/adminWeb/armuser/api";
import { ApiError } from "@/shared/lib/apiClient";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import { AuthService } from "@/entities/auth/api";

/** PASS 본인인증: 폼에 hidden input 추가 */
function addHiddenInput(formId: string, name: string, value: string) {
  const form = document.getElementById(formId);
  if (!form) return;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

/** PASS 본인인증: 토큰 요청 후 reqCBAForm 생성 (인증하기 클릭 시 createToken 전에 호출) */
async function fetchCertToken(): Promise<void> {
  const params = new URLSearchParams();
  params.append("srvNo", "017001");
  params.append(
    "retUrl",
    typeof window !== "undefined"
      ? `72${window.location.origin}/result/cert`
      : "72https://dev.uaram.co.kr/result/cert",
  );
  const response = await axios.post(
    WATER_CERT_SIREN.TOKEN_AUTH,
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

function formatMypageCertDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
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

interface BankCodeItem {
  code?: string;
  codeNm?: string;
}

const IMG = "/images/userWeb";
const BANK_CODE_ID = "ARM002";

const today = new Date().toISOString().slice(0, 10);

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

/**
 * 학부모 회원가입 폼
 * join_ac.css + 학생 회원가입 패턴 (가입일자/탈퇴일자/회원상태 비노출, 상태 A로 등록)
 * 계좌번호 폼: bizInputPr과 동일 (accountGroup, 은행 select + 예금주 + 계좌번호)
 * mode="mypage": MY PAGE 나의정보에서 사용 시 상단 제목·section 래퍼 없이 폼만 렌더
 * initialData: MY PAGE에서 GET 상세 조회 후 전달 시 폼 초기값으로 사용
 */
const JoinParentSection: React.FC<{
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
  const [bankOptions, setBankOptions] = useState<BankCodeItem[]>([]);
  const [payBankCode, setPayBankCode] = useState("");
  const [payBank, setPayBank] = useState("");
  const [holderNm, setHolderNm] = useState("");
  const [genderCode, setGenderCode] = useState("M");
  const [brdt, setBrdt] = useState(today);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [citizenCertYn, setCitizenCertYn] = useState("N");
  const [singleParentYn, setSingleParentYn] = useState("N");
  const [basicLivelihoodYn, setBasicLivelihoodYn] = useState("N");
  const [nextTierYn, setNextTierYn] = useState("N");
  /** MY PAGE 전용: 서버 미연동, 토글 시에만 채워지는 인증일(ISO) */
  const [citizenCertAt, setCitizenCertAt] = useState<string | null>(null);
  const [singleParentCertAt, setSingleParentCertAt] = useState<string | null>(
    null,
  );
  const [basicLivelihoodCertAt, setBasicLivelihoodCertAt] = useState<
    string | null
  >(null);
  const [nextTierCertAt, setNextTierCertAt] = useState<string | null>(null);
  /** MY PAGE 전용: 보호자 본인인증 완료 여부 및 인증 DI */
  const [guardianCertified, setGuardianCertified] = useState(false);
  const [guardianCertDi, setGuardianCertDi] = useState("");
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

  /** MY PAGE: 이번 세션에서 인증 완료했으면 initialData 동기화 시 인증 상태를 덮어쓰지 않음 */
  const certifiedThisSessionRef = useRef(false);
  /** MY PAGE: 상세 조회로 받은 시민·감면 Y/N (인증 클릭 시 해당없음 복원용) */
  const serverGpkiYnSnapshotRef = useRef<{
    citizen: "Y" | "N" | null;
    single: "Y" | "N" | null;
    basic: "Y" | "N" | null;
    poor: "Y" | "N" | null;
  }>({ citizen: null, single: null, basic: null, poor: null });

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
    setPayBankCode((d.payBankCode ?? "").trim());
    setPayBank((d.payBank ?? "").trim());
    setHolderNm((d.holderNm ?? "").trim());
    setGenderCode(d.sexdstnCode === "F" ? "F" : "M");
    const b = (d.brthdy ?? "").trim().replace(/\D/g, "");
    if (b.length >= 8) {
      setBrdt(`${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6, 8)}`);
    } else if (b) {
      setBrdt(b);
    }
    setCitizenCertYn(d.citizenYn === "Y" ? "Y" : "N");
    setSingleParentYn(d.singleYn === "Y" ? "Y" : "N");
    setBasicLivelihoodYn(d.basicYn === "Y" ? "Y" : "N");
    setNextTierYn(d.poorYn === "Y" ? "Y" : "N");
    setCitizenCertAt(
      d.citizenYn === "Y" || d.citizenYn === "N" ? restoredAt : null,
    );
    setSingleParentCertAt(
      d.singleYn === "Y" || d.singleYn === "N" ? restoredAt : null,
    );
    setBasicLivelihoodCertAt(
      d.basicYn === "Y" || d.basicYn === "N" ? restoredAt : null,
    );
    setNextTierCertAt(d.poorYn === "Y" || d.poorYn === "N" ? restoredAt : null);
    const ynOrNull = (v: unknown): "Y" | "N" | null =>
      v === "Y" || v === "N" ? v : null;
    serverGpkiYnSnapshotRef.current = {
      citizen: ynOrNull(d.citizenYn),
      single: ynOrNull(d.singleYn),
      basic: ynOrNull(d.basicYn),
      poor: ynOrNull(d.poorYn),
    };
    if (!certifiedThisSessionRef.current) {
      setGuardianCertified((d as { certYn?: string }).certYn === "Y");
      setGuardianCertDi((d as { crtfcDnValue?: string }).crtfcDnValue ?? "");
    }
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
  }, [mode, initialData]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  const afterAlertCloseRef = useRef<(() => void) | null>(null);
  const focusAfterAlertRef = useRef<string | null>(null);
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
      focusId = "parentJoinRrn";
    } else if (!okRrn) {
      message = "주민등록번호는 숫자 13자리를 입력해 주세요.";
      focusId = "parentJoinRrn";
    } else {
      message = "이름을 입력해 주세요.";
      focusId = "parentJoinUserNm";
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
      showAlert("알림", "아이디를 입력하세요.", "danger", "parentJoinUserId");
      return;
    }
    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailLike.test(trimmedUserId)) {
      showAlert(
        "알림",
        "이메일 형식을 확인해주세요.",
        "danger",
        "parentJoinUserId",
      );
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
          "parentJoinUserId",
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
          "parentJoinUserId",
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
        "parentJoinUserId",
      );
    } catch (err) {
      console.error("학부모 회원가입 아이디 중복확인 실패:", err);
      showAlert(
        "알림",
        err instanceof ApiError
          ? err.message || "아이디 중복 확인에 실패했습니다."
          : "아이디 중복 확인 중 오류가 발생했습니다.",
        "danger",
        "parentJoinUserId",
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

  const handleReset = useCallback(() => {
    setCertDataFromJoin(false);
    setCertDi("");
    setCheckedUserId("");
    setIsDuplicateUserId(false);
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
    setPayBankCode("");
    setPayBank("");
    setHolderNm("");
    setGenderCode("M");
    setBrdt(today);
    handlePhotoRemove();
    setCitizenCertYn("N");
    setSingleParentYn("N");
    setBasicLivelihoodYn("N");
    setNextTierYn("N");
    setCitizenCertAt(null);
    setSingleParentCertAt(null);
    setBasicLivelihoodCertAt(null);
    setNextTierCertAt(null);
  }, [handlePhotoRemove]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const ihidnum = (rrn || "").replace(/\D/g, "").slice(0, 13);

      if (!userId.trim()) {
        showAlert("알림", "아이디를 입력하세요.", "danger", "parentJoinUserId");
        return;
      }
      if (mode !== "mypage") {
        const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailLike.test(userId.trim())) {
          showAlert(
            "알림",
            "아이디는 이메일 형식으로 입력해주세요.",
            "danger",
            "parentJoinUserId",
          );
          return;
        }
        if (checkedUserId !== userId.trim()) {
          showAlert(
            "알림",
            "아이디 중복 확인을 해주세요.",
            "danger",
            "parentJoinUserId",
          );
          return;
        }
      }
      if (mode !== "mypage") {
        if (!password) {
          showAlert(
            "알림",
            "비밀번호를 입력하세요.",
            "danger",
            "parentJoinPassword",
          );
          return;
        }
        if (!passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호 확인을 입력하세요.",
            "danger",
            "parentJoinPasswordConfirm",
          );
          return;
        }
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "parentJoinPasswordConfirm",
          );
          return;
        }
      } else if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "parentJoinPasswordConfirm",
          );
          return;
        }
      }
      if (!userNm.trim()) {
        showAlert("알림", "회원명을 입력하세요.", "danger", "parentJoinUserNm");
        return;
      }
      if (!telno.trim()) {
        showAlert("알림", "연락처를 입력하세요.", "danger", "parentJoinTelno");
        return;
      }
      if (!email.trim()) {
        showAlert("알림", "이메일을 입력하세요.", "danger", "parentJoinEmail");
        return;
      }
      if (ihidnum.length !== 13) {
        showAlert(
          "알림",
          "주민등록번호 13자리를 입력하세요.",
          "danger",
          "parentJoinRrn",
        );
        return;
      }
      if (!brdt) {
        showAlert("알림", "생년월일을 선택하세요.", "danger", "parentJoinBrdt");
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
            userSe: "PNR",
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
            payBankCode: payBankCode.trim() || undefined,
            payBank: payBank.trim() || undefined,
            holderNm: holderNm.trim() || undefined,
            singleYn: singleParentYn || undefined,
            basicYn: basicLivelihoodYn || undefined,
            poorYn: nextTierYn || undefined,
            citizenYn: citizenCertYn || undefined,
            certYn: guardianCertified ? "Y" : "N",
            crtfcDnValue: guardianCertDi?.trim() || undefined,
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
            userSe: "PNR",
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
            mberSttus: "A",
            sbscrbDe: today,
            payBankCode: payBankCode.trim() || undefined,
            payBank: payBank.trim() || undefined,
            holderNm: holderNm.trim() || undefined,
            singleYn: singleParentYn || undefined,
            basicYn: basicLivelihoodYn || undefined,
            poorYn: nextTierYn || undefined,
            citizenYn: citizenCertYn || undefined,
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
              "parentJoinUserId",
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
          mode === "mypage"
            ? "학부모 정보 수정 실패:"
            : "학부모 회원가입 실패:",
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
      genderCode,
      zip,
      address,
      detailAddress,
      payBankCode,
      payBank,
      holderNm,
      photoFile,
      singleParentYn,
      basicLivelihoodYn,
      nextTierYn,
      citizenCertYn,
      guardianCertified,
      guardianCertDi,
      certDi,
      handleReset,
      showAlert,
    ],
  );

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
              <div className="titleWrapper">
                <div className="sectionTitle">
                  {mode === "mypage" ? "학부모정보" : "학부모정보 입력"}
                </div>
                {mode === "mypage" && (
                  <span
                    className={`subTextBlue ${!guardianCertified ? "certRequired" : ""}`.trim()}
                    role="status"
                    aria-live="polite"
                  >
                    {guardianCertified
                      ? "인증이 완료되었습니다."
                      : "보호자를 인증하세요"}
                  </span>
                )}
              </div>
              {mode === "mypage" && (
                <button
                  type="button"
                  className="btnRed"
                  onClick={async () => {
                    const passPopup = openSirenPassBlankWindow();
                    if (!passPopup || passPopup.closed) {
                      showAlert(
                        "알림",
                        "본인인증 창이 열리지 않았습니다. 브라우저에서 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요.",
                        "danger",
                      );
                      return;
                    }
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
                      certifiedThisSessionRef.current = true;
                      setGuardianCertified(true);
                      setGuardianCertDi(certDi);
                      showAlert(
                        "알림",
                        "본인인증이 완료되었습니다.",
                        "success",
                      );
                      (
                        window as Window & {
                          __onGuardianCertSuccess?: (data: {
                            userName: string;
                            celNo: string;
                            birYMD: string;
                            di?: string;
                          }) => void;
                        }
                      ).__onGuardianCertSuccess = undefined;
                    };
                    try {
                      await fetchCertToken();
                      const formElement = document.getElementsByName(
                        "reqCBAForm",
                      )[0] as HTMLFormElement | undefined;
                      if (!formElement) {
                        throw new Error("reqCBAForm 없음");
                      }
                      await postSirenCreateTokenAndSubmit(
                        formElement,
                        addHiddenInput,
                        TokenUtils.getToken(),
                      );
                    } catch (e) {
                      tryCloseSirenPassWindow(passPopup);
                      console.error(e);
                      showAlert(
                        "알림",
                        "인증 준비 중 오류가 발생했습니다.",
                        "danger",
                      );
                    }
                  }}
                  aria-label="보호자 본인인증 하기"
                >
                  인증하기
                </button>
              )}
            </div>
            <div className="formGrid">
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="parentJoinUserId" className="formLabel">
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
                          id="parentJoinUserId"
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
                        id="parentJoinUserId"
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
                  <label htmlFor="parentJoinUserNm" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    회원명
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="parentJoinUserNm"
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
                  <label htmlFor="parentJoinPassword" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    비밀번호
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="parentJoinPassword"
                      className="inputField"
                      placeholder="비밀번호를 입력해주세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label
                    htmlFor="parentJoinPasswordConfirm"
                    className="formLabel"
                  >
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    비밀번호 확인
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="parentJoinPasswordConfirm"
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
                  <label htmlFor="parentJoinTelno" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    연락처
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="parentJoinTelno"
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
                  <label htmlFor="parentJoinRrn" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    주민등록번호
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="parentJoinRrn"
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
                <label className="formLabel" id="parentLblAddress">
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
                  <label htmlFor="parentJoinBrdt" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    생년월일
                  </label>
                  <div className="formControl">
                    <input
                      type="date"
                      id="parentJoinBrdt"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      value={brdt}
                      onChange={(e) => setBrdt(e.target.value)}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <span className="formLabel" id="parentLblGender">
                    성별코드
                  </span>
                  <div
                    className={`customGroup formControl${certDataFromJoin ? " certReadOnly" : ""}`}
                    role="radiogroup"
                    aria-labelledby="parentLblGender"
                  >
                    <label className="customItem">
                      <input
                        type="radio"
                        name="parentGender"
                        className="customInput"
                        value="M"
                        checked={genderCode === "M"}
                        onChange={(e) => setGenderCode(e.target.value)}
                        disabled={certDataFromJoin}
                      />
                      <div className="customBox">
                        <span className="customIcon" aria-hidden="true" />
                        <span className="customText">남</span>
                      </div>
                    </label>
                    <label className="customItem">
                      <input
                        type="radio"
                        name="parentGender"
                        className="customInput"
                        value="F"
                        checked={genderCode === "F"}
                        onChange={(e) => setGenderCode(e.target.value)}
                        disabled={certDataFromJoin}
                      />
                      <div className="customBox">
                        <span className="customIcon" aria-hidden="true" />
                        <span className="customText">여</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="formRow">
                <label htmlFor="parentJoinEmail" className="formLabel">
                  <span className="requiredMark" aria-hidden="true">
                    *
                  </span>
                  이메일주소
                </label>
                <div className="formControl">
                  <input
                    type="email"
                    id="parentJoinEmail"
                    className="inputField"
                    placeholder="이메일을 입력해주세요"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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
                        key={item.code ? `${item.code}-${idx}` : `bank-${idx}`}
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
                <label htmlFor="parentJoinPhoto" className="formLabel">
                  사진로고
                </label>
                <div className="formControl">
                  <div className="imageUploadContainer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="parentJoinPhoto"
                      className="hiddenInput"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                    <label
                      htmlFor="parentJoinPhoto"
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
                  <span className="formLabel" id="parentLblCitizenCert">
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
                  <span className="formLabel" id="parentLblSingleParent">
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
                <div className="formRow">
                  <span className="formLabel" id="parentLblBasicLivelihood">
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
                  <span className="formLabel" id="parentLblNextTier">
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
                              "parent",
                              { mode: "mypage_link" },
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
                              "parent",
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

export default JoinParentSection;
