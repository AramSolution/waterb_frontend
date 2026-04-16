'use client';

import React, { Suspense } from 'react';
import { LayoutWrapper } from '@/widgets/userWeb/layout';
import CommunityWriteSection from '@/widgets/userWeb/CommunityWriteSection';

/**
 * communityWrite.html → React
 * 원본: source/gunsan/communityWrite.html
 * 커뮤니티 문의하기 (로그인 없음, BBS_0000000000000005, NTCR_ID=USRCNFRM_99999999999)
 */
export default function CommunityWritePage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <CommunityWriteSection />
      </Suspense>
    </LayoutWrapper>
  );
}
