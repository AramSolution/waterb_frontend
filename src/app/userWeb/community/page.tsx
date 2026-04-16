"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import CommunitySection from "@/widgets/userWeb/CommunitySection";

/**
 * 커뮤니티 목록 — source/gunsan/notice2.html 레이아웃(사이드바·검색·표).
 * ?tab=notice|project|eumArchive|inquiry|guide — 구 mainViewTabs 제거, NoticeCommunityChrome shell=community
 */
export default function CommunityPage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <CommunitySection />
      </Suspense>
    </LayoutWrapper>
  );
}
