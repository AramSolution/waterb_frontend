"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ConfirmModal } from "@/shared/ui/userWeb";
import { AuthService } from "@/entities/auth/api";

const STATE_TO_REDIRECT: Record<
  string,
  { path: string; reqGbPosition: number; typeParent?: boolean }
> = {
  student: { path: "/userWeb/main", reqGbPosition: 1 },
  parent: { path: "/userWeb/main", reqGbPosition: 2, typeParent: true },
  academy: { path: "/userWeb/main", reqGbPosition: 3 },
  mentor: { path: "/userWeb/main", reqGbPosition: 4 },
};

export const OAuthLinkSection: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<"ready" | "error" | "cancelled">(
    "ready",
  );
  const [message, setMessage] = useState<string>("");
  const done = useRef(false);
  const linkTokenRef = useRef<string>("");
  const stateRef = useRef<string>("student");

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const linkToken = searchParams.get("link_token") || "";
    const state = searchParams.get("state") ?? "student";
    linkTokenRef.current = linkToken;
    stateRef.current = state;

    if (!linkToken) {
      setStatus("error");
      setMessage("연동 토큰이 없습니다. 다시 시도해 주세요.");
      return;
    }

    // bsroll처럼 "연동하시겠습니까?"를 모달로 먼저 확인 후 처리
    setShowConfirmModal(true);
  }, [searchParams, router]);

  const handleConfirm = () => {
    const linkToken = linkTokenRef.current;
    if (!linkToken) {
      setStatus("error");
      setMessage("연동 토큰이 없습니다. 다시 시도해 주세요.");
      return;
    }

    setShowConfirmModal(false);
    setProcessing(true);
    setStatus("ready");

    AuthService.confirmOAuthLink(linkToken)
      .then((res) => {
        if (res?.accessToken) {
          // 토큰 기반 세션(userSe/uniqId) 동기화
          AuthService.applyAccessToken(res.accessToken);

          const state = stateRef.current;
          const target = STATE_TO_REDIRECT[state] ?? STATE_TO_REDIRECT.student;
          const url =
            target.path +
            "?reqGbPosition=" +
            target.reqGbPosition +
            (target.typeParent ? "&type=parent" : "");
          router.replace(url);
          return;
        }
        setStatus("error");
        setMessage("연동은 완료되었지만 토큰을 받지 못했습니다.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "연동 처리 중 오류가 발생했습니다.",
        );
      })
      .finally(() => setProcessing(false));
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setStatus("cancelled");
    setMessage("연동이 취소되었습니다.");
  };

  return (
    <div className="inner px-4 py-8 text-center">
      {status === "error" ? (
        <>
          <p>연동 처리에 실패했습니다.</p>
          <p className="mt-2 text-danger">{message}</p>
          <button
            type="button"
            onClick={() => router.replace("/userWeb")}
            className="mt-5 rounded bg-primary px-4 py-3 text-white"
          >
            돌아가기
          </button>
        </>
      ) : status === "cancelled" ? (
        <>
          <p>{message}</p>
          <button
            type="button"
            onClick={() => router.replace("/userWeb")}
            className="mt-5 rounded bg-primary px-4 py-3 text-white"
          >
            로그인 화면으로
          </button>
        </>
      ) : processing ? (
        <p>연동 처리 중...</p>
      ) : null}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="확인"
        message="연동하시겠습니까?"
        variant="primary"
        cancelText="닫기"
        confirmText="연동"
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default OAuthLinkSection;
