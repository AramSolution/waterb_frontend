"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputPrSection from "@/widgets/userWeb/BizInputPrSection";
import { AuthService } from "@/entities/auth/api";

/**
 * bizInput_pr.html → React 변환
 * 원본: source/gunsan/bizInput_pr.html
 * 공통: #skip, #main_content, MainHeader, Footer, main+biz_pr CSS
 * bizInfo에서 진입 시 ?proId= 지원사업코드 전달 (bizInput과 동일)
 */
function BizInputPrPageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? undefined;
  const proGb = searchParams.get("proGb") ?? "02";
  const fromMypage = searchParams.get("from") === "mypage";
  const reqEsntlId = searchParams.get("reqEsntlId") ?? undefined;
  const reqId = searchParams.get("reqId") ?? undefined;

  // 로그인 상태 확인 (로그인한 사용자 타입이 우선)
  const userSe = AuthService.getUserSe();
  const isAuthenticated = AuthService.isAuthenticated();

  // URL의 reqGbPosition을 확인하여 배지 결정
  // 로그인 상태가 있으면 로그인 사용자 타입 우선, 없으면 URL 파라미터로 결정
  const reqGbPosition = searchParams.get("reqGbPosition");
  const typeParam = searchParams.get("type");

  let badgeLabel: string | undefined;
  let themeOverride: "student" | "parent" | undefined;

  if (isAuthenticated && userSe === "SNR") {
    // 학생으로 로그인했으면 항상 학생으로 표시
    badgeLabel = "학생";
    themeOverride = "student";
  } else if (isAuthenticated && userSe === "PNR") {
    // 학부모(PNR) 로그인 시 항상 학부모/일반 배지
    badgeLabel = "학부모/일반";
    themeOverride = "parent";
  } else if (reqGbPosition === "1") {
    // 학생 페이지에서 온 경우
    badgeLabel = "학생";
    themeOverride = "student";
  } else if (reqGbPosition === "2" || typeParam === "parent") {
    // type=parent 등 학부모 진입에서 온 경우
    badgeLabel = "학부모/일반";
    themeOverride = "parent";
  } else {
    // undefined면 LayoutWrapper가 URL에서 자동 결정
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
        proGb={proGb}
        fromMypage={fromMypage}
        initialReqEsntlId={reqEsntlId}
        initialReqId={reqId}
      />
    </LayoutWrapper>
  );
}

export default function BizInputPrPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputPrPageContent />
    </Suspense>
  );
}
