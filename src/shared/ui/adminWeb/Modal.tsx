"use client";

import React, { useEffect } from "react";
import "@/shared/styles/admin/dialog.css";

interface ModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
  size = "md",
  showCloseButton = true,
}) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <>
      <div className="dialog-overlay" onClick={onClose}></div>
      <div
        className={`modal-container ${sizeClasses[size]}`}
      >
        <div
          className="modal-content w-full"
          style={{ maxHeight: "90vh", overflow: "auto", textAlign: "left" }}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="dialog-header border-b border-gray-200 pb-3 mb-4 relative">
              <h5 className="dialog-title text-lg font-semibold">{title}</h5>
              {showCloseButton && (
                <button
                  type="button"
                  className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={onClose}
                  aria-label="닫기"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="dialog-body">{children}</div>
        </div>
      </div>
    </>
  );
};
