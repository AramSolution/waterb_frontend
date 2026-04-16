"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputDmSection from "@/widgets/userWeb/BizInputDmSection";
import { AuthService } from "@/entities/auth/api";

/**
 * 꿈틀꿈틀 우리아이 꿈탐험(06) 전용 신청 페이지.
 */
function BizInputDmPageContent() {
  const searchParams = useSearchParams();
  const reqGbPosition = searchParams.get("reqGbPosition");
  const typeParam = searchParams.get("type");
  const userSe = AuthService.getUserSe();
  const isAuthenticated = AuthService.isAuthenticated();

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

  const proId = searchParams.get("proId") ?? "";
  const fromMypage = searchParams.get("from") === "mypage";
  const reqEsntlId = searchParams.get("reqEsntlId") ?? "";

  return (
    <LayoutWrapper
      headerType="main"
      mainClassName="bizBg"
      badgeLabel={badgeLabel}
      themeOverride={themeOverride}
    >
      <BizInputDmSection
        proId={proId || undefined}
        fromMypage={fromMypage}
        initialReqEsntlId={reqEsntlId || undefined}
      />
    </LayoutWrapper>
  );
}

export default function BizInputDmPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <BizInputDmPageContent />
    </Suspense>
  );
}
