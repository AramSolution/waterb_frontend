"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputRcSection from "@/widgets/userWeb/BizInputRcSection";
import { AuthService } from "@/entities/auth/api";

/**
 * 지역연계 진로체험 활동(05) 신청 입력 페이지
 * bizInfoRc에서 진입 시 ?proId= 지원사업코드 전달
 */
function BizInputRcPageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? undefined;
  const fromMypage = searchParams.get("from") === "mypage";
  const reqEsntlId = searchParams.get("reqEsntlId") ?? undefined;
  const reqId = searchParams.get("reqId") ?? undefined;

  const userSe = AuthService.getUserSe();
  const isAuthenticated = AuthService.isAuthenticated();
  const reqGbPosition = searchParams.get("reqGbPosition");
  const typeParam = searchParams.get("type");

  let badgeLabel: string | undefined;
  let themeOverride: "student" | "parent" | undefined;

  if (isAuthenticated && userSe === "SNR") {
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
      <BizInputRcSection
        proId={proId}
        fromMypage={fromMypage}
        initialReqEsntlId={reqEsntlId}
        initialReqId={reqId}
      />
    </LayoutWrapper>
  );
}

export default function BizInputRcPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputRcPageContent />
    </Suspense>
  );
}
