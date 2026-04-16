"use client";

import React from "react";
import "@/styles/userWeb/alertModal.css";

export type AlertModalType = "success" | "danger";

export interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: AlertModalType;
  confirmText?: string;
  onConfirm: () => void;
}

/** 사용자웹 알림 모달 (저장 완료, 삭제 완료, 오류 등) - 확인 버튼만 있음. success=파란색, danger=빨간색 (관리자페이지와 동일) */
export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  type = "success",
  confirmText = "확인",
  onConfirm,
}) => {
  if (!isOpen) return null;

  const iconByType = () => {
    switch (type) {
      case "success":
        return (
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle cx="24" cy="24" r="22" fill="#0d6efd" />
            <path
              d="M14 24 L20 30 L34 16"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "danger":
        return (
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle cx="24" cy="24" r="22" fill="#d63a3a" />
            <path
              d="M16 16 L32 32 M32 16 L16 32"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="userWebAlertModal-overlay"
      onClick={onConfirm}
      role="presentation"
    >
      <div
        className={`userWebAlertModal-container userWebAlertModal-${type}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="userWebAlertModal-title"
        aria-describedby="userWebAlertModal-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="userWebAlertModal-iconWrap">{iconByType()}</div>
        <h2 id="userWebAlertModal-title" className="userWebAlertModal-title">
          {title}
        </h2>
        <p
          id="userWebAlertModal-message"
          className="userWebAlertModal-message"
          style={{ whiteSpace: "pre-line" }}
        >
          {message}
        </p>
        <div className="userWebAlertModal-footer">
          <button
            type="button"
            className="userWebAlertModal-btnConfirm"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
