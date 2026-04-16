"use client";

import React from "react";

function formatMypageCertDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function MypageYnCertButton(props: {
  pressed: boolean;
  certifiedAt: string | null;
  onClick: () => void;
  name: string;
  disabled?: boolean;
  /** true면 인증완료여도 버튼 유지(관리자 회원 폼 등) */
  alwaysShowButton?: boolean;
  /** true면 해당없음/인증완료 문구 숨김(관리자: 예·아니요로만 표시) */
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
  const certDateLabel = certifiedAt ? formatMypageCertDateLabel(certifiedAt) : "";
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

export function MypageSnsLinkRow(props: {
  onConnectNaver: () => void | Promise<void>;
  onConnectKakao: () => void | Promise<void>;
}) {
  const { onConnectNaver, onConnectKakao } = props;

  return (
    <div className="formRow mypageSnsLinkRow">
      <span className="formLabel">간편로그인연결</span>
      <div className="formControl mypageSnsLinkControl">
        <div className="mypageSnsLinkItem">
          <span className="mypageSnsLinkBadge mypageBadgeNaver">
            <img src="/images/userWeb/icon/ico_sns_naver.png" alt="네이버" />
            네이버
          </span>
          <button
            type="button"
            className="btnSearch mypageSnsConnectBtn"
            onClick={onConnectNaver}
          >
            연결
          </button>
        </div>
        <div className="mypageSnsLinkItem">
          <span className="mypageSnsLinkBadge mypageBadgeKakao">
            <img src="/images/userWeb/icon/ico_sns_kakao.png" alt="카카오" />
            카카오
          </span>
          <button
            type="button"
            className="btnSearch mypageSnsConnectBtn"
            onClick={onConnectKakao}
          >
            연결
          </button>
        </div>
      </div>
    </div>
  );
}
