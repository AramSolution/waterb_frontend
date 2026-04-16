"use client";

import React, { Suspense } from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import NoticePwSection from "@/widgets/userWeb/NoticePwSection";

/**
 * 공지 비밀글 비밀번호 — ?nttId=&bbsId=&type= 또는 &reqGbPosition=
 */
function NoticePwPageContent() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <NoticePwSection />
      </Suspense>
    </LayoutWrapper>
  );
}

export default function NoticePwPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <NoticePwPageContent />
    </Suspense>
  );
}
