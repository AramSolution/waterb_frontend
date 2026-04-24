"use client";

import React from "react";

function formatCertDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** 관리자 회원 폼: 예·아니요 옆 GPKI 인증 버튼 (기존 마이페이지 컨트롤과 동일 동작) */
export function AdminYnCertButton(props: {
  pressed: boolean;
  certifiedAt: string | null;
  onClick: () => void;
  name: string;
  disabled?: boolean;
  /** true면 인증완료여도 버튼 유지 */
  alwaysShowButton?: boolean;
  /** true면 해당없음/인증완료 문구 숨김 */
  hideStatusText?: boolean;
}) {
  const {
    pressed,
    certifiedAt,
    onClick,
    name,
    disabled,
    alwaysShowButton,
    hideStatusText,
  } = props;
  const hasCertRecord = Boolean(certifiedAt);
  const certDateLabel = certifiedAt ? formatCertDateLabel(certifiedAt) : "";
  const isResultLocked =
    !alwaysShowButton && pressed && hasCertRecord;
  const ariaDate =
    pressed && certifiedAt
      ? `인증완료 ${formatCertDateLabel(certifiedAt)}`
      : !pressed && certifiedAt
        ? `해당없음 ${formatCertDateLabel(certifiedAt)}`
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
          disabled={disabled}
        >
          인증
        </button>
      ) : null}
      {!hideStatusText ? (
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
      ) : null}
    </div>
  );
}
