"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputGstudySection from "@/widgets/userWeb/BizInputGstudySection";

/**
 * 공부의 명수(proGb 08 온라인튜터링 · 09 인생등대) 신청 입력 — bizInput.html 폼 클래스·구조 준용
 * bizInfo에서 ?proId= 로 진입. MY PAGE에서는 ?from=mypage&reqId= 로 신청 내역(by-req-id) 조회.
 */
function BizInputGstudyPageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? undefined;
  const fromMypage = searchParams.get("from") === "mypage";
  const reqEsntlId = searchParams.get("reqEsntlId") ?? undefined;
  const reqId = searchParams.get("reqId")?.trim() || undefined;

  return (
    <LayoutWrapper headerType="main" mainClassName="bizBg">
      <BizInputGstudySection
        proId={proId}
        fromMypage={fromMypage}
        reqEsntlId={reqEsntlId}
        reqId={reqId}
      />
    </LayoutWrapper>
  );
}

export default function BizInputGstudyPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputGstudyPageContent />
    </Suspense>
  );
}
