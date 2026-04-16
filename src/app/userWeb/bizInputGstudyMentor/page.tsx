"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputGstudyMentorSection from "@/widgets/userWeb/BizInputGstudyMentorSection";

/**
 * 멘토 전용 — 공부의 명수 온라인 튜터링(proGb 08) 신청
 * bizInfo(멘토 메인)에서 신청하기로 진입 — ?proId=&proGb=08&reqGbPosition=4&type=mentor
 */
function BizInputGstudyMentorPageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? undefined;

  return (
    <LayoutWrapper headerType="main" mainClassName="bizBg">
      <BizInputGstudyMentorSection proId={proId} />
    </LayoutWrapper>
  );
}

export default function BizInputGstudyMentorPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputGstudyMentorPageContent />
    </Suspense>
  );
}
