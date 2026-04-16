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
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = '확인',
  message,
  confirmText = '확인',
  cancelText = '닫기',
  onConfirm,
  onCancel,
  type = 'danger',
  disabled = false,
}) => {
  if (!isOpen) return null;

  const getIconByType = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'primary':
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="2"
              y="2"
              width="44"
              height="44"
              fill="#0d6efd"
              stroke="#0d6efd"
              strokeWidth="2"
            />
            <path
              d="M14 24 L20 30 L34 16"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'success':
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="2"
              y="2"
              width="44"
              height="44"
              fill="#0d6efd"
              stroke="#000000"
              strokeWidth="2"
            />
            <path
              d="M14 24 L20 30 L34 16"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return '⚠️';
    }
  };

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

  return (
    <>
      <div className="dialog-overlay" onClick={onCancel}></div>
      <div className="dialog-container">
        <div className="dialog-content">
          <div className="dialog-icon">{getIconByType()}</div>
          <div className="dialog-header">
            <h5 className="dialog-title">{title}</h5>
          </div>
          <div className="dialog-body">
            <p className="dialog-message">{message}</p>
          </div>
          <div className="dialog-footer">
            <button
              type="button"
              className="px-6 py-2 text-sm border border-gray-400 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`px-6 py-2 text-sm border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClass()}`}
              onClick={onConfirm}
              disabled={disabled}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
