"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import QnaSection from "@/widgets/userWeb/QnaSection";

/**
 * 1:1 문의·자료실 목록 — `qna2.html` / 커뮤니티 `mainViewTable` 껍데기.
 * 테마는 NoticeCommunityChrome `themeQuery`(?type= / ?reqGbPosition=)로 유지.
 */
export default function QnaPage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <QnaSection />
      </Suspense>
    </LayoutWrapper>
  );
}
