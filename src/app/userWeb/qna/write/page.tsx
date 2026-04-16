"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import QnaWriteSection from "@/widgets/userWeb/QnaWriteSection";

/**
 * 1:1 문의 글쓰기 — `qnaWrite2.html` / 커뮤니티 껍데기.
 */
export default function QnaWritePage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <QnaWriteSection />
      </Suspense>
    </LayoutWrapper>
  );
}
