'use client';

import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';

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
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="중복 로그인 감지"
      message="이미 다른 곳에서 사용 중입니다. 기존 세션을 종료하고 로그인하시겠습니까?"
      confirmText="확인"
      cancelText="취소"
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant="confirm"
    />
  );
};
