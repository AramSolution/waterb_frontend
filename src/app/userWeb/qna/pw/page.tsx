"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import QnaPwSection from "@/widgets/userWeb/QnaPwSection";

/**
 * 비밀글 비밀번호 — `qnaPw.html` 계열, NoticeCommunityChrome 껍데기.
 */
export default function QnaPwPage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <QnaPwSection />
      </Suspense>
    </LayoutWrapper>
  );
}
