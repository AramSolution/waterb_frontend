"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputGstudyMentorLighthouseSection from "@/widgets/userWeb/BizInputGstudyMentorLighthouseSection";

/**
 * 멘토 전용 — 공부의 명수 인생등대(proGb 09) 신청 (API 연동 전 UI)
 * bizInfo(멘토 메인)에서 신청하기 — ?proId=&proGb=09&reqGbPosition=4&type=mentor
 */
function BizInputGstudyMentorLighthousePageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? undefined;

  return (
    <LayoutWrapper headerType="main" mainClassName="bizBg">
      <BizInputGstudyMentorLighthouseSection proId={proId} />
    </LayoutWrapper>
  );
}

export default function BizInputGstudyMentorLighthousePage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputGstudyMentorLighthousePageContent />
    </Suspense>
  );
}
