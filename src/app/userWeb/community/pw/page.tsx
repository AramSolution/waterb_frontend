'use client';

import React, { Suspense } from 'react';
import { LayoutWrapper } from '@/widgets/userWeb/layout';
import CommunityPwSection from '@/widgets/userWeb/CommunityPwSection';

/**
 * communityPw.html → React
 * 원본: source/gunsan/communityPw.html
 * 커뮤니티 비밀글 비밀번호 입력. 확인 성공 시 상세로 이동
 */
export default function CommunityPwPage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <CommunityPwSection />
      </Suspense>
    </LayoutWrapper>
  );
}
