import axios from "axios";
import { WATER_CERT_SIREN } from "@/shared/config/api";

const SIREN_POPUP_NAME = "PCCV3Window";
const SIREN_PCC_ACTION = "https://pcc.siren24.com/pcc_V3/jsp/pcc_V3_j10_v4.jsp";

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 700;

/**
 * 사이렌 PASS 팝업은 사용자 클릭 직후 동기적으로 열어야 브라우저 팝업 차단을 피할 수 있다.
 * createToken API await 이후에 window.open 하면 다른 PC/브라우저에서 창이 막히는 경우가 많다.
 */
export function openSirenPassBlankWindow(): Window | null {
  const left = Math.max(0, (window.screen.width - POPUP_WIDTH) / 2);
  const top = Math.max(0, (window.screen.height - POPUP_HEIGHT) / 2);
  return window.open(
    "about:blank",
    SIREN_POPUP_NAME,
    `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},scrollbars=yes,resizable=no`,
  );
}

export function tryCloseSirenPassWindow(win: Window | null): void {
  if (!win) return;
  try {
    if (!win.closed) win.close();
  } catch {
    // ignore
  }
}

/**
 * 지원사업 신청 화면(bizInput 등) PASS 본인인증용 retUrl.
 * `certFlow=apply` 로 백엔드 resultData에서 DI 중복가입 검사를 생략한다(회원가입/MYPAGE는 미사용).
 */
export function getSirenTokenAuthRetUrlForApply(): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://dev.uaram.co.kr";
  return `72${base}/result/cert?certFlow=apply`;
}

/** 로그인 모달 등: certFlow=accountRecovery + userSe(SNR/PNR/…) 시 본인인증 후 recoveryToken(JWT) 발급 */
export function getSirenTokenAuthRetUrlForAccountRecovery(
  userSe?: string,
): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://dev.uaram.co.kr";
  const se = (userSe ?? "").trim();
  const query = se
    ? `certFlow=accountRecovery&userSe=${encodeURIComponent(se)}`
    : "certFlow=accountRecovery";
  return `72${base}/result/cert?${query}`;
}

export type SirenCreateTokenResponse = {
  cryptoTokenId: string;
  integrityValue: string;
  reqInfo: string;
  verSion: string;
};

export function submitSirenPccForm(
  data: SirenCreateTokenResponse,
  addHiddenInput: (formId: string, name: string, value: string) => void,
): void {
  let oldForm = document.getElementById("reqPCCForm");
  if (oldForm) oldForm.remove();
  const newForm = document.createElement("form");
  newForm.id = "reqPCCForm";
  newForm.name = "reqPCCForm";
  newForm.method = "post";
  newForm.action = SIREN_PCC_ACTION;
  newForm.target = SIREN_POPUP_NAME;
  document.body.appendChild(newForm);
  addHiddenInput("reqPCCForm", "crypto_token_id", data.cryptoTokenId);
  addHiddenInput("reqPCCForm", "integrity_value", data.integrityValue);
  addHiddenInput("reqPCCForm", "reqInfo", data.reqInfo);
  addHiddenInput("reqPCCForm", "verSion", data.verSion);
  newForm.submit();
  document.body.removeChild(newForm);
}

export async function postSirenCreateTokenAndSubmit(
  formElement: HTMLFormElement,
  addHiddenInput: (formId: string, name: string, value: string) => void,
  authToken: string | null,
): Promise<void> {
  const formData = new FormData(formElement);
  const params = new URLSearchParams(
    Array.from(formData.entries()) as [string, string][],
  );
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (authToken) headers.Authorization = authToken;
  const response = await axios.post<SirenCreateTokenResponse>(
    WATER_CERT_SIREN.CREATE_TOKEN,
    params,
    {
      headers,
      timeout: 10000,
      withCredentials: true,
    },
  );
  submitSirenPccForm(response.data, addHiddenInput);
}
