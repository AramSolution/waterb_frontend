"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputPrSection from "@/widgets/userWeb/BizInputPrSection";
import { AuthService } from "@/entities/auth/api";

/**
 * 공공형 진로진학 컨설팅(03) 전용 신청 페이지.
 * bizInput / bizInputPr(지원사업 신청)과 분리된 전용 경로. proGb=03 고정.
 */
function BizInputCtPageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? undefined;
  const fromMypage = searchParams.get("from") === "mypage";
  const fromMentorWork = searchParams.get("from") === "mentorWork";
  const reqEsntlId = searchParams.get("reqEsntlId") ?? undefined;
  const reqId = searchParams.get("reqId") ?? undefined;

  // 로그인 상태 확인 (로그인한 사용자 타입이 우선)
  const userSe = AuthService.getUserSe();
  const isAuthenticated = AuthService.isAuthenticated();

  // URL의 reqGbPosition을 확인하여 배지 결정. 멘토일지 진입 시 멘토 배지/테마 우선
  const reqGbPosition = searchParams.get("reqGbPosition");
  const typeParam = searchParams.get("type");

  let badgeLabel: string | undefined;
  let themeOverride: "student" | "parent" | "mentor" | undefined;

  if (fromMentorWork) {
    // 멘토일지에서 진입 시 항상 멘토로 표시
    badgeLabel = "멘토";
    themeOverride = "mentor";
  } else if (isAuthenticated && userSe === "SNR") {
    badgeLabel = "학생";
    themeOverride = "student";
  } else if (isAuthenticated && userSe === "PNR") {
    badgeLabel = "학부모/일반";
    themeOverride = "parent";
  } else if (reqGbPosition === "1") {
    badgeLabel = "학생";
    themeOverride = "student";
  } else if (reqGbPosition === "2" || typeParam === "parent") {
    badgeLabel = "학부모/일반";
    themeOverride = "parent";
  } else {
    badgeLabel = undefined;
    themeOverride = undefined;
  }

  return (
    <LayoutWrapper
      headerType="main"
      mainClassName="bizBg"
      badgeLabel={badgeLabel}
      themeOverride={themeOverride}
    >
      <BizInputPrSection
        proId={proId}
        proGb="03"
        fromMypage={fromMypage}
        fromMentorWork={fromMentorWork}
        initialReqEsntlId={reqEsntlId}
        initialReqId={reqId}
      />
    </LayoutWrapper>
  );
}

export default function BizInputCtPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputCtPageContent />
    </Suspense>
  );
}
