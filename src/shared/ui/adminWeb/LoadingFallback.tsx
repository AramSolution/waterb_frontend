'use client';

import React from 'react';

/**
 * Suspense fallback용 로딩 컴포넌트
 * app 레이어에서 UI 마크업을 제거하기 위해 사용
 */
export const LoadingFallback: React.FC = () => {
  return (
    <div className="p-6 text-center">로딩 중...</div>
  );
};
