'use client';

import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface ForceLogoutDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const ForceLogoutDialog: React.FC<ForceLogoutDialogProps> = ({
  isOpen,
  onConfirm,
}) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="다른 곳에서 로그인됨"
      message="다른 위치에서 로그인하여 현재 세션이 종료되었습니다."
      confirmText="확인"
      onConfirm={onConfirm}
      onCancel={onConfirm}
      variant="error"
      singleAction
    />
  );
};
