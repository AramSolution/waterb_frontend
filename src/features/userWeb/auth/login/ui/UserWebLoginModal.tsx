"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUserWebLogin } from "../model";
import type { LoginRequest, PasswordResetRequestBody } from "@/entities/auth/api";
import { AuthService } from "@/entities/auth/api";
import {
  TokenUtils,
  openSirenPassBlankWindow,
  tryCloseSirenPassWindow,
  postSirenCreateTokenAndSubmit,
  getSirenTokenAuthRetUrlForAccountRecovery,
  readRememberLoginId,
} from "@/shared/lib";
import { EDREAM_CERT_SIREN } from "@/shared/config/api";
import { ApiError } from "@/shared/lib/apiClient";
import "@/styles/userWeb/loginModal.css";

const IMG = "/images/userWeb";

export type LoginModalType = "student" | "parent" | "academy" | "mentor";

const USER_SE_BY_TYPE: Record<LoginModalType, string> = {
  student: "SNR",
  parent: "PNR",
  academy: "ANR",
  mentor: "MNR",
};

const BADGE_LABEL_BY_TYPE: Record<LoginModalType, string> = {
  student: "학생",
  parent: "학부모/일반",
  academy: "학원",
  mentor: "멘토",
};

/** 백엔드 AccountRecoveryService와 동일 (최소 길이) */
const MIN_NEW_PASSWORD_LENGTH = 8;

function buildPasswordResetBody(
  userSe: string,
  newPassword: string,
  opts: {
    recoveryToken: string | null;
    crtfcDn: string | null;
    displayUserId: string | null;
  },
): PasswordResetRequestBody {
  const body: PasswordResetRequestBody = {
    userSe,
    newPassword,
  };
  if (opts.recoveryToken) {
    body.recoveryToken = opts.recoveryToken;
  } else if (opts.crtfcDn) {
    body.crtfcDnValue = opts.crtfcDn;
  }
  const uid = opts.displayUserId?.trim();
  if (uid && !uid.includes("***")) {
    body.userId = uid;
  }
  return body;
}

function badgeClassName(type: LoginModalType): string {
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  return `badgeLogin badge${cap}`;
}

/**
 * 백엔드 EgovFileScrty.encryptPassword(password, id)와 동일한 방식:
 * SHA-256(id bytes + password bytes) 후 Base64 인코딩 (개발자 콘솔 테스트용)
 */
type GuardianCertSuccessPayload = {
  userName: string;
  celNo: string;
  birYMD: string;
  gender: string;
  di: string;
  recoveryToken?: string;
};

function addHiddenInput(formId: string, name: string, value: string) {
  const form = document.getElementById(formId);
  if (!form) return;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

/** 아이디/비밀번호 찾기용: certFlow=accountRecovery + userSe 로 백엔드에서 recoveryToken(JWT) 또는 DI 수신 */
async function fetchCertTokenForFindId(userSe: string): Promise<void> {
  const params = new URLSearchParams();
  params.append("srvNo", "017001");
  params.append("retUrl", getSirenTokenAuthRetUrlForAccountRecovery(userSe));
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

async function encryptPasswordLikeBackend(
  id: string,
  password: string,
): Promise<string> {
  const te = new TextEncoder();
  const idBytes = te.encode(id);
  const pwBytes = te.encode(password);
  const combined = new Uint8Array(idBytes.length + pwBytes.length);
  combined.set(idBytes, 0);
  combined.set(pwBytes, idBytes.length);
  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  const hashArray = new Uint8Array(hashBuffer);
  const binary = String.fromCharCode.apply(null, Array.from(hashArray));
  return typeof btoa !== "undefined" ? btoa(binary) : "";
}

export interface UserWebLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  loginModalType: LoginModalType | null;
  /** 로그인 성공 시 추가 콜백 (모달 닫기 후 호출) */
  onSuccess?: () => void;
  /** 로그인 성공 후 이동할 경로 (미지정 시 /userWeb/main) */
  redirectPath?: string | null;
}

export function UserWebLoginModal({
  isOpen,
  onClose,
  loginModalType,
  onSuccess,
  redirectPath,
}: UserWebLoginModalProps) {
  const [formData, setFormData] = useState({
    id: "",
    password: "",
    remember: false,
  });

  const [oauthLoading, setOauthLoading] = useState<"naver" | "kakao" | null>(
    null,
  );

  const [panel, setPanel] = useState<"login" | "findId" | "findPassword">(
    "login",
  );
  const [findIdLoading, setFindIdLoading] = useState(false);
  const [findIdError, setFindIdError] = useState("");
  /** 아이디 조회 결과 회원 없음 → 안내 + 확인만 표시 */
  const [findIdMemberNotFound, setFindIdMemberNotFound] = useState(false);
  const [findIdResult, setFindIdResult] = useState<string | null>(null);
  /** 아이디 찾기 결과 후: 새 비밀번호 입력 화면 (프론트 전용 저장) */
  const [findIdPwResetOpen, setFindIdPwResetOpen] = useState(false);
  const [findIdNewPw, setFindIdNewPw] = useState("");
  const [findIdNewPwConfirm, setFindIdNewPwConfirm] = useState("");
  const [findIdPwResetError, setFindIdPwResetError] = useState("");
  /** 아이디 찾기 본인인증 직후 — 비밀번호 재설정 API용 */
  const [findIdRecoveryToken, setFindIdRecoveryToken] = useState<string | null>(
    null,
  );
  const [findIdCrtfcDn, setFindIdCrtfcDn] = useState<string | null>(null);
  const [findIdPwResetSubmitting, setFindIdPwResetSubmitting] = useState(false);
  /** 새 비밀번호 저장 직후 확인 전용 팝업 */
  const [findIdPwSuccessDialogOpen, setFindIdPwSuccessDialogOpen] =
    useState(false);

  const [findPwLoading, setFindPwLoading] = useState(false);
  const [findPwError, setFindPwError] = useState("");
  const [findPwMemberNotFound, setFindPwMemberNotFound] = useState(false);
  /** 비밀번호 찾기: 본인인증 후 조회된 로그인 아이디 */
  const [findPwUserId, setFindPwUserId] = useState<string | null>(null);
  const [findPwNewPw, setFindPwNewPw] = useState("");
  const [findPwNewPwConfirm, setFindPwNewPwConfirm] = useState("");
  const [findPwResetError, setFindPwResetError] = useState("");
  /** 비밀번호 찾기 본인인증 직후 — 재설정 API용 */
  const [findPwRecoveryToken, setFindPwRecoveryToken] = useState<string | null>(
    null,
  );
  const [findPwCrtfcDn, setFindPwCrtfcDn] = useState<string | null>(null);
  const [findPwResetSubmitting, setFindPwResetSubmitting] = useState(false);
  const [findPwSuccessDialogOpen, setFindPwSuccessDialogOpen] = useState(false);

  const { error, loading, performLogin, setError } = useUserWebLogin({
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
    redirectPath,
  });

  const handleOAuthClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    service: "naver" | "kakao",
  ) => {
    e.preventDefault();
    if (oauthLoading) return;
    setError("");
    setOauthLoading(service);
    try {
      const url = await AuthService.getOAuthUrl(service, loginModalType);
      if (url) window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OAuth 로그인 URL을 불러오지 못했습니다.",
      );
      setOauthLoading(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setPanel("login");
    setFindIdError("");
    setFindIdMemberNotFound(false);
    setFindIdResult(null);
    setFindIdPwResetOpen(false);
    setFindIdNewPw("");
    setFindIdNewPwConfirm("");
    setFindIdPwResetError("");
    setFindIdRecoveryToken(null);
    setFindIdCrtfcDn(null);
    setFindIdPwResetSubmitting(false);
    setFindIdPwSuccessDialogOpen(false);
    setFindPwError("");
    setFindPwMemberNotFound(false);
    setFindPwUserId(null);
    setFindPwNewPw("");
    setFindPwNewPwConfirm("");
    setFindPwResetError("");
    setFindPwRecoveryToken(null);
    setFindPwCrtfcDn(null);
    setFindPwResetSubmitting(false);
    setFindPwSuccessDialogOpen(false);

    if (loginModalType) {
      const userSe = USER_SE_BY_TYPE[loginModalType];
      const savedId = readRememberLoginId(userSe);
      setFormData({
        id: savedId ?? "",
        password: "",
        remember: Boolean(savedId),
      });
    } else {
      setFormData({ id: "", password: "", remember: false });
    }
  }, [isOpen, loginModalType, setError]);

  /** 아이디 찾기 경로에서 새 비밀번호 저장 후 확인: 모달만 닫고 현재 페이지 유지 */
  const handleConfirmAfterPwChange = useCallback(() => {
    setFindIdPwSuccessDialogOpen(false);
    onClose();
  }, [onClose]);

  /** 비밀번호 찾기 → 새 비밀번호 저장 후 확인: 모달만 닫고 현재 페이지 유지 */
  const handleConfirmAfterFindPwChange = useCallback(() => {
    setFindPwSuccessDialogOpen(false);
    onClose();
  }, [onClose]);

  /** 회원 없음 안내 후 확인: 모달만 닫고 현재 페이지 유지 */
  const handleNoMemberConfirm = useCallback(() => {
    setFindIdMemberNotFound(false);
    setFindPwMemberNotFound(false);
    setFindIdError("");
    setFindPwError("");
    onClose();
  }, [onClose]);

  /** 아이디 찾기 결과에서 닫기: 모달 유지 → 로그인 탭으로 전환, 찾은 아이디 자동 입력 */
  const handleFindIdCloseToLogin = useCallback(() => {
    if (!loginModalType) return;
    const id = findIdResult?.trim() ?? "";
    const w = window as Window & {
      __onGuardianCertSuccess?: (p: GuardianCertSuccessPayload) => void;
    };
    w.__onGuardianCertSuccess = undefined;
    setFindIdError("");
    setFindIdMemberNotFound(false);
    setFindIdResult(null);
    setFindIdPwResetOpen(false);
    setFindIdNewPw("");
    setFindIdNewPwConfirm("");
    setFindIdPwResetError("");
    setFindIdRecoveryToken(null);
    setFindIdCrtfcDn(null);
    setFindIdPwSuccessDialogOpen(false);
    setPanel("login");
    setError("");
    if (id) {
      setFormData({
        id,
        password: "",
        remember: true,
      });
    }
  }, [loginModalType, findIdResult, setError]);

  const handleModalCloseClick = useCallback(() => {
    if (findPwSuccessDialogOpen) {
      handleConfirmAfterFindPwChange();
      return;
    }
    if (findIdPwSuccessDialogOpen) {
      handleConfirmAfterPwChange();
      return;
    }
    if (findIdMemberNotFound || findPwMemberNotFound) {
      handleNoMemberConfirm();
      return;
    }
    if (panel === "findPassword" && findPwUserId) {
      setFindPwUserId(null);
      setFindPwNewPw("");
      setFindPwNewPwConfirm("");
      setFindPwResetError("");
      setFindPwRecoveryToken(null);
      setFindPwCrtfcDn(null);
      return;
    }
    if (panel === "findId" && findIdResult?.trim()) {
      handleFindIdCloseToLogin();
      return;
    }
    onClose();
  }, [
    panel,
    findIdResult,
    findPwUserId,
    findPwSuccessDialogOpen,
    findIdPwSuccessDialogOpen,
    findIdMemberNotFound,
    findPwMemberNotFound,
    handleConfirmAfterFindPwChange,
    handleConfirmAfterPwChange,
    handleNoMemberConfirm,
    handleFindIdCloseToLogin,
    onClose,
  ]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        const w = window as Window & {
          __onGuardianCertSuccess?: (p: GuardianCertSuccessPayload) => void;
        };
        w.__onGuardianCertSuccess = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isOpen) return;
      if (findPwSuccessDialogOpen) {
        handleConfirmAfterFindPwChange();
        return;
      }
      if (findIdPwSuccessDialogOpen) {
        handleConfirmAfterPwChange();
        return;
      }
      if (panel === "findId" && findIdMemberNotFound) {
        handleNoMemberConfirm();
        return;
      }
      if (panel === "findPassword" && findPwMemberNotFound) {
        handleNoMemberConfirm();
        return;
      }
      if (panel === "findId") {
        if (findIdPwResetOpen) {
          setFindIdPwResetOpen(false);
          setFindIdNewPw("");
          setFindIdNewPwConfirm("");
          setFindIdPwResetError("");
          return;
        }
        if (findIdResult?.trim()) {
          handleFindIdCloseToLogin();
          return;
        }
        setPanel("login");
        setFindIdError("");
        setFindIdResult(null);
        setFindIdPwResetOpen(false);
        setFindIdNewPw("");
        setFindIdNewPwConfirm("");
        setFindIdPwResetError("");
        const w = window as Window & {
          __onGuardianCertSuccess?: (p: GuardianCertSuccessPayload) => void;
        };
        w.__onGuardianCertSuccess = undefined;
      } else if (panel === "findPassword") {
        if (findPwUserId) {
          setFindPwUserId(null);
          setFindPwNewPw("");
          setFindPwNewPwConfirm("");
          setFindPwResetError("");
          setFindPwRecoveryToken(null);
          setFindPwCrtfcDn(null);
          return;
        }
        setPanel("login");
        setFindPwError("");
        setFindPwUserId(null);
        setFindPwNewPw("");
        setFindPwNewPwConfirm("");
        setFindPwResetError("");
        const w = window as Window & {
          __onGuardianCertSuccess?: (p: GuardianCertSuccessPayload) => void;
        };
        w.__onGuardianCertSuccess = undefined;
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [
    isOpen,
    onClose,
    panel,
    findIdPwResetOpen,
    findIdPwSuccessDialogOpen,
    findPwSuccessDialogOpen,
    findIdResult,
    findPwUserId,
    findIdMemberNotFound,
    findPwMemberNotFound,
    handleConfirmAfterPwChange,
    handleConfirmAfterFindPwChange,
    handleNoMemberConfirm,
    handleFindIdCloseToLogin,
  ]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginModalType) return;
    if (!formData.id || !formData.password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    const credentials: LoginRequest = {
      id: formData.id,
      password: formData.password,
      remember: formData.remember,
      userSe: USER_SE_BY_TYPE[loginModalType],
    };

    // 개발자 도구: 서버와 동일한 방식의 암호화 결과 (DB 저장 형식) 콘솔 출력
    try {
      const encrypted = await encryptPasswordLikeBackend(
        formData.id,
        formData.password,
      );
      console.log("[로그인 암호화 테스트]", {
        id: formData.id,
        encryptedPassword: encrypted,
        description:
          "위 encryptedPassword 값을 해당 id의 DB 비밀번호 컬럼에 저장하면 이 비밀번호로 로그인 가능합니다.",
      });
    } catch (err) {
      console.warn("[로그인 암호화 테스트] 계산 실패:", err);
    }

    await performLogin(credentials);
  };

  const handleFindIdCertClick = useCallback(async () => {
    if (!loginModalType || findIdLoading) return;
    setFindIdError("");
    setFindIdMemberNotFound(false);
    setFindIdResult(null);
    setFindIdRecoveryToken(null);
    setFindIdCrtfcDn(null);

    const w = window as Window & {
      __onGuardianCertSuccess?: (p: GuardianCertSuccessPayload) => void;
    };

    w.__onGuardianCertSuccess = async (payload: GuardianCertSuccessPayload) => {
      w.__onGuardianCertSuccess = undefined;
      const rt = payload.recoveryToken?.trim();
      const di = payload.di?.trim();
      if (!rt && !di) {
        setFindIdRecoveryToken(null);
        setFindIdCrtfcDn(null);
        setFindIdError(
          "본인인증은 완료되었으나 식별 정보를 받지 못했습니다. 다시 시도해 주세요.",
        );
        return;
      }
      setFindIdRecoveryToken(rt || null);
      setFindIdCrtfcDn(di || null);
      setFindIdLoading(true);
      try {
        const res = rt
          ? await AuthService.findUserIdByRecoveryToken({
              recoveryToken: rt,
            })
          : await AuthService.findUserIdByCrtfcDn({
              userSe: USER_SE_BY_TYPE[loginModalType],
              crtfcDnValue: di!,
            });
        const id =
          (res.userId && String(res.userId).trim()) ||
          (res.maskedUserId && String(res.maskedUserId).trim()) ||
          "";
        if (res.resultCode === "200" && id) {
          setFindIdMemberNotFound(false);
          setFindIdResult(id);
        } else {
          setFindIdMemberNotFound(true);
          setFindIdError("");
          setFindIdRecoveryToken(null);
          setFindIdCrtfcDn(null);
        }
      } catch (err) {
        setFindIdMemberNotFound(false);
        setFindIdRecoveryToken(null);
        setFindIdCrtfcDn(null);
        if (err instanceof ApiError) {
          setFindIdError(err.message);
        } else {
          setFindIdError(
            err instanceof Error
              ? err.message
              : "요청 중 오류가 발생했습니다.",
          );
        }
      } finally {
        setFindIdLoading(false);
      }
    };

    const passPopup = openSirenPassBlankWindow();
    if (!passPopup || passPopup.closed) {
      setFindIdError(
        "팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.",
      );
      w.__onGuardianCertSuccess = undefined;
      return;
    }

    try {
      await fetchCertTokenForFindId(USER_SE_BY_TYPE[loginModalType]);
      const formElements = document.getElementsByName("reqCBAForm");
      const formElement = formElements[0] as HTMLFormElement | undefined;
      if (!formElement) {
        tryCloseSirenPassWindow(passPopup);
        setFindIdError("본인인증 폼을 준비하지 못했습니다.");
        w.__onGuardianCertSuccess = undefined;
        return;
      }
      await postSirenCreateTokenAndSubmit(
        formElement,
        addHiddenInput,
        TokenUtils.getToken(),
      );
    } catch (e) {
      tryCloseSirenPassWindow(passPopup);
      w.__onGuardianCertSuccess = undefined;
      setFindIdError(
        e instanceof Error
          ? e.message
          : "본인인증 요청에 실패했습니다.",
      );
    }
  }, [loginModalType, findIdLoading]);

  /** 아이디 찾기 → 새 비밀번호: 본인인증 정보 + POST /auth/password-reset/request */
  const handleFindIdNewPasswordSubmit = async () => {
    if (!findIdResult?.trim() || !loginModalType) return;
    setFindIdPwResetError("");
    const pw = findIdNewPw.trim();
    const confirm = findIdNewPwConfirm.trim();
    if (!pw) {
      setFindIdPwResetError("새 비밀번호를 입력해 주세요.");
      return;
    }
    if (!confirm) {
      setFindIdPwResetError("새 비밀번호 확인을 입력해 주세요.");
      return;
    }
    if (pw !== confirm) {
      setFindIdPwResetError("새 비밀번호와 확인이 일치하지 않습니다.");
      return;
    }
    if (pw.length < MIN_NEW_PASSWORD_LENGTH) {
      setFindIdPwResetError(
        `비밀번호는 ${MIN_NEW_PASSWORD_LENGTH}자 이상 입력해 주세요.`,
      );
      return;
    }
    if (!findIdRecoveryToken && !findIdCrtfcDn) {
      setFindIdPwResetError(
        "본인인증 정보가 없습니다. 아이디 찾기 본인인증을 다시 진행해 주세요.",
      );
      return;
    }
    setFindIdPwResetSubmitting(true);
    try {
      const body = buildPasswordResetBody(
        USER_SE_BY_TYPE[loginModalType],
        pw,
        {
          recoveryToken: findIdRecoveryToken,
          crtfcDn: findIdCrtfcDn,
          displayUserId: findIdResult,
        },
      );
      const res = await AuthService.requestPasswordReset(body);
      const code = res?.resultCode != null ? String(res.resultCode) : "";
      if (code === "200") {
        setFindIdPwSuccessDialogOpen(true);
        setFindIdNewPw("");
        setFindIdNewPwConfirm("");
        setFindIdRecoveryToken(null);
        setFindIdCrtfcDn(null);
      } else {
        setFindIdPwResetError(
          res?.resultMessage?.trim() || "비밀번호 변경에 실패했습니다.",
        );
      }
    } catch (err) {
      setFindIdPwResetError(
        err instanceof ApiError
          ? err.message
          : "비밀번호 변경 중 오류가 발생했습니다.",
      );
    } finally {
      setFindIdPwResetSubmitting(false);
    }
  };

  /** 비밀번호 찾기 → 새 비밀번호: POST /auth/password-reset/request */
  const handleFindPwNewPasswordSubmit = async () => {
    if (!findPwUserId?.trim() || !loginModalType) return;
    setFindPwResetError("");
    const pw = findPwNewPw.trim();
    const confirm = findPwNewPwConfirm.trim();
    if (!pw) {
      setFindPwResetError("새 비밀번호를 입력해 주세요.");
      return;
    }
    if (!confirm) {
      setFindPwResetError("새 비밀번호 확인을 입력해 주세요.");
      return;
    }
    if (pw !== confirm) {
      setFindPwResetError("새 비밀번호와 확인이 일치하지 않습니다.");
      return;
    }
    if (pw.length < MIN_NEW_PASSWORD_LENGTH) {
      setFindPwResetError(
        `비밀번호는 ${MIN_NEW_PASSWORD_LENGTH}자 이상 입력해 주세요.`,
      );
      return;
    }
    if (!findPwRecoveryToken && !findPwCrtfcDn) {
      setFindPwResetError(
        "본인인증 정보가 없습니다. 비밀번호 찾기 본인인증을 다시 진행해 주세요.",
      );
      return;
    }
    setFindPwResetSubmitting(true);
    try {
      const body = buildPasswordResetBody(
        USER_SE_BY_TYPE[loginModalType],
        pw,
        {
          recoveryToken: findPwRecoveryToken,
          crtfcDn: findPwCrtfcDn,
          displayUserId: findPwUserId,
        },
      );
      const res = await AuthService.requestPasswordReset(body);
      const code = res?.resultCode != null ? String(res.resultCode) : "";
      if (code === "200") {
        setFindPwSuccessDialogOpen(true);
        setFindPwNewPw("");
        setFindPwNewPwConfirm("");
        setFindPwRecoveryToken(null);
        setFindPwCrtfcDn(null);
      } else {
        setFindPwResetError(
          res?.resultMessage?.trim() || "비밀번호 변경에 실패했습니다.",
        );
      }
    } catch (err) {
      setFindPwResetError(
        err instanceof ApiError
          ? err.message
          : "비밀번호 변경 중 오류가 발생했습니다.",
      );
    } finally {
      setFindPwResetSubmitting(false);
    }
  };

  const handleFindPwCertClick = useCallback(async () => {
    if (!loginModalType || findPwLoading) return;
    setFindPwError("");
    setFindPwMemberNotFound(false);
    setFindPwUserId(null);
    setFindPwRecoveryToken(null);
    setFindPwCrtfcDn(null);

    const w = window as Window & {
      __onGuardianCertSuccess?: (p: GuardianCertSuccessPayload) => void;
    };

    w.__onGuardianCertSuccess = async (payload: GuardianCertSuccessPayload) => {
      w.__onGuardianCertSuccess = undefined;
      const rt = payload.recoveryToken?.trim();
      const di = payload.di?.trim();
      if (!rt && !di) {
        setFindPwRecoveryToken(null);
        setFindPwCrtfcDn(null);
        setFindPwError(
          "본인인증은 완료되었으나 식별 정보를 받지 못했습니다. 다시 시도해 주세요.",
        );
        return;
      }
      setFindPwRecoveryToken(rt || null);
      setFindPwCrtfcDn(di || null);

      setFindPwLoading(true);
      try {
        const res = rt
          ? await AuthService.findUserIdByRecoveryToken({
              recoveryToken: rt,
            })
          : await AuthService.findUserIdByCrtfcDn({
              userSe: USER_SE_BY_TYPE[loginModalType],
              crtfcDnValue: di!,
            });
        const id =
          (res.userId && String(res.userId).trim()) ||
          (res.maskedUserId && String(res.maskedUserId).trim()) ||
          "";
        if (res.resultCode === "200" && id) {
          setFindPwMemberNotFound(false);
          setFindPwUserId(id);
        } else {
          setFindPwMemberNotFound(true);
          setFindPwError("");
          setFindPwRecoveryToken(null);
          setFindPwCrtfcDn(null);
        }
      } catch (err) {
        setFindPwMemberNotFound(false);
        setFindPwRecoveryToken(null);
        setFindPwCrtfcDn(null);
        if (err instanceof ApiError) {
          setFindPwError(err.message);
        } else {
          setFindPwError(
            err instanceof Error ? err.message : "요청 중 오류가 발생했습니다.",
          );
        }
      } finally {
        setFindPwLoading(false);
      }
    };

    const passPopup = openSirenPassBlankWindow();
    if (!passPopup || passPopup.closed) {
      setFindPwError(
        "팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.",
      );
      w.__onGuardianCertSuccess = undefined;
      return;
    }

    try {
      await fetchCertTokenForFindId(USER_SE_BY_TYPE[loginModalType]);
      const formElements = document.getElementsByName("reqCBAForm");
      const formElement = formElements[0] as HTMLFormElement | undefined;
      if (!formElement) {
        tryCloseSirenPassWindow(passPopup);
        setFindPwError("본인인증 폼을 준비하지 못했습니다.");
        w.__onGuardianCertSuccess = undefined;
        return;
      }
      await postSirenCreateTokenAndSubmit(
        formElement,
        addHiddenInput,
        TokenUtils.getToken(),
      );
    } catch (e) {
      tryCloseSirenPassWindow(passPopup);
      w.__onGuardianCertSuccess = undefined;
      setFindPwError(
        e instanceof Error ? e.message : "본인인증 요청에 실패했습니다.",
      );
    }
  }, [loginModalType, findPwLoading]);

  if (!isOpen || !loginModalType) return null;

  return (
    <div
      id="loginModal"
      className="modalOverlay loginModal"
      data-login-type={loginModalType}
      role="dialog"
      aria-labelledby="modalTitle"
      aria-modal="true"
      style={{ display: "flex" }}
    >
      <div className="modalContent">
        <button
          type="button"
          className="btnClose"
          aria-label="로그인 창 닫기"
          onClick={handleModalCloseClick}
        >
          <img src={`${IMG}/icon/ico_close_32.png`} alt="" />
        </button>
        <div className="modalHeader">
          <div className="logo">
            <img src={`${IMG}/logo.png`} alt="군산시 꿈이음센터" />
            <span className={badgeClassName(loginModalType)}>
              {BADGE_LABEL_BY_TYPE[loginModalType]}
            </span>
          </div>
          <h1 id="modalTitle" className="modalTitle">
            {panel === "findId"
              ? findIdPwResetOpen
                ? "비밀번호 재설정"
                : "아이디 찾기"
              : panel === "findPassword"
                ? findPwUserId
                  ? "비밀번호 재설정"
                  : "비밀번호 찾기"
                : "로그인"}
          </h1>
        </div>
        {panel === "login" ? (
          <>
            <form className="loginForm" onSubmit={handleSubmit}>
              {error && (
                <div className="loginFormError" role="alert">
                  {error}
                </div>
              )}
              <div className="inputGroup">
                <label htmlFor="userId">아이디</label>
                <input
                  type="text"
                  className="input"
                  id="userId"
                  name="id"
                  placeholder="아이디를 입력해주세요."
                  value={formData.id}
                  onChange={handleFormChange}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              <div className="inputGroup">
                <label htmlFor="userPw">비밀번호</label>
                <input
                  type="password"
                  className="input"
                  id="userPw"
                  name="password"
                  placeholder="비밀번호를 입력해주세요."
                  value={formData.password}
                  onChange={handleFormChange}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              <div className="formOptions">
                <label className="checkContainer">
                  <input
                    type="checkbox"
                    id="saveId"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleFormChange}
                    disabled={loading}
                  />
                  <span className="checkmark"></span>
                  아이디 저장
                </label>
              </div>
              <button
                type="submit"
                className="btnLogin mb-40"
                disabled={loading}
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
              <div className="formFooter">
                <a
                  href="#"
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setPanel("findId");
                    setFindIdError("");
                    setFindIdMemberNotFound(false);
                    setFindIdResult(null);
                    setFindIdPwResetOpen(false);
                    setFindIdNewPw("");
                    setFindIdNewPwConfirm("");
                    setFindIdPwResetError("");
                    setFindIdPwSuccessDialogOpen(false);
                    setError("");
                  }}
                >
                  아이디 찾기
                </a>
                <span className="divider" aria-hidden="true">
                  |
                </span>
                <a
                  href="#"
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setPanel("findPassword");
                    setFindPwError("");
                    setFindPwMemberNotFound(false);
                    setFindPwUserId(null);
                    setFindPwNewPw("");
                    setFindPwNewPwConfirm("");
                    setFindPwResetError("");
                    setFindPwSuccessDialogOpen(false);
                    setError("");
                  }}
                >
                  비밀번호 찾기
                </a>
                <span className="divider" aria-hidden="true">
                  |
                </span>
                <a href={`/userWeb/terms?type=${loginModalType}`}>
                  회원가입
                </a>
              </div>
            </form>
            <div className="snsLoginArea">
              <div className="snsDivider">
                <span>SNS 계정으로 로그인</span>
              </div>
              <div className="snsButtons">
                <a
                  href="#"
                  className="btnSns btnNaver"
                  role="button"
                  onClick={(e) => handleOAuthClick(e, "naver")}
                  aria-disabled={!!oauthLoading}
                >
                  <img src={`${IMG}/icon/ico_sns_naver.png`} alt="네이버" />{" "}
                  네이버 로그인
                </a>
                <a
                  href="#"
                  className="btnSns btnKakao"
                  role="button"
                  onClick={(e) => handleOAuthClick(e, "kakao")}
                  aria-disabled={!!oauthLoading}
                >
                  <img src={`${IMG}/icon/ico_sns_kakao.png`} alt="카카오" />{" "}
                  카카오톡 로그인
                </a>
              </div>
            </div>
          </>
        ) : panel === "findId" ? (
          <div className="loginForm">
            {findIdPwResetOpen && findIdResult ? (
              <>
                {findIdPwResetError && (
                  <div className="loginFormError" role="alert">
                    {findIdPwResetError}
                  </div>
                )}
                <div className="findIdResultBox" role="status">
                  <strong>{findIdResult}</strong> 계정의 새 비밀번호를 입력해
                  주세요.
                </div>
                <div className="inputGroup">
                  <label htmlFor="findIdNewPw">새 비밀번호</label>
                  <input
                    type="password"
                    className="input"
                    id="findIdNewPw"
                    name="findIdNewPw"
                    placeholder={`${MIN_NEW_PASSWORD_LENGTH}자 이상`}
                    value={findIdNewPw}
                    onChange={(e) => {
                      setFindIdNewPw(e.target.value);
                      setFindIdPwResetError("");
                    }}
                    disabled={findIdPwResetSubmitting}
                    autoComplete="new-password"
                  />
                </div>
                <div className="inputGroup">
                  <label htmlFor="findIdNewPwConfirm">새 비밀번호 확인</label>
                  <input
                    type="password"
                    className="input"
                    id="findIdNewPwConfirm"
                    name="findIdNewPwConfirm"
                    placeholder="새 비밀번호 확인"
                    value={findIdNewPwConfirm}
                    onChange={(e) => {
                      setFindIdNewPwConfirm(e.target.value);
                      setFindIdPwResetError("");
                    }}
                    disabled={findIdPwResetSubmitting}
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="button"
                  className="btnLogin mb-16"
                  disabled={findIdPwResetSubmitting}
                  onClick={() => void handleFindIdNewPasswordSubmit()}
                >
                  {findIdPwResetSubmitting ? "처리 중..." : "확인"}
                </button>
                <div className="formFooterBack">
                  <a
                    href="#"
                    role="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFindIdPwResetOpen(false);
                      setFindIdNewPw("");
                      setFindIdNewPwConfirm("");
                      setFindIdPwResetError("");
                    }}
                  >
                    이전
                  </a>
                </div>
              </>
            ) : findIdMemberNotFound ? (
              <>
                <div className="findIdResultBox" role="status">
                  일치하는 회원 정보가 없습니다.
                </div>
                <button
                  type="button"
                  className="btnLogin mb-40"
                  onClick={() => handleNoMemberConfirm()}
                >
                  확인
                </button>
              </>
            ) : (
              <>
                {findIdError && (
                  <div className="loginFormError" role="alert">
                    {findIdError}
                  </div>
                )}
                {findIdResult && (
                  <div className="findIdResultBox" role="status">
                    가입하신 아이디는 <strong>{findIdResult}</strong> 입니다.
                  </div>
                )}
                {findIdResult && (
                  <div className="findIdResultActions">
                    <button
                      type="button"
                      className="btnFindIdSecondary"
                      onClick={() => {
                        setFindIdPwResetOpen(true);
                        setFindIdPwResetError("");
                        setFindIdNewPw("");
                        setFindIdNewPwConfirm("");
                      }}
                    >
                      비밀번호
                    </button>
                    <button
                      type="button"
                      className="btnFindIdPrimary"
                      onClick={() => handleFindIdCloseToLogin()}
                    >
                      닫기
                    </button>
                  </div>
                )}
                {!findIdResult && (
                  <button
                    type="button"
                    className="btnLogin mb-40"
                    disabled={findIdLoading}
                    onClick={handleFindIdCertClick}
                  >
                    {findIdLoading ? "처리 중..." : "본인인증"}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="loginForm">
            {findPwUserId ? (
              <>
                {findPwResetError && (
                  <div className="loginFormError" role="alert">
                    {findPwResetError}
                  </div>
                )}
                <div className="findIdResultBox" role="status">
                  본인인증이 완료되었습니다.{" "}
                  <strong>{findPwUserId}</strong> 계정의 새 비밀번호를 입력해
                  주세요.
                </div>
                <div className="inputGroup">
                  <label htmlFor="findPwNewPw">새 비밀번호</label>
                  <input
                    type="password"
                    className="input"
                    id="findPwNewPw"
                    name="findPwNewPw"
                    placeholder={`${MIN_NEW_PASSWORD_LENGTH}자 이상`}
                    value={findPwNewPw}
                    onChange={(e) => {
                      setFindPwNewPw(e.target.value);
                      setFindPwResetError("");
                    }}
                    disabled={findPwResetSubmitting}
                    autoComplete="new-password"
                  />
                </div>
                <div className="inputGroup">
                  <label htmlFor="findPwNewPwConfirm">새 비밀번호 확인</label>
                  <input
                    type="password"
                    className="input"
                    id="findPwNewPwConfirm"
                    name="findPwNewPwConfirm"
                    placeholder="새 비밀번호 확인"
                    value={findPwNewPwConfirm}
                    onChange={(e) => {
                      setFindPwNewPwConfirm(e.target.value);
                      setFindPwResetError("");
                    }}
                    disabled={findPwResetSubmitting}
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="button"
                  className="btnLogin mb-16"
                  disabled={findPwResetSubmitting}
                  onClick={() => void handleFindPwNewPasswordSubmit()}
                >
                  {findPwResetSubmitting ? "처리 중..." : "확인"}
                </button>
                <div className="formFooterBack">
                  <a
                    href="#"
                    role="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFindPwUserId(null);
                      setFindPwNewPw("");
                      setFindPwNewPwConfirm("");
                      setFindPwResetError("");
                      setFindPwRecoveryToken(null);
                      setFindPwCrtfcDn(null);
                    }}
                  >
                    이전
                  </a>
                </div>
              </>
            ) : findPwMemberNotFound ? (
              <>
                <div className="findIdResultBox" role="status">
                  일치하는 회원 정보가 없습니다.
                </div>
                <button
                  type="button"
                  className="btnLogin mb-40"
                  onClick={() => handleNoMemberConfirm()}
                >
                  확인
                </button>
              </>
            ) : (
              <>
                {findPwError && (
                  <div className="loginFormError" role="alert">
                    {findPwError}
                  </div>
                )}
                <button
                  type="button"
                  className="btnLogin mb-40"
                  disabled={findPwLoading}
                  onClick={handleFindPwCertClick}
                >
                  {findPwLoading ? "처리 중..." : "본인인증"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {(findIdPwSuccessDialogOpen || findPwSuccessDialogOpen) && (
        <div className="loginModalPwConfirmOverlay" role="presentation">
          <div
            className="loginModalPwConfirmDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwChangeConfirmTitle"
          >
            <p id="pwChangeConfirmTitle" className="loginModalPwConfirmMessage">
              비밀번호가 변경되었습니다.
            </p>
            <button
              type="button"
              className="btnLogin"
              onClick={() => {
                if (findPwSuccessDialogOpen) {
                  handleConfirmAfterFindPwChange();
                } else {
                  handleConfirmAfterPwChange();
                }
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
