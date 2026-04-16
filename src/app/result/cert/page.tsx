"use client";

import { useState, useEffect, useCallback } from "react";
import { TokenUtils } from "@/shared/lib";
import { EDREAM_CERT_SIREN } from "@/shared/config/api";
import axios from "axios";

type Phase = "loading" | "success" | "error";

/** 백엔드 CertResultVO와 동일 필드 */
interface CertResultPayload {
  rspCd?: string;
  resMsg?: string;
  userName?: string;
  celNo?: string;
  birYMD?: string;
  gender?: string;
  di?: string;
  /** certFlow=accountRecovery 시 아이디 찾기·비밀번호 재설정용 */
  recoveryToken?: string;
}

/** 백엔드에서 DI 중복 등으로 거절한 경우(기술 오류 아님) */
function isAlreadyRegisteredMessage(text: string): boolean {
  return (
    text.includes("이미 가입된 계정") ||
    text.includes("이미 가입된 회원") ||
    text.includes("중복가입")
  );
}

function CertErrorBlock({ message }: { message: string }) {
  const duplicate = isAlreadyRegisteredMessage(message);
  const title = duplicate ? "가입 안내" : "본인인증 안내";
  const textColor = duplicate ? "#92400e" : "#991b1b";

  return (
    <>
      <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#111827" }}>
        {title}
      </p>
      <p style={{ margin: 0, color: textColor }} role="alert">
        {message}
      </p>
      {duplicate ? (
        <p
          style={{
            margin: "20px 0 0",
            fontSize: 14,
            color: "#6b7280",
          }}
        >
          동일한 본인인증 정보로 가입된 계정이 있습니다. 로그인 후 이용해 주시거나,
          다른 계정으로 회원가입을 진행해 주세요.
        </p>
      ) : (
        <p
          style={{
            margin: "20px 0 0",
            fontSize: 14,
            color: "#6b7280",
          }}
        >
          문제가 계속되면 본인인증을 처음부터 다시 진행해 주세요.
        </p>
      )}
    </>
  );
}

export default function CertificationPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState(
    "본인인증 결과를 확인하는 중입니다. 잠시만 기다려 주세요.",
  );

  const finishWithError = useCallback((msg: string) => {
    setMessage(msg);
    setPhase("error");
  }, []);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.toString()) {
        finishWithError(
          "인증 정보가 없습니다. 본인인증을 처음부터 다시 진행해 주세요.",
        );
        return;
      }

      const token = TokenUtils.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (token) {
        headers.Authorization = token;
      }

      try {
        const response = await axios.post<CertResultPayload>(
          EDREAM_CERT_SIREN.RESULT_DATA,
          params,
          {
            headers,
            timeout: 10000,
            withCredentials: true,
            validateStatus: () => true,
          },
        );

        const data = response.data ?? {};
        const httpOk = response.status >= 200 && response.status < 300;
        const bizOk = data.rspCd === "200";

        if (!httpOk || !bizOk) {
          const msg =
            data.resMsg?.trim() ||
            (data.rspCd
              ? `인증 처리에 실패했습니다. (${data.rspCd})`
              : `인증 처리에 실패했습니다. (HTTP ${response.status})`);
          finishWithError(msg);
          return;
        }

        const payload = {
          userName: data.userName ?? "",
          celNo: data.celNo ?? "",
          birYMD: data.birYMD ?? "",
          gender: data.gender ?? "",
          di: data.di ?? "",
          recoveryToken: data.recoveryToken ?? "",
        };

        const parent = typeof window !== "undefined" ? window.opener : null;
        const callback =
          parent &&
          (
            parent as Window & {
              __onGuardianCertSuccess?: (p: typeof payload) => void;
            }
          ).__onGuardianCertSuccess;
        if (typeof callback === "function") {
          callback(payload);
        }

        setPhase("success");
        setMessage("본인인증이 완료되었습니다.");
        try {
          window.close();
        } catch {
          /* ignore */
        }
        window.setTimeout(() => {
          setMessage(
            "본인인증이 완료되었습니다. 창이 닫히지 않으면 이 탭(창)을 직접 닫아 주세요.",
          );
        }, 600);
      } catch (e) {
        if (axios.isAxiosError(e)) {
          const data = e.response?.data as CertResultPayload | undefined;
          const msg =
            data?.resMsg?.trim() ||
            e.message ||
            "서버와 통신할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.";
          finishWithError(msg);
        } else {
          finishWithError("알 수 없는 오류가 발생했습니다.");
        }
      }
    };

    run();
  }, [finishWithError]);

  return (
    <div
      className="certResultWrap"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
        background: "#f9fafb",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 440,
          textAlign: "center",
          lineHeight: 1.65,
          color: "#111827",
        }}
      >
        {phase === "loading" && (
          <p style={{ margin: 0 }} aria-live="polite" aria-busy="true">
            {message}
          </p>
        )}
        {phase === "success" && (
          <p style={{ margin: 0 }} aria-live="polite">
            {message}
          </p>
        )}
        {phase === "error" && (
          <CertErrorBlock message={message} />
        )}
      </div>
    </div>
  );
}
