'use client';

import React from 'react';
import '@/shared/styles/admin/dialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'success' | 'primary';
  variant?: 'alert' | 'confirm' | 'success' | 'error';
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
  subMessage = '',
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  type = 'danger',
  variant,
  disabled = false,
  preferCheckHeader = false,
  useDeleteHeader = false,
  singleAction = true,
}) => {
  if (!isOpen) return null;
  const effectiveSingleAction = useDeleteHeader ? false : singleAction;

  const resolveVariant = (): 'alert' | 'confirm' | 'success' | 'error' => {
    if (variant) return variant;
    if (preferCheckHeader) return 'success';
    if (type === 'success') return 'success';
    if (type === 'primary') return 'alert';
    if (effectiveSingleAction && type === 'danger' && !useDeleteHeader) return 'error';
    return 'confirm';
  };

  const dialogVariant = resolveVariant();
  const hasMessage = message.trim().length > 0;
  const hasSubMessage = subMessage.trim().length > 0;
  const sharedHeaderImgClass = 'block h-10 w-10 max-w-none object-contain';

  const iconSrcByVariant: Record<
    'alert' | 'confirm' | 'success' | 'error',
    string
  > = {
    alert: '/images/adminWeb/icon/icon_point.png',
    confirm: '/images/adminWeb/icon/icon_que.png',
    success: '/images/adminWeb/icon/icon_check.png',
    error: '/images/adminWeb/icon/icon_del.png',
  };

  const getConfirmButtonClass = () => {
    return 'bg-primary hover:bg-blue-700 text-white border-primary';
  };

  const handleOverlayClick = (): void => {
    if (effectiveSingleAction) {
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
            <img
              src={iconSrcByVariant[dialogVariant]}
              alt=""
              width={40}
              height={40}
              className={sharedHeaderImgClass}
              aria-hidden
            />
          </div>
          <div className={`dialog-header ${hasMessage ? '' : 'dialog-header-no-message'}`}>
            <h5 className="dialog-title">{title}</h5>
          </div>
          {hasMessage ? (
            <div className="dialog-body">
              <p className="dialog-message">{message}</p>
              {hasSubMessage ? (
                <p className="dialog-message dialog-sub-message">{subMessage}</p>
              ) : null}
            </div>
          ) : null}
          <div className="dialog-footer">
            <button
              type="button"
              className={`dialog-confirm-button disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClass()}`}
              onClick={onConfirm}
              disabled={disabled}
            >
              {confirmText}
            </button>
            {!effectiveSingleAction ? (
              <button
                type="button"
                className="dialog-cancel-button"
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
