"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import CommunityViewSection from "@/widgets/userWeb/CommunityViewSection";

/**
 * 커뮤니티 상세 — source/gunsan/noticeView2.html 레이아웃
 * 라우트: /userWeb/community/[id]?bbsId=&page=
 */
export default function CommunityViewPage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <CommunityViewSection />
      </Suspense>
    </LayoutWrapper>
  );
}
