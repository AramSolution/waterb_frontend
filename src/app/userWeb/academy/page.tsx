"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import AcademySection from "@/widgets/userWeb/AcademySection";

/**
 * 학원조회 — source/gunsan/academy2.html 레이아웃(커뮤니티 비주얼·사이드바·표).
 * 헤더는 포털(PortalHeader). ?type= / ?reqGbPosition= 은 사이드·커뮤니티 링크 쿼리 유지용.
 */
export default function AcademyPage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <AcademySection />
      </Suspense>
    </LayoutWrapper>
  );
}
