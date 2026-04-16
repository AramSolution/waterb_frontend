"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import NoticeSection from "@/widgets/userWeb/NoticeSection";

/**
 * 공지사항 목록 — notice2.html 레이아웃(비주얼·사이드바·표). 헤더는 포털(PortalHeader).
 * ?reqGbPosition=1~5 또는 ?type=parent|school → BBS_ID
 */
function NoticePageContent() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <NoticeSection />
      </Suspense>
    </LayoutWrapper>
  );
}

export default function NoticePage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <NoticePageContent />
    </Suspense>
  );
}
