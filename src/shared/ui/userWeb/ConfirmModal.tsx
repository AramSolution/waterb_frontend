"use client";

import React from "react";
import "@/styles/userWeb/confirmModal.css";

export type ConfirmModalVariant = "danger" | "primary";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** danger=삭제·경고(빨강), primary=일반 확인(파랑, AlertModal success와 동일 톤) */
  variant?: ConfirmModalVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 사용자웹 확인 모달 (취소/삭제 등 두 버튼) */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "확인",
  message,
  confirmText = "확인",
  cancelText = "닫기",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  /* 삭제 확인용 아이콘: AlertModal danger와 동일한 빨간 원 + X */
  const deleteIcon = (
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

  /* 일반 확인용: AlertModal success와 동일한 파란 원 + 체크 */
  const primaryIcon = (
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

  const containerClass =
    variant === "primary"
      ? "userWebConfirmModal-container userWebConfirmModal-container--primary"
      : "userWebConfirmModal-container";

  return (
    <div
      className="userWebConfirmModal-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className={containerClass}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="userWebConfirmModal-title"
        aria-describedby="userWebConfirmModal-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="userWebConfirmModal-iconWrap">
          {variant === "primary" ? primaryIcon : deleteIcon}
        </div>
        <h2
          id="userWebConfirmModal-title"
          className="userWebConfirmModal-title"
        >
          {title}
        </h2>
        <p
          id="userWebConfirmModal-message"
          className="userWebConfirmModal-message"
        >
          {message}
        </p>
        <div className="userWebConfirmModal-footer">
          <button
            type="button"
            className="userWebConfirmModal-btnCancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="userWebConfirmModal-btnConfirm"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
