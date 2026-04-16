"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { openDaumPostcode } from "@/shared/lib/daumPostcode";
import { apiClient } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { UserMemberService } from "@/entities/userWeb/member/api/memberApi";
import { AuthService } from "@/entities/auth/api";
import type {
  ArmuserDetailResponse,
  ArmuserInsertRequest,
  ArmuserUpdateRequest,
} from "@/entities/adminWeb/armuser/api";
import { ApiError } from "@/shared/lib/apiClient";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";

interface BankCodeItem {
  code?: string;
  codeNm?: string;
}

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
 * 멘토 회원가입/나의정보 폼
 * mode="join": 회원가입, userSe=MNR 로 POST 등록.
 * mode="mypage": 나의정보 수정, userSe=MNR 로 PUT 수정.
 */
const JoinMentorSection: React.FC<{
  mode?: "join" | "mypage";
  initialData?: ArmuserDetailResponse | null;
  onDetailUpdated?: () => void;
}> = ({ mode = "mypage", initialData, onDetailUpdated }) => {
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
  const [profileDesc, setProfileDesc] = useState("");
  /** 회원가입: 약관 페이지 본인인증 후 전달된 데이터로 채운 경우 수정 불가 */
  const [certDataFromJoin, setCertDataFromJoin] = useState(false);
  /** 회원가입: 본인인증 완료 후 저장된 DI(개인식별코드) - 가입 API 전송용 */
  const [certDi, setCertDi] = useState("");
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState("");
  const [isDuplicateUserId, setIsDuplicateUserId] = useState(false);

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

  useEffect(() => {
    if (mode !== "mypage" || !initialData?.detail) return;
    const d = initialData.detail;
    setUserId((d.userId ?? "").trim());
    setUserNm((d.userNm ?? "").trim());
    setTelno((d.mbtlnum ?? d.usrTelno ?? "").trim());
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
    setProfileDesc((d as { profileDesc?: string }).profileDesc ?? "");
  }, [mode, initialData]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  const focusAfterAlertRef = useRef<string | null>(null);
  /** 저장 성공 다이얼로그 확인 후 상세 재조회 */
  const refreshAfterSuccessRef = useRef(false);
  /** 회원가입 성공 다이얼로그 확인 후 초기화 등 */
  const afterAlertCloseRef = useRef<(() => void) | null>(null);
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
    if (refreshAfterSuccessRef.current) {
      refreshAfterSuccessRef.current = false;
      onDetailUpdated?.();
    }
    if (focusId) {
      requestAnimationFrame(() => {
        document.getElementById(focusId)?.focus();
      });
    }
  }, [onDetailUpdated]);

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

  const handleRrnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 13);
    setRrn(v);
  };

  const handleTelnoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setTelno(formatPhoneWithHyphen(digits));
  };

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

  const handleCheckUserId = useCallback(async () => {
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      showAlert("알림", "아이디를 입력하세요.", "danger", "mentorJoinUserId");
      return;
    }
    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailLike.test(trimmedUserId)) {
      showAlert(
        "알림",
        "이메일 형식을 확인해주세요.",
        "danger",
        "mentorJoinUserId",
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
          "mentorJoinUserId",
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
          "mentorJoinUserId",
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
        "mentorJoinUserId",
      );
    } catch (err) {
      console.error("멘토 회원가입 아이디 중복확인 실패:", err);
      showAlert(
        "알림",
        err instanceof ApiError
          ? err.message || "아이디 중복 확인에 실패했습니다."
          : "아이디 중복 확인 중 오류가 발생했습니다.",
        "danger",
        "mentorJoinUserId",
      );
    } finally {
      setIsCheckingUserId(false);
    }
  }, [showAlert, userId]);

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
    setProfileDesc("");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const ihidnum = (rrn || "").replace(/\D/g, "").slice(0, 13);

      if (mode === "join") {
        if (!userId.trim()) {
          showAlert(
            "알림",
            "아이디를 입력하세요.",
            "danger",
            "mentorJoinUserId",
          );
          return;
        }
        const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailLike.test(userId.trim())) {
          showAlert(
            "알림",
            "아이디는 이메일 형식으로 입력해주세요.",
            "danger",
            "mentorJoinUserId",
          );
          return;
        }
        if (checkedUserId !== userId.trim()) {
          showAlert(
            "알림",
            "아이디 중복 확인을 해주세요.",
            "danger",
            "mentorJoinUserId",
          );
          return;
        }
        if (!password) {
          showAlert(
            "알림",
            "비밀번호를 입력하세요.",
            "danger",
            "mentorJoinPassword",
          );
          return;
        }
        if (!passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호 확인을 입력하세요.",
            "danger",
            "mentorJoinPasswordConfirm",
          );
          return;
        }
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "mentorJoinPasswordConfirm",
          );
          return;
        }
      } else if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "mentorJoinPasswordConfirm",
          );
          return;
        }
      }

      if (!userNm.trim()) {
        showAlert("알림", "회원명을 입력하세요.", "danger", "mentorJoinUserNm");
        return;
      }
      if (!telno.trim()) {
        showAlert("알림", "연락처를 입력하세요.", "danger", "mentorJoinTelno");
        return;
      }
      if (!email.trim()) {
        showAlert("알림", "이메일을 입력하세요.", "danger", "mentorJoinEmail");
        return;
      }
      if (ihidnum.length !== 13) {
        showAlert(
          "알림",
          "주민등록번호 13자리를 입력하세요.",
          "danger",
          "mentorJoinRrn",
        );
        return;
      }
      if (!brdt) {
        showAlert("알림", "생년월일을 선택하세요.", "danger", "mentorJoinBrdt");
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
            userSe: "MNR",
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
            profileDesc: profileDesc.trim() || undefined,
          };
          if (password && password.trim()) {
            updateRequest.password = password;
          }
          const res = await UserArmuserService.updateArmuserMultipart(
            esntlId,
            updateRequest,
            undefined,
          );
          if (res.result === "01") {
            showAlert("알림", res.message || "수정에 실패했습니다.", "danger");
            return;
          }
          refreshAfterSuccessRef.current = true;
          showAlert("알림", "수정이 완료되었습니다.", "success");
        } else {
          const request: ArmuserInsertRequest = {
            userSe: "MNR",
            userId: userId.trim(),
            password,
            userNm: userNm.trim(),
            ihidnum: ihidnum || undefined,
            mbtlnum: telno.trim() || undefined,
            emailAdres: email.trim() || undefined,
            zip: zip.trim() || undefined,
            adres: address.trim() || undefined,
            detailAdres: detailAddress.trim() || undefined,
            brthdy: (brdt || "").replace(/-/g, "") || undefined,
            sexdstnCode: genderCode || undefined,
            mberSttus: "A",
            sbscrbDe: today,
            payBankCode: payBankCode.trim() || undefined,
            payBank: payBank.trim() || undefined,
            holderNm: holderNm.trim() || undefined,
            profileDesc: profileDesc.trim() || undefined,
            crtfcDnValue: certDi || undefined,
          };
          const res = await UserArmuserService.insertArmuserMultipart(
            request,
            undefined,
          );
          if (res.result === "50") {
            showAlert(
              "알림",
              res.message || "이미 사용 중인 아이디입니다.",
              "danger",
              "mentorJoinUserId",
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
          mode === "mypage" ? "멘토 정보 수정 실패:" : "멘토 회원가입 실패:",
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
      initialData?.detail?.userId,
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
      profileDesc,
      certDi,
      showAlert,
      onDetailUpdated,
      handleReset,
    ],
  );

  const formBlock = (
    <div className="mainBg">
      <div className="registrationContainer joinInput">
        <form className="mainForm" onSubmit={handleSubmit}>
          <section className="formSection">
            <div className="sectionHeader">
              <div className="titleWrapper">
                <div className="sectionTitle">멘토정보 입력</div>
              </div>
            </div>
            <div className="formGrid">
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="mentorJoinUserId" className="formLabel">
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
                          id="mentorJoinUserId"
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
                        id="mentorJoinUserId"
                        className="inputField"
                        placeholder="아이디"
                        value={userId}
                        readOnly
                        aria-readonly="true"
                      />
                    )}
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="mentorJoinUserNm" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    회원명
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="mentorJoinUserNm"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="회원명을 입력해주세요"
                      value={userNm}
                      onChange={(e) => setUserNm(e.target.value)}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="mentorJoinPassword" className="formLabel">
                    {mode === "join" && (
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                    )}
                    비밀번호
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="mentorJoinPassword"
                      className="inputField"
                      placeholder={
                        mode === "join"
                          ? "비밀번호를 입력해주세요"
                          : "변경 시에만 입력"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-required={mode === "join"}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label
                    htmlFor="mentorJoinPasswordConfirm"
                    className="formLabel"
                  >
                    {mode === "join" && (
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                    )}
                    비밀번호 확인
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="mentorJoinPasswordConfirm"
                      className="inputField"
                      placeholder="비밀번호를 다시 입력해주세요"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      aria-required={mode === "join"}
                    />
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="mentorJoinTelno" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    연락처
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="mentorJoinTelno"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="010-1234-5678"
                      value={telno}
                      onChange={handleTelnoChange}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                      aria-required="true"
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="mentorJoinRrn" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    주민등록번호
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="mentorJoinRrn"
                      className="inputField"
                      placeholder="000000-0000000"
                      value={getIhidnumDisplayValue(rrn, rrnFocused)}
                      onChange={handleRrnChange}
                      onFocus={() => setRrnFocused(true)}
                      onBlur={() => setRrnFocused(false)}
                      aria-label="주민등록번호"
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>
              <div className="formRow">
                <label className="formLabel" id="mentorLblAddress">
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
                  <label htmlFor="mentorJoinEmail" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    이메일
                  </label>
                  <div className="formControl">
                    <input
                      type="email"
                      id="mentorJoinEmail"
                      className="inputField"
                      placeholder="이메일을 입력해주세요"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-required="true"
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="mentorJoinBrdt" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    생년월일
                  </label>
                  <div className="formControl">
                    <input
                      type="date"
                      id="mentorJoinBrdt"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      value={brdt}
                      onChange={(e) => setBrdt(e.target.value)}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <span className="formLabel" id="mentorLblGender">
                    성별
                  </span>
                  <div
                    className={`customGroup formControl${certDataFromJoin ? " certReadOnly" : ""}`}
                    role="radiogroup"
                    aria-labelledby="mentorLblGender"
                  >
                    <label className="customItem">
                      <input
                        type="radio"
                        name="mentorGender"
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
                        name="mentorGender"
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
                <div className="fieldUnit" />
              </div>
              <div className="formRow">
                <span className="formLabel">은행명(은행코드)</span>
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
              {/* 멘토소개 (PROFILE_DESC) - 학원소개와 동일한 textAreaField 크기 */}
              <div className="formRow">
                <label htmlFor="mentorJoinProfileDesc" className="formLabel">
                  멘토소개
                </label>
                <div className="formControl">
                  <textarea
                    id="mentorJoinProfileDesc"
                    className="textAreaField"
                    placeholder="멘토소개 내용을 입력해주세요"
                    value={profileDesc}
                    onChange={(e) => setProfileDesc(e.target.value)}
                    aria-label="멘토소개"
                  />
                </div>
              </div>
              {mode === "mypage" && (
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
                                "mentor",
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
                                "mentor",
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
              )}
            </div>
          </section>
          <div className="formActions">
            {mode === "join" && (
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

  if (mode === "join") {
    return (
      <section className="inner">
        <div className="mainTitle">회원가입</div>
        {formBlock}
        {modals}
      </section>
    );
  }
  return (
    <>
      {formBlock}
      {modals}
    </>
  );
};

export default JoinMentorSection;
