'use client';

import React from 'react';

interface DuplicateLoginDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DuplicateLoginDialog: React.FC<DuplicateLoginDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel} />

      {/* 다이얼로그 */}
      <div className="relative bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-fade-in">
        {/* 아이콘 */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* 제목 */}
        <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
          중복 로그인 감지
        </h3>

        {/* 메시지 */}
        <p className="text-center text-gray-600 mb-6">
          이미 다른 곳에서 사용 중입니다.<br />
          기존 세션을 종료하고 로그인하시겠습니까?
        </p>

        {/* 버튼: 왼쪽 예(진행) · 오른쪽 아니요(취소) */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
          >
            예
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
          >
            아니요
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
