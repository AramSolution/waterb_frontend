'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutWrapper } from '@/widgets/userWeb/layout';
import BizInputSection from '@/widgets/userWeb/BizInputSection';

/**
 * bizInput.html → React 변환
 * 원본: source/gunsan/bizInput.html
 * 공통: #skip, #main_content, MainHeader, Footer, default+main+biz CSS
 * bizInfo에서 진입 시 ?proId= 지원사업코드 전달
 */
function BizInputPageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get('proId') ?? undefined;
  const fromMypage = searchParams.get('from') === 'mypage';
  const reqEsntlId = searchParams.get('reqEsntlId') ?? undefined;

  return (
    <LayoutWrapper headerType="main" mainClassName="bizBg">
      <BizInputSection
        proId={proId}
        proGb="01"
        fromMypage={fromMypage}
        reqEsntlId={reqEsntlId}
      />
    </LayoutWrapper>
  );
}

export default function BizInputPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputPageContent />
    </Suspense>
  );
}
