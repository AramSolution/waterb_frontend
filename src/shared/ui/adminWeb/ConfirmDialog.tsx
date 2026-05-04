'use client';

import React from 'react';
import '@/shared/styles/admin/dialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'success' | 'primary';
  disabled?: boolean;
  /**
   * 결과 알림 등에서 `type="danger"`(오류)여도 상단을 check.png로 통일할 때 사용.
   * `preferCheckHeader`가 우선합니다.
   */
  preferCheckHeader?: boolean;
  /**
   * 삭제 확인 모달: 상단을 delete.png로 표시(check.png와 동일 크기). `type="danger"`일 때만 적용.
   */
  useDeleteHeader?: boolean;
  /**
   * true면 확인 버튼만 표시(알림 전용). 오버레이 클릭 시 `onConfirm`과 동일하게 닫힘.
   */
  singleAction?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = '확인',
  message,
  confirmText = '예',
  cancelText = '아니요',
  onConfirm,
  onCancel,
  type = 'danger',
  disabled = false,
  preferCheckHeader = false,
  useDeleteHeader = false,
  singleAction = false,
}) => {
  if (!isOpen) return null;

  const useCheckImage =
    type === 'primary' ||
    type === 'success' ||
    preferCheckHeader === true;

  const useDeleteImage =
    type === 'danger' && useDeleteHeader === true && preferCheckHeader !== true;

  const sharedHeaderImgClass =
    'block h-10 w-10 max-w-none object-contain';

  const checkIcon = (
    <img
      src="/images/adminWeb/check.png"
      alt=""
      width={48}
      height={48}
      className={sharedHeaderImgClass}
      aria-hidden
    />
  );

  const deleteIcon = (
    <img
      src="/images/adminWeb/delete.png"
      alt=""
      width={48}
      height={48}
      className={sharedHeaderImgClass}
      aria-hidden
    />
  );

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-danger hover:bg-red-700 text-white border-danger';
      case 'primary':
      case 'success':
        return 'bg-primary hover:bg-blue-700 text-white border-primary';
      default:
        return 'bg-danger hover:bg-red-700 text-white border-danger';
    }
  };

  const handleOverlayClick = (): void => {
    if (singleAction) {
      onConfirm();
    } else {
      onCancel();
    }
  };

  return (
    <>
      <div className="dialog-overlay" onClick={handleOverlayClick}></div>
      <div className="dialog-container">
        <div className="dialog-content">
          <div className="dialog-icon">
            {useCheckImage
              ? checkIcon
              : useDeleteImage
                ? deleteIcon
                : '⚠️'}
          </div>
          <div className="dialog-header">
            <h5 className="dialog-title">{title}</h5>
          </div>
          <div className="dialog-body">
            <p className="dialog-message">{message}</p>
          </div>
          <div className="dialog-footer">
            <button
              type="button"
              className={`px-6 py-2 text-sm border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClass()}`}
              onClick={onConfirm}
              disabled={disabled}
            >
              {confirmText}
            </button>
            {!singleAction ? (
              <button
                type="button"
                className="px-6 py-2 text-sm border border-gray-400 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                onClick={onCancel}
              >
                {cancelText}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
